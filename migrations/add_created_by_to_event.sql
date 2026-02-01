-- Add created_by column to event table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'event'
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE event ADD COLUMN created_by INTEGER;
        ALTER TABLE event ADD CONSTRAINT fk_event_created_by
            FOREIGN KEY (created_by) REFERENCES users(id);

        COMMENT ON COLUMN event.created_by IS 'ID of the user who created the event';

        RAISE NOTICE 'Column created_by added to event table';
    ELSE
        RAISE NOTICE 'Column created_by already exists in event table';
    END IF;
END $$;
