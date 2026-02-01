"use strict";
/**
 * Admin Reports Controller
 *
 * Generate and export reports in Excel/CSV format
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminReportsController = void 0;
const i18n_1 = require("../../utils/i18n");
const pgdb_1 = __importDefault(require("../../config/pgdb"));
const export_service_1 = require("../services/export.service");
class AdminReportsController {
    /**
     * Export users to Excel
     * GET /v1/api/ticketing/admin/reports/users/export
     */
    static async exportUsers(req, res) {
        try {
            const { format = 'excel' } = req.query;
            // Get all users
            const users = await pgdb_1.default.any(`
                SELECT
                    c.id,
                    c.first_name,
                    c.last_name,
                    c.email,
                    c.phone,
                    c.role,
                    c.is_active,
                    c.created_at,
                    COALESCE(w.balance, 0)::int AS wallet_balance,
                    COUNT(DISTINCT et.id)::int AS total_tickets_purchased
                FROM customer c
                LEFT JOIN wallet w ON c.id = w.customer_id
                LEFT JOIN event_ticket et ON c.id = et.customer_id AND et.is_deleted = FALSE
                WHERE c.is_deleted = FALSE
                GROUP BY c.id, c.first_name, c.last_name, c.email, c.phone, c.role, c.is_active, c.created_at, w.balance
                ORDER BY c.created_at DESC
            `);
            const formattedData = export_service_1.ExportService.formatUsersForExport(users);
            if (format === 'csv') {
                const csv = export_service_1.ExportService.exportToCSV(formattedData, ['id', 'first_name', 'last_name', 'email', 'phone', 'role', 'wallet_balance', 'is_active', 'created_at', 'total_tickets_purchased']);
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename=users_export_${Date.now()}.csv`);
                res.send(csv);
            }
            else {
                const buffer = await export_service_1.ExportService.exportToExcel(formattedData, export_service_1.ExportService.getUsersExcelColumns(), 'Utilisateurs');
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename=users_export_${Date.now()}.xlsx`);
                res.send(buffer);
            }
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in exportUsers:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    /**
     * Export events to Excel
     * GET /v1/api/ticketing/admin/reports/events/export
     */
    static async exportEvents(req, res) {
        try {
            const { format = 'excel' } = req.query;
            // Get all events
            const events = await pgdb_1.default.any(`
                SELECT
                    e.*,
                    json_build_object('name', ec.name) AS category,
                    json_build_object('organization_name', eo.organization_name) AS organizer
                FROM event e
                LEFT JOIN event_category ec ON e.category_id = ec.id
                LEFT JOIN event_organizer eo ON e.organizer_id = eo.id
                WHERE e.is_deleted = FALSE
                ORDER BY e.created_at DESC
            `);
            const formattedData = export_service_1.ExportService.formatEventsForExport(events);
            if (format === 'csv') {
                const csv = export_service_1.ExportService.exportToCSV(formattedData, ['id', 'title', 'event_code', 'category', 'organizer', 'city', 'venue_name', 'event_date', 'status', 'total_tickets', 'sold_tickets', 'available_tickets', 'min_price', 'max_price', 'has_premium_design', 'created_at']);
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename=events_export_${Date.now()}.csv`);
                res.send(csv);
            }
            else {
                const buffer = await export_service_1.ExportService.exportToExcel(formattedData, export_service_1.ExportService.getEventsExcelColumns(), 'Événements');
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename=events_export_${Date.now()}.xlsx`);
                res.send(buffer);
            }
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in exportEvents:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    /**
     * Export tickets to Excel
     * GET /v1/api/ticketing/admin/reports/tickets/export
     */
    static async exportTickets(req, res) {
        try {
            const { format = 'excel' } = req.query;
            // Get all tickets
            const tickets = await pgdb_1.default.any(`
                SELECT
                    et.*,
                    json_build_object(
                        'title', e.title,
                        'event_code', e.event_code
                    ) AS event,
                    json_build_object(
                        'first_name', c.first_name,
                        'last_name', c.last_name,
                        'email', c.email
                    ) AS customer,
                    json_build_object(
                        'name', ett.name
                    ) AS ticket_type
                FROM event_ticket et
                JOIN event e ON et.event_id = e.id
                JOIN customer c ON et.customer_id = c.id
                LEFT JOIN event_ticket_type ett ON et.ticket_type_id = ett.id
                WHERE et.is_deleted = FALSE
                ORDER BY et.created_at DESC
            `);
            const formattedData = export_service_1.ExportService.formatTicketsForExport(tickets);
            if (format === 'csv') {
                const csv = export_service_1.ExportService.exportToCSV(formattedData, ['id', 'reference', 'event_title', 'event_code', 'customer_name', 'customer_email', 'ticket_type', 'quantity', 'total_price', 'status', 'is_validated', 'validated_at', 'created_at']);
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename=tickets_export_${Date.now()}.csv`);
                res.send(csv);
            }
            else {
                const buffer = await export_service_1.ExportService.exportToExcel(formattedData, export_service_1.ExportService.getTicketsExcelColumns(), 'Tickets');
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename=tickets_export_${Date.now()}.xlsx`);
                res.send(buffer);
            }
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in exportTickets:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    /**
     * Export transactions to Excel
     * GET /v1/api/ticketing/admin/reports/transactions/export
     */
    static async exportTransactions(req, res) {
        try {
            const { format = 'excel' } = req.query;
            // Get all transactions
            const transactions = await pgdb_1.default.any(`
                SELECT
                    wt.*,
                    json_build_object(
                        'first_name', c.first_name,
                        'last_name', c.last_name,
                        'email', c.email
                    ) AS customer
                FROM wallet_transaction wt
                JOIN customer c ON wt.customer_id = c.id
                ORDER BY wt.created_at DESC
            `);
            const formattedData = export_service_1.ExportService.formatTransactionsForExport(transactions);
            if (format === 'csv') {
                const csv = export_service_1.ExportService.exportToCSV(formattedData, ['id', 'customer_name', 'customer_email', 'amount', 'type', 'status', 'description', 'created_at']);
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename=transactions_export_${Date.now()}.csv`);
                res.send(csv);
            }
            else {
                const buffer = await export_service_1.ExportService.exportToExcel(formattedData, export_service_1.ExportService.getTransactionsExcelColumns(), 'Transactions');
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename=transactions_export_${Date.now()}.xlsx`);
                res.send(buffer);
            }
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in exportTransactions:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    /**
     * Generate revenue report
     * GET /v1/api/ticketing/admin/reports/revenue
     */
    static async getRevenueReport(req, res) {
        try {
            const lang = req.lang || 'en';
            const { start_date, end_date } = req.query;
            let dateFilter = '';
            const params = [];
            if (start_date) {
                params.push(start_date);
                dateFilter += ` AND et.created_at >= $${params.length}`;
            }
            if (end_date) {
                params.push(end_date);
                dateFilter += ` AND et.created_at <= $${params.length}`;
            }
            // Total revenue
            const totalRevenue = await pgdb_1.default.one(`
                SELECT
                    COALESCE(SUM(et.total_price), 0)::int AS tickets_revenue,
                    COALESCE((SELECT SUM(premium_design_amount) FROM event WHERE is_deleted = FALSE), 0)::int AS design_revenue,
                    COALESCE((SELECT SUM(boost_amount) FROM event WHERE is_deleted = FALSE), 0)::int AS boost_revenue,
                    COALESCE((SELECT SUM(field_service_amount) FROM event WHERE is_deleted = FALSE), 0)::int AS field_service_revenue
                FROM event_ticket et
                WHERE et.is_deleted = FALSE
                ${dateFilter}
            `, params);
            // Revenue by organizer
            const byOrganizer = await pgdb_1.default.any(`
                SELECT
                    eo.id,
                    eo.organization_name,
                    COUNT(DISTINCT e.id)::int AS events_count,
                    COALESCE(SUM(et.total_price), 0)::int AS revenue
                FROM event_organizer eo
                LEFT JOIN event e ON eo.id = e.organizer_id AND e.is_deleted = FALSE
                LEFT JOIN event_ticket et ON e.id = et.event_id AND et.is_deleted = FALSE ${dateFilter}
                WHERE eo.is_deleted = FALSE
                GROUP BY eo.id, eo.organization_name
                ORDER BY revenue DESC
            `, params);
            // Revenue by category
            const byCategory = await pgdb_1.default.any(`
                SELECT
                    ec.id,
                    ec.name,
                    COUNT(DISTINCT e.id)::int AS events_count,
                    COALESCE(SUM(et.total_price), 0)::int AS revenue
                FROM event_category ec
                LEFT JOIN event e ON ec.id = e.category_id AND e.is_deleted = FALSE
                LEFT JOIN event_ticket et ON e.id = et.event_id AND et.is_deleted = FALSE ${dateFilter}
                WHERE ec.is_deleted = FALSE
                GROUP BY ec.id, ec.name
                ORDER BY revenue DESC
            `, params);
            res.status(200).json({
                status: true,
                message: i18n_1.I18n.t('revenue_report_generated', lang),
                body: {
                    total_revenue: totalRevenue,
                    by_organizer: byOrganizer,
                    by_category: byCategory
                },
                code: 200
            });
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getRevenueReport:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
}
exports.AdminReportsController = AdminReportsController;
