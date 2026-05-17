-- Add quarterly support to sales_targets
ALTER TABLE public.sales_targets
  ADD COLUMN IF NOT EXISTS period_type text NOT NULL DEFAULT 'month'
  CHECK (period_type IN ('month','quarter'));

ALTER TABLE public.sales_targets
  DROP CONSTRAINT IF EXISTS sales_targets_sales_user_id_month_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_targets_user_period_month_key'
  ) THEN
    ALTER TABLE public.sales_targets
      ADD CONSTRAINT sales_targets_user_period_month_key
      UNIQUE (sales_user_id, period_type, month);
  END IF;
END $$;
