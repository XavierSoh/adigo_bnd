export interface ProfileModel{
    id?: number;
    name: string;
    description?: string;
    access_rights?: Array<{ id: number }>;
    is_deleted?: boolean;
    deleted_at?: Date;
    deleted_by?: number;
    created_at?: Date;
    created_by?: number;
    updated_at?: Date;
}   