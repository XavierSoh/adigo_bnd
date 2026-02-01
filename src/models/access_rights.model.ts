export interface AccessRightModel {
    id?: number;
    key: string;
    module: string;
    module_name_en: string;
    module_name_fr: string;
    description_en: string;
    description_fr: string;
    is_deleted: boolean;
    deleted_at?: Date;
    deleted_by?: number;
}