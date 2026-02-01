import { EventOrganizerCreateDto, EventOrganizerUpdateDto } from "../models/event-organizer.model";
import ResponseModel from "../../models/response.model";
export declare class EventOrganizerRepository {
    private static readonly BASE_SELECT;
    private static readonly BASE_JOINS;
    static create(organizer: EventOrganizerCreateDto, createdBy?: number): Promise<ResponseModel>;
    static findByCustomerId(customerId: number): Promise<ResponseModel>;
    static findById(id: number): Promise<ResponseModel>;
    static findAll(includeDeleted?: boolean): Promise<ResponseModel>;
    static update(id: number, organizer: EventOrganizerUpdateDto): Promise<ResponseModel>;
    static updateVerificationStatus(id: number, status: 'pending' | 'verified' | 'rejected' | 'suspended', verifiedBy?: number, verificationNotes?: string): Promise<ResponseModel>;
    static search(filters: {
        searchTerm?: string;
        verificationStatus?: string;
        organizationType?: string;
    }): Promise<ResponseModel>;
    static getVerified(): Promise<ResponseModel>;
    static getStatistics(): Promise<ResponseModel>;
    static softDelete(id: number, deletedBy?: number): Promise<ResponseModel>;
    static restore(id: number): Promise<ResponseModel>;
    static delete(id: number): Promise<ResponseModel>;
}
