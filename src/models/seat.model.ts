export interface Seat {
  id: number;                // identifiant unique
  bus_id: number;            // référence vers le bus
  seat_number: string;       // ex: "A1", "B3"
  seat_type: "standard" | "premium" | "extra_legroom"; 
  is_active: boolean;        // true si le siège est actif
}
