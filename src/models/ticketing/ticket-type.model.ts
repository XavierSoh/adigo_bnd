export interface EventTicketType {
    id: number;
    event_id: number;
    name: string;
    description?: string;
    price: number;
    quantity: number;
    sold: number;
    sale_start?: Date;
    sale_end?: Date;
    max_per_order: number;
    is_active: boolean;
    created_at: Date;
    // Computed
    available?: number;
}

export interface TicketTypeCreateDto {
    event_id: number;
    name: string;
    description?: string;
    price: number;
    quantity: number;
    sale_start?: Date;
    sale_end?: Date;
    max_per_order?: number;
}

export interface TicketTypeUpdateDto {
    name?: string;
    description?: string;
    price?: number;
    quantity?: number;
    sale_start?: Date;
    sale_end?: Date;
    max_per_order?: number;
    is_active?: boolean;
}
