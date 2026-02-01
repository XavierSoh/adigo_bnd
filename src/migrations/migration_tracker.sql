-- =====================================================
-- MIGRATION TRACKER TABLE
-- Version: 1.0.0
-- Description: Tracks applied migrations to prevent duplicates
-- =====================================================

CREATE TABLE IF NOT EXISTS migration_tracker (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    version VARCHAR(50) NOT NULL,
    description TEXT,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms INT,
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failed', 'rolled_back')),
    error_message TEXT,
    applied_by VARCHAR(100) DEFAULT CURRENT_USER
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_migration_name ON migration_tracker(migration_name);
CREATE INDEX IF NOT EXISTS idx_migration_version ON migration_tracker(version);
CREATE INDEX IF NOT EXISTS idx_migration_status ON migration_tracker(status);

-- Function to check if migration was applied
CREATE OR REPLACE FUNCTION migration_exists(p_migration_name VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 FROM migration_tracker
        WHERE migration_name = p_migration_name
        AND status = 'success'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to record migration
CREATE OR REPLACE FUNCTION record_migration(
    p_migration_name VARCHAR,
    p_version VARCHAR,
    p_description TEXT,
    p_execution_time_ms INT DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO migration_tracker (migration_name, version, description, execution_time_ms)
    VALUES (p_migration_name, p_version, p_description, p_execution_time_ms)
    ON CONFLICT (migration_name)
    DO UPDATE SET
        applied_at = CURRENT_TIMESTAMP,
        execution_time_ms = p_execution_time_ms;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE migration_tracker IS 'Tracks all database migrations to prevent duplicate executions';
