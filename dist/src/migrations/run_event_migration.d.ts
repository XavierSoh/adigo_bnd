/**
 * Run Event Module Migrations
 *
 * This script executes SQL migrations to create event-related tables
 * and seed initial data for the ticketing module.
 */
declare function runEventMigration(): Promise<void>;
export default runEventMigration;
