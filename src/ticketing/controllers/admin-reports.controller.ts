/**
 * Admin Reports Controller
 *
 * Generate and export reports in Excel/CSV format
 */

import { Request, Response } from 'express';
import { I18n } from '../../utils/i18n';
// Migrated to Prisma's native model API — logic lives in
// AdminReportsRepository, see BOOKING_MODULE_NOTES.md ("Full Prisma
// relational-API migration", tier 3).
import { AdminReportsRepository } from '../repositories/admin-reports.repository';
import { ExportService } from '../services/export.service';

export class AdminReportsController {

    /**
     * Export users to Excel
     * GET /v1/api/ticketing/admin/reports/users/export
     */
    static async exportUsers(req: Request, res: Response): Promise<void> {
        try {
            const { format = 'excel' } = req.query;

            const users = await AdminReportsRepository.getUsersForExport();
            const formattedData = ExportService.formatUsersForExport(users);

            if (format === 'csv') {
                const csv = ExportService.exportToCSV(
                    formattedData,
                    ['id', 'first_name', 'last_name', 'email', 'phone', 'role', 'wallet_balance', 'is_active', 'created_at', 'total_tickets_purchased']
                );

                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename=users_export_${Date.now()}.csv`);
                res.send(csv);
            } else {
                const buffer = await ExportService.exportToExcel(
                    formattedData,
                    ExportService.getUsersExcelColumns(),
                    'Utilisateurs'
                );

                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename=users_export_${Date.now()}.xlsx`);
                res.send(buffer);
            }
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in exportUsers:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Export events to Excel
     * GET /v1/api/ticketing/admin/reports/events/export
     */
    static async exportEvents(req: Request, res: Response): Promise<void> {
        try {
            const { format = 'excel' } = req.query;

            const events = await AdminReportsRepository.getEventsForExport();
            const formattedData = ExportService.formatEventsForExport(events);

            if (format === 'csv') {
                const csv = ExportService.exportToCSV(
                    formattedData,
                    ['id', 'title', 'event_code', 'category', 'organizer', 'city', 'venue_name', 'event_date', 'status', 'total_tickets', 'sold_tickets', 'available_tickets', 'min_price', 'max_price', 'has_premium_design', 'created_at']
                );

                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename=events_export_${Date.now()}.csv`);
                res.send(csv);
            } else {
                const buffer = await ExportService.exportToExcel(
                    formattedData,
                    ExportService.getEventsExcelColumns(),
                    'Événements'
                );

                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename=events_export_${Date.now()}.xlsx`);
                res.send(buffer);
            }
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in exportEvents:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Export tickets to Excel
     * GET /v1/api/ticketing/admin/reports/tickets/export
     */
    static async exportTickets(req: Request, res: Response): Promise<void> {
        try {
            const { format = 'excel' } = req.query;

            const tickets = await AdminReportsRepository.getTicketsForExport();
            const formattedData = ExportService.formatTicketsForExport(tickets);

            if (format === 'csv') {
                const csv = ExportService.exportToCSV(
                    formattedData,
                    ['id', 'reference', 'event_title', 'event_code', 'customer_name', 'customer_email', 'ticket_type', 'quantity', 'total_price', 'status', 'is_validated', 'validated_at', 'created_at']
                );

                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename=tickets_export_${Date.now()}.csv`);
                res.send(csv);
            } else {
                const buffer = await ExportService.exportToExcel(
                    formattedData,
                    ExportService.getTicketsExcelColumns(),
                    'Tickets'
                );

                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename=tickets_export_${Date.now()}.xlsx`);
                res.send(buffer);
            }
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in exportTickets:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Export transactions to Excel
     * GET /v1/api/ticketing/admin/reports/transactions/export
     */
    static async exportTransactions(req: Request, res: Response): Promise<void> {
        try {
            const { format = 'excel' } = req.query;

            const transactions = await AdminReportsRepository.getTransactionsForExport();
            const formattedData = ExportService.formatTransactionsForExport(transactions);

            if (format === 'csv') {
                const csv = ExportService.exportToCSV(
                    formattedData,
                    ['id', 'customer_name', 'customer_email', 'amount', 'type', 'status', 'description', 'created_at']
                );

                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename=transactions_export_${Date.now()}.csv`);
                res.send(csv);
            } else {
                const buffer = await ExportService.exportToExcel(
                    formattedData,
                    ExportService.getTransactionsExcelColumns(),
                    'Transactions'
                );

                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename=transactions_export_${Date.now()}.xlsx`);
                res.send(buffer);
            }
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in exportTransactions:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Generate revenue report
     * GET /v1/api/ticketing/admin/reports/revenue
     */
    static async getRevenueReport(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const { start_date, end_date } = req.query;

            const report = await AdminReportsRepository.getRevenueReport(
                start_date ? new Date(start_date as string) : undefined,
                end_date ? new Date(end_date as string) : undefined
            );

            res.status(200).json({
                status: true,
                message: I18n.t('revenue_report_generated', lang),
                body: report,
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getRevenueReport:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }
}
