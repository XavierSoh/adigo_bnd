export interface ContractTypeModel {
    id?: number;
    name: string;
    code: string;
    terms_and_conditions?: string | null;
    periodicity: string;
    is_deleted?: boolean;
    deleted_at?: Date | null;
    deleted_by?: number | null;
    created_by?: number;
}
