-- Allow executives to see unassigned leads (open pool) and claim them
-- by being the first to open the lead detail page.

DROP POLICY IF EXISTS "leads: exec select own" ON public.leads;
CREATE POLICY "leads: exec select own or unassigned"
  ON public.leads
  FOR SELECT
  USING (
    is_sales_user(auth.uid())
    AND (assigned_to = auth.uid() OR assigned_to IS NULL)
  );

DROP POLICY IF EXISTS "leads: exec update own" ON public.leads;
CREATE POLICY "leads: exec update own or claim"
  ON public.leads
  FOR UPDATE
  USING (
    is_sales_user(auth.uid())
    AND (assigned_to = auth.uid() OR assigned_to IS NULL)
  )
  WITH CHECK (
    is_sales_user(auth.uid())
    AND (assigned_to = auth.uid() OR assigned_to IS NULL)
  );
