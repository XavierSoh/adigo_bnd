/**
 * Shared Types for Ticketing Module
 *
 * Common types used across multiple ticketing models
 */
export type PaymentMethod = 'orangeMoney' | 'mtn' | 'cash' | 'wallet';
export type PaymentStatus = 'pending' | 'unpaid' | 'partial' | 'paid' | 'refunded' | 'failed';
export type TicketStatus = 'pending' | 'confirmed' | 'used' | 'cancelled' | 'expired';
export type ResaleStatus = 'available' | 'sold' | 'cancelled' | 'expired';
