/**
 * Export Service
 *
 * Generates Excel and CSV exports for admin reports
 */

import ExcelJS from 'exceljs';

export class ExportService {

    /**
     * Export data to Excel format
     */
    static async exportToExcel(data: any[], columns: { header: string; key: string; width?: number }[], sheetName: string = 'Export'): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(sheetName);

        // Set columns
        worksheet.columns = columns;

        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };
        worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

        // Add data rows
        data.forEach((item) => {
            worksheet.addRow(item);
        });

        // Auto-fit columns
        worksheet.columns.forEach((column: any) => {
            if (!column.width) {
                let maxLength = 0;
                column.eachCell!({ includeEmpty: true }, (cell: any) => {
                    const columnLength = cell.value ? cell.value.toString().length : 10;
                    if (columnLength > maxLength) {
                        maxLength = columnLength;
                    }
                });
                column.width = Math.min(maxLength + 2, 50);
            }
        });

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }

    /**
     * Export data to CSV format
     */
    static exportToCSV(data: any[], columns: string[]): string {
        // Header row
        let csv = columns.join(',') + '\n';

        // Data rows
        data.forEach((row) => {
            const values = columns.map((col) => {
                let value = row[col];

                // Handle null/undefined
                if (value === null || value === undefined) {
                    return '';
                }

                // Handle objects/arrays
                if (typeof value === 'object') {
                    value = JSON.stringify(value);
                }

                // Escape quotes and wrap in quotes if contains comma
                value = value.toString().replace(/"/g, '""');
                if (value.includes(',') || value.includes('\n') || value.includes('"')) {
                    value = `"${value}"`;
                }

                return value;
            });

            csv += values.join(',') + '\n';
        });

        return csv;
    }

    /**
     * Format users data for export
     */
    static formatUsersForExport(users: any[]): any[] {
        return users.map((user) => ({
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            wallet_balance: user.wallet_balance || 0,
            is_active: user.is_active ? 'Yes' : 'No',
            created_at: new Date(user.created_at).toISOString(),
            total_tickets_purchased: user.total_tickets_purchased || 0
        }));
    }

    /**
     * Format events data for export
     */
    static formatEventsForExport(events: any[]): any[] {
        return events.map((event) => ({
            id: event.id,
            title: event.title,
            event_code: event.event_code,
            category: event.category?.name || '',
            organizer: event.organizer?.organization_name || '',
            city: event.city,
            venue_name: event.venue_name,
            event_date: new Date(event.event_date).toISOString(),
            status: event.status,
            total_tickets: event.total_tickets,
            sold_tickets: event.sold_tickets,
            available_tickets: event.available_tickets,
            min_price: event.min_price,
            max_price: event.max_price,
            has_premium_design: event.has_premium_design ? 'Yes' : 'No',
            created_at: new Date(event.created_at).toISOString()
        }));
    }

    /**
     * Format tickets data for export
     */
    static formatTicketsForExport(tickets: any[]): any[] {
        return tickets.map((ticket) => ({
            id: ticket.id,
            reference: ticket.reference,
            event_title: ticket.event?.title || '',
            event_code: ticket.event?.event_code || '',
            customer_name: `${ticket.customer?.first_name || ''} ${ticket.customer?.last_name || ''}`,
            customer_email: ticket.customer?.email || '',
            ticket_type: ticket.ticket_type?.name || '',
            quantity: ticket.quantity,
            total_price: ticket.total_price,
            status: ticket.status,
            is_validated: ticket.is_validated ? 'Yes' : 'No',
            validated_at: ticket.validated_at ? new Date(ticket.validated_at).toISOString() : '',
            created_at: new Date(ticket.created_at).toISOString()
        }));
    }

    /**
     * Format transactions data for export
     */
    static formatTransactionsForExport(transactions: any[]): any[] {
        return transactions.map((tx) => ({
            id: tx.id,
            customer_name: `${tx.customer?.first_name || ''} ${tx.customer?.last_name || ''}`,
            customer_email: tx.customer?.email || '',
            amount: tx.amount,
            type: tx.type,
            status: tx.status,
            description: tx.description || '',
            created_at: new Date(tx.created_at).toISOString()
        }));
    }

    /**
     * Get Excel columns for users export
     */
    static getUsersExcelColumns(): { header: string; key: string; width?: number }[] {
        return [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Prénom', key: 'first_name', width: 20 },
            { header: 'Nom', key: 'last_name', width: 20 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Téléphone', key: 'phone', width: 20 },
            { header: 'Rôle', key: 'role', width: 15 },
            { header: 'Solde Wallet', key: 'wallet_balance', width: 15 },
            { header: 'Actif', key: 'is_active', width: 10 },
            { header: 'Date création', key: 'created_at', width: 25 },
            { header: 'Tickets achetés', key: 'total_tickets_purchased', width: 15 }
        ];
    }

    /**
     * Get Excel columns for events export
     */
    static getEventsExcelColumns(): { header: string; key: string; width?: number }[] {
        return [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Titre', key: 'title', width: 30 },
            { header: 'Code', key: 'event_code', width: 15 },
            { header: 'Catégorie', key: 'category', width: 20 },
            { header: 'Organisateur', key: 'organizer', width: 25 },
            { header: 'Ville', key: 'city', width: 15 },
            { header: 'Lieu', key: 'venue_name', width: 25 },
            { header: 'Date événement', key: 'event_date', width: 25 },
            { header: 'Statut', key: 'status', width: 15 },
            { header: 'Tickets total', key: 'total_tickets', width: 12 },
            { header: 'Tickets vendus', key: 'sold_tickets', width: 12 },
            { header: 'Tickets dispo', key: 'available_tickets', width: 12 },
            { header: 'Prix min', key: 'min_price', width: 12 },
            { header: 'Prix max', key: 'max_price', width: 12 },
            { header: 'Design premium', key: 'has_premium_design', width: 15 },
            { header: 'Date création', key: 'created_at', width: 25 }
        ];
    }

    /**
     * Get Excel columns for tickets export
     */
    static getTicketsExcelColumns(): { header: string; key: string; width?: number }[] {
        return [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Référence', key: 'reference', width: 20 },
            { header: 'Événement', key: 'event_title', width: 30 },
            { header: 'Code événement', key: 'event_code', width: 15 },
            { header: 'Client', key: 'customer_name', width: 25 },
            { header: 'Email client', key: 'customer_email', width: 30 },
            { header: 'Type ticket', key: 'ticket_type', width: 20 },
            { header: 'Quantité', key: 'quantity', width: 10 },
            { header: 'Prix total', key: 'total_price', width: 15 },
            { header: 'Statut', key: 'status', width: 15 },
            { header: 'Validé', key: 'is_validated', width: 10 },
            { header: 'Date validation', key: 'validated_at', width: 25 },
            { header: 'Date achat', key: 'created_at', width: 25 }
        ];
    }

    /**
     * Get Excel columns for transactions export
     */
    static getTransactionsExcelColumns(): { header: string; key: string; width?: number }[] {
        return [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Client', key: 'customer_name', width: 25 },
            { header: 'Email', key: 'customer_email', width: 30 },
            { header: 'Montant', key: 'amount', width: 15 },
            { header: 'Type', key: 'type', width: 10 },
            { header: 'Statut', key: 'status', width: 15 },
            { header: 'Description', key: 'description', width: 40 },
            { header: 'Date', key: 'created_at', width: 25 }
        ];
    }
}
