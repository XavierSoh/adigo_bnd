/**
 * Export Service
 *
 * Generates Excel and CSV exports for admin reports
 */
export declare class ExportService {
    /**
     * Export data to Excel format
     */
    static exportToExcel(data: any[], columns: {
        header: string;
        key: string;
        width?: number;
    }[], sheetName?: string): Promise<Buffer>;
    /**
     * Export data to CSV format
     */
    static exportToCSV(data: any[], columns: string[]): string;
    /**
     * Format users data for export
     */
    static formatUsersForExport(users: any[]): any[];
    /**
     * Format events data for export
     */
    static formatEventsForExport(events: any[]): any[];
    /**
     * Format tickets data for export
     */
    static formatTicketsForExport(tickets: any[]): any[];
    /**
     * Format transactions data for export
     */
    static formatTransactionsForExport(transactions: any[]): any[];
    /**
     * Get Excel columns for users export
     */
    static getUsersExcelColumns(): {
        header: string;
        key: string;
        width?: number;
    }[];
    /**
     * Get Excel columns for events export
     */
    static getEventsExcelColumns(): {
        header: string;
        key: string;
        width?: number;
    }[];
    /**
     * Get Excel columns for tickets export
     */
    static getTicketsExcelColumns(): {
        header: string;
        key: string;
        width?: number;
    }[];
    /**
     * Get Excel columns for transactions export
     */
    static getTransactionsExcelColumns(): {
        header: string;
        key: string;
        width?: number;
    }[];
}
