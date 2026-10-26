import {
    commissionFor,
    eventClosesAt,
    eventEnd,
    hasEnded,
    isScanWindowOpen,
    parseZonedDate,
    phoneCandidates,
    retainedAmount,
    ticketCommission,
} from '../../src/ticketing/utils/ticketing-rules';

const H = 3600 * 1000;

describe('ticketing-rules — montants', () => {
    it('un billet payé conserve son prix, un billet impayé ne rapporte rien', () => {
        expect(retainedAmount({ payment_status: 'paid', total_price: 10000, refunded_amount: null })).toBe(10000);
        expect(retainedAmount({ payment_status: 'pending', total_price: 10000, refunded_amount: null })).toBe(0);
        expect(retainedAmount({ payment_status: 'failed', total_price: 10000, refunded_amount: null })).toBe(0);
    });

    it('un remboursement partiel laisse la différence, un remboursement total ne laisse rien', () => {
        expect(retainedAmount({ payment_status: 'refunded', total_price: 30000, refunded_amount: 20000 })).toBe(10000);
        expect(retainedAmount({ payment_status: 'refunded', total_price: 30000, refunded_amount: 30000 })).toBe(0);
        // Ancien remboursement sans montant enregistré : considéré total.
        expect(retainedAmount({ payment_status: 'refunded', total_price: 30000, refunded_amount: null })).toBe(0);
    });

    it('commission arrondie au franc', () => {
        expect(commissionFor(10000, 12.5)).toBe(1250);
        expect(commissionFor(999, 10)).toBe(100);
    });

    it('la commission figée à la vente prime sur le taux actuel', () => {
        const paid = { payment_status: 'paid', total_price: 10000, refunded_amount: null, commission_rate: '12.5', commission_amount: 1250 };
        expect(ticketCommission(paid, 20)).toBe(1250);
    });

    it('billet vendu avant la commission : taux actuel de l\'organisateur', () => {
        const legacy = { payment_status: 'paid', total_price: 10000, refunded_amount: null, commission_rate: null, commission_amount: null };
        expect(ticketCommission(legacy, 10)).toBe(1000);
    });

    it('remboursement partiel : commission recalculée sur la part conservée, au taux figé', () => {
        const partial = { payment_status: 'refunded', total_price: 30000, refunded_amount: 20000, commission_rate: '12.5', commission_amount: 3750 };
        expect(ticketCommission(partial, 50)).toBe(1250);
    });
});

describe('ticketing-rules — dates', () => {
    const start = new Date('2026-11-02T19:00:00Z');

    it('sans date de fin, un événement dure 12 h', () => {
        expect(eventEnd({ event_date: start }).toISOString()).toBe('2026-11-03T07:00:00.000Z');
        expect(eventEnd({ event_date: start, event_end_date: new Date('2026-11-02T23:00:00Z') }).toISOString()).toBe('2026-11-02T23:00:00.000Z');
    });

    it('le scan ouvre 12 h avant et ferme 6 h après la fin', () => {
        const e = { event_date: start, event_end_date: new Date(start.getTime() + 4 * H) };
        expect(isScanWindowOpen(e, new Date(start.getTime() - 13 * H))).toBe(false);
        expect(isScanWindowOpen(e, new Date(start.getTime() - 11 * H))).toBe(true);
        expect(isScanWindowOpen(e, new Date(start.getTime() + 9 * H))).toBe(true);
        expect(isScanWindowOpen(e, new Date(start.getTime() + 11 * H))).toBe(false);
        expect(eventClosesAt(e).getTime()).toBe(start.getTime() + 10 * H);
    });

    it('hasEnded suit la fin de l\'événement', () => {
        expect(hasEnded({ event_date: start }, new Date(start.getTime() + 11 * H))).toBe(false);
        expect(hasEnded({ event_date: start }, new Date(start.getTime() + 13 * H))).toBe(true);
    });

    it('une date sans fuseau est refusée', () => {
        expect(parseZonedDate('2026-12-01T10:00:00')).toBe('invalid');
        expect(parseZonedDate('2026-12-01T10:00:00.000Z')).toEqual(new Date('2026-12-01T10:00:00.000Z'));
        expect(parseZonedDate('2026-12-01T10:00:00+01:00')).toEqual(new Date('2026-12-01T09:00:00.000Z'));
        expect(parseZonedDate(null)).toBeNull();
        expect(parseZonedDate('')).toBeNull();
    });
});

describe('ticketing-rules — téléphones', () => {
    it('retrouve un numéro camerounais quelle que soit sa forme', () => {
        for (const input of ['+237690000000', '237690000000', '690000000', '690 00 00 00']) {
            const c = phoneCandidates(input);
            expect(c).toContain('+237690000000');
            expect(c).toContain('690000000');
        }
    });
});
