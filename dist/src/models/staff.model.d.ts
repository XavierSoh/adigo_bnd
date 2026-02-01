export interface StaffModel {
    id: number;
    first_name: string;
    birth_name: string;
    last_name: string;
    employee_id: string;
    birth_date: Date | null;
    email: string;
    mobile_phone: string;
    landline_phone: string | null;
    contract_start_date: Date;
    contract_start_time: string | null;
    weekly_working_hours: number;
    contract_end_date: Date | null;
    contract_type: number;
    salary: number;
    payment_mode: 'daily' | 'weekly' | 'monthly';
    created_by: number | null;
    last_salary_payment: Date | null;
    is_deleted: boolean;
    deleted_at: Date | null;
    deleted_by: number | null;
}
