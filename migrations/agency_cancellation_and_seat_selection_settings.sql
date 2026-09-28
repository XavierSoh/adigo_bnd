-- Point 4 + 6 (UX_FUNCTIONAL_REVAMP_PLAN_2026-09.md): per-agency settings
-- for late-cancellation fees and whether seat selection is required at
-- booking time. Defaults preserve today's actual behavior for every
-- existing agency (0% fee = full refund as it works today; seat selection
-- required = true, since the mobile booking flow always shows the seat
-- picker today).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'agency' AND column_name = 'late_cancellation_grace_hours'
    ) THEN
        ALTER TABLE agency ADD COLUMN late_cancellation_grace_hours INTEGER NOT NULL DEFAULT 2;
        COMMENT ON COLUMN agency.late_cancellation_grace_hours IS
            'Hours before departure below which a booking cancellation is considered late (fee applies).';
        RAISE NOTICE 'Column late_cancellation_grace_hours added to agency table';
    ELSE
        RAISE NOTICE 'Column late_cancellation_grace_hours already exists in agency table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'agency' AND column_name = 'late_cancellation_fee_percent'
    ) THEN
        ALTER TABLE agency ADD COLUMN late_cancellation_fee_percent INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE agency ADD CONSTRAINT agency_late_cancellation_fee_percent_check
            CHECK (late_cancellation_fee_percent >= 0 AND late_cancellation_fee_percent <= 100);
        COMMENT ON COLUMN agency.late_cancellation_fee_percent IS
            'Percent of total_price withheld on a late cancellation (0 = full refund, today''s existing behavior).';
        RAISE NOTICE 'Column late_cancellation_fee_percent added to agency table';
    ELSE
        RAISE NOTICE 'Column late_cancellation_fee_percent already exists in agency table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'agency' AND column_name = 'requires_seat_selection'
    ) THEN
        ALTER TABLE agency ADD COLUMN requires_seat_selection BOOLEAN NOT NULL DEFAULT true;
        COMMENT ON COLUMN agency.requires_seat_selection IS
            'Whether customers must pick a specific seat when booking a trip with this agency (true = today''s existing behavior everywhere).';
        RAISE NOTICE 'Column requires_seat_selection added to agency table';
    ELSE
        RAISE NOTICE 'Column requires_seat_selection already exists in agency table';
    END IF;
END $$;
