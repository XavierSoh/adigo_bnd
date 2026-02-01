// ============================================
// INTERFACES
// ============================================

import { AgencyModel } from "./agency.model";
import { Customer } from "./customer.model";

export type PaymentMethod = "orangeMoney" | "mtn" | "wallet" | "cash";

 

export interface Booking {
    id: number;
    booking_reference?: string; // Ex: 'BKG-2025-001234' - Auto-généré
    generated_trip_id: number;
    customer_id: number;
    created_by?: number;
    generated_trip_seat_id: number;

    // Prix et paiement
    base_price?: number;
    seat_price_adjustment?: number;
    taxes?: number;
    discount?: number;
    total_price: number;
    payment_method: PaymentMethod;
    payment_status?: "unpaid" | "partial" | "paid" | "refunded";
    payment_reference?: string | null;

    // Statut et dates
    status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
    booking_date: string;
    confirmation_date?: string | null;
    cancellation_date?: string | null;
    cancellation_reason?: string | null;
    completion_date?: string | null;

    // Informations additionnelles
    special_requests?: string | null;
    group_id?: string | null;

    // Soft delete et tracking
    is_deleted: boolean;
    deleted_at?: string | null;
    updated_at?: string | null;
    deleted_by?: number | null;

    // Champs calculés/jointure (facultatifs)
    customer_name?: string;
    customer?: Customer; // Objet customer complet
    agency?: AgencyModel;
}