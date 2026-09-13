/**
 * Plays the driver side of a VTC ride purely through the real HTTP API —
 * never the Flutter driver app. Every call here is exactly what
 * VtcDriverService (adigo_mobile) sends, so the backend's real business
 * logic (status transitions, ownership checks, socket broadcasts) runs
 * completely unchanged; only the "app" issuing the calls is this script
 * instead of a slow/flaky emulator. Built live 2026-09-13 so the whole
 * customer-side flow (offer -> accept -> live map -> arrived -> started ->
 * completed) can be tested from a single physical phone.
 *
 * Fully autonomous, no stdin interaction needed (this runs headless as a
 * background task, with no reliable way to type commands into it once
 * started) — every phase transition below fires on its own timer instead
 * of waiting for a manual "arrived"/"start"/"done":
 *
 *   idle --(offer appears)--> auto-accept
 *     --(drives to pickup over --leg-seconds)--> auto "arrived"
 *     --(--board-seconds pause, simulating boarding)--> auto "started"
 *     --(drives to destination over --leg-seconds)--> auto "completed"
 *     --> back to idle, polling for the next offer.
 *
 * Usage:
 *   npx ts-node scripts/simulate_driver.ts [--email <email>] [--password <pw>] [--leg-seconds <n>] [--board-seconds <n>]
 *
 * Defaults to the existing test driver (chauffeur.test@test.adigo.local).
 */

const BASE_URL = process.env.SIMULATE_DRIVER_BASE_URL || 'http://localhost:3800/v1/api';

function argVal(args: string[], name: string): string | undefined {
    const idx = args.indexOf(`--${name}`);
    return idx >= 0 ? args[idx + 1] : undefined;
}

async function api(path: string, opts: { method?: string; token?: string; body?: unknown } = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: opts.method ?? 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
        },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const json: any = await res.json().catch(() => null);
    if (!res.ok) {
        throw new Error(`${opts.method ?? 'GET'} ${path} -> ${res.status}: ${JSON.stringify(json)}`);
    }
    return json;
}

type LatLon = { lat: number; lon: number };

/**
 * Real driving route via OSRM's public demo server — same call
 * route_service.dart makes for the polyline drawn on both the driver's and
 * the customer's map. Fetched once per leg so this script's simulated
 * position actually traces the road instead of cutting a straight line
 * through blocks/buildings while the app draws a road-following route next
 * to it — flagged live 2026-09-13: "le chauffeur ne se déplace pas sur la
 * route". Falls back to a straight 2-point line if OSRM is unreachable,
 * same fallback behavior as the Flutter side.
 */
async function fetchRoute(origin: LatLon, destination: LatLon): Promise<LatLon[]> {
    try {
        const res = await fetch(
            `https://router.project-osrm.org/route/v1/driving/` +
                `${origin.lon},${origin.lat};${destination.lon},${destination.lat}` +
                `?overview=full&geometries=geojson`
        );
        const json: any = await res.json();
        const coords = json?.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined;
        if (!coords || coords.length === 0) return [origin, destination];
        return coords.map(([lon, lat]) => ({ lat, lon }));
    } catch {
        return [origin, destination];
    }
}

function haversineMeters(a: LatLon, b: LatLon): number {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const s =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Arc-length-parameterized point at fraction `t` (0..1) along a polyline —
 * walks the cumulative segment distances rather than just indexing into the
 * points array, so movement speed stays roughly uniform regardless of how
 * unevenly OSRM spaced the route's own points. */
function pointAlongRoute(route: LatLon[], t: number): LatLon {
    if (route.length === 1) return route[0];
    const clamped = Math.max(0, Math.min(1, t));
    const segmentLengths: number[] = [];
    let total = 0;
    for (let i = 0; i < route.length - 1; i++) {
        const d = haversineMeters(route[i], route[i + 1]);
        segmentLengths.push(d);
        total += d;
    }
    if (total === 0) return route[route.length - 1];
    let target = clamped * total;
    for (let i = 0; i < segmentLengths.length; i++) {
        if (target <= segmentLengths[i]) {
            const segT = segmentLengths[i] === 0 ? 0 : target / segmentLengths[i];
            return {
                lat: route[i].lat + (route[i + 1].lat - route[i].lat) * segT,
                lon: route[i].lon + (route[i + 1].lon - route[i].lon) * segT,
            };
        }
        target -= segmentLengths[i];
    }
    return route[route.length - 1];
}

type Phase = 'idle' | 'to_pickup' | 'boarding' | 'to_destination';

async function main() {
    const args = process.argv.slice(2);
    const email = argVal(args, 'email') || 'chauffeur.test@test.adigo.local';
    const password = argVal(args, 'password') || 'Test1234!';
    const legDurationMs = Number(argVal(args, 'leg-seconds') || 45) * 1000;
    const boardDurationMs = Number(argVal(args, 'board-seconds') || 8) * 1000;

    console.log(`🔐 Login as ${email}...`);
    const loginRes = await api('/customers/login', {
        method: 'POST',
        body: { email_or_phone: email, password },
    });
    const token: string | undefined = loginRes?.body?.token;
    if (!token) throw new Error('Login failed: ' + JSON.stringify(loginRes));
    console.log('✅ Logged in.');

    const profileRes = await api('/vtc/drivers/me', { token });
    const driver = profileRes.data;
    console.log(
        `🚗 Driver #${driver.id} — ${driver.vehicle_brand ?? ''} ${driver.vehicle_model ?? ''} ${driver.license_plate ?? ''}`.trim()
    );

    let lat = Number(driver.current_latitude ?? 3.8480);
    let lon = Number(driver.current_longitude ?? 11.5021);

    console.log('🟢 Going online...');
    await api('/vtc/drivers/me/status', { method: 'PUT', token, body: { status: 'online' } });
    await api('/vtc/drivers/me/location', { method: 'PUT', token, body: { latitude: lat, longitude: lon } });

    let phase: Phase = 'idle';
    let currentRide: any = null;
    let legRoute: LatLon[] = [{ lat, lon }];
    let legStartedAt = Date.now();
    let phaseChangedAt = Date.now();

    async function beginLeg(toLat: number, toLon: number) {
        const origin = { lat, lon };
        const destination = { lat: toLat, lon: toLon };
        legStartedAt = Date.now();
        // Fetched async — a tracking tick firing before this resolves just
        // keeps using the previous leg's route for a moment, never crashes.
        legRoute = await fetchRoute(origin, destination);
    }

    async function setStatus(status: string) {
        const res = await api(`/vtc/rides/${currentRide.id}/status`, { method: 'PUT', token, body: { status } });
        currentRide = res.data;
    }

    console.log(`⏳ En attente d'une offre de course... (trajet = ${legDurationMs / 1000}s, embarquement = ${boardDurationMs / 1000}s)`);

    // Poll for a new offer while idle, and auto-accept it — same
    // idle+online polling VtcDriverViewModel._tick does every 8s.
    setInterval(async () => {
        if (currentRide) return;
        try {
            const res = await api('/vtc/rides/driver/current', { token });
            const ride = res.data;
            if (!ride) return;
            if (ride.status === 'offered') {
                console.log(`\n📨 Offre reçue pour la course #${ride.id} — acceptation automatique...`);
                const accepted = await api(`/vtc/rides/${ride.id}/respond`, {
                    method: 'PUT',
                    token,
                    body: { accept: true },
                });
                currentRide = accepted.data;
                phase = 'to_pickup';
                const pickupLat = Number(currentRide.pickup_latitude);
                const pickupLon = Number(currentRide.pickup_longitude);
                await beginLeg(pickupLat, pickupLon);
                console.log(`✅ Acceptée. En route vers le point de départ (${pickupLat}, ${pickupLon}).\n`);
            } else {
                // A ride already accepted/arrived/started from a previous run of
                // this script (or the real app) — pick up where it left off.
                currentRide = ride;
                if (ride.status === 'accepted') {
                    phase = 'to_pickup';
                    await beginLeg(Number(ride.pickup_latitude), Number(ride.pickup_longitude));
                } else if (ride.status === 'arrived') {
                    phase = 'boarding';
                    phaseChangedAt = Date.now();
                } else if (ride.status === 'started') {
                    phase = 'to_destination';
                    await beginLeg(Number(ride.dropoff_latitude), Number(ride.dropoff_longitude));
                }
                console.log(`\n↩️  Reprise de la course #${ride.id} déjà active (statut: ${ride.status}).\n`);
            }
        } catch (e: any) {
            console.error('poll error:', e.message);
        }
    }, 3000);

    // Drives the current leg along the real fetched route (arc-length
    // interpolation — see pointAlongRoute) and fires the next automatic
    // phase transition once it completes.
    setInterval(async () => {
        if (!currentRide) return;
        try {
            if (phase === 'to_pickup' || phase === 'to_destination') {
                const t = Math.min(1, (Date.now() - legStartedAt) / legDurationMs);
                const point = pointAlongRoute(legRoute, t);
                lat = point.lat;
                lon = point.lon;
                await api(`/vtc/rides/${currentRide.id}/tracking`, {
                    method: 'POST',
                    token,
                    body: { latitude: lat, longitude: lon },
                });
                console.log(`📡 [${phase}] ${lat.toFixed(6)}, ${lon.toFixed(6)} (${(t * 100).toFixed(0)}%)`);

                if (t >= 1) {
                    if (phase === 'to_pickup') {
                        await setStatus('arrived');
                        phase = 'boarding';
                        phaseChangedAt = Date.now();
                        console.log('📍 Arrivé au point de départ — embarquement du client...');
                    } else {
                        await setStatus('completed');
                        console.log(`🏁 Course #${currentRide.id} terminée.\n`);
                        currentRide = null;
                        phase = 'idle';
                    }
                }
            } else if (phase === 'boarding') {
                if (Date.now() - phaseChangedAt >= boardDurationMs) {
                    await setStatus('started');
                    phase = 'to_destination';
                    await beginLeg(Number(currentRide.dropoff_latitude), Number(currentRide.dropoff_longitude));
                    console.log('🚦 Course démarrée — direction la destination.');
                }
            }
        } catch (e: any) {
            console.error('drive error:', e.message);
        }
    }, 4000);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
