/**
 * Shared Types for Ticketing Module
 *
 * Common types used across multiple ticketing models
 */

// Payment Methods
export type PaymentMethod = 'orangeMoney' | 'mtn' | 'cash' | 'wallet';

// Payment Status
export type PaymentStatus = 'pending' | 'unpaid' | 'partial' | 'paid' | 'refunded' | 'failed';

// Ticket Status
export type TicketStatus = 'pending' | 'confirmed' | 'used' | 'cancelled' | 'expired';

// Resale Status
export type ResaleStatus = 'available' | 'sold' | 'cancelled' | 'expired';
