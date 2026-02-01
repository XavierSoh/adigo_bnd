import ResponseModel from '../models/response.model';
export declare class accessRightsRepository {
    static permissions: {
        key: string;
        module: string;
        module_name_en: string;
        module_name_fr: string;
        description_en: string;
        description_fr: string;
    }[];
    static getAllAccessRights(): Promise<ResponseModel>;
    static setUpAccessRights(): Promise<any>;
}
