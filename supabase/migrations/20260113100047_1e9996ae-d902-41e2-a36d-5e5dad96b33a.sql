-- Add parent_account_id to link contra accounts to main accounts
ALTER TABLE public.accounts 
ADD COLUMN IF NOT EXISTS parent_account_id uuid REFERENCES public.accounts(id);

-- Add constraint: contra accounts MUST have a parent account
ALTER TABLE public.accounts 
ADD CONSTRAINT contra_account_must_have_parent 
CHECK (is_contra = false OR parent_account_id IS NOT NULL);

-- Create accounting_periods table for period locking
CREATE TABLE public.accounting_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  is_locked boolean DEFAULT false,
  locked_at timestamp with time zone,
  locked_by uuid REFERENCES auth.users(id),
  unlocked_at timestamp with time zone,
  unlocked_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(year, month)
);

-- Add is_locked column to journal_entries for individual locking
ALTER TABLE public.journal_entries 
ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS locked_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS locked_by uuid;

-- Create organization_settings table
CREATE TABLE public.organization_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  description text,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid
);

-- Insert default settings
INSERT INTO public.organization_settings (key, value, description) VALUES
  ('organization_info', '{"name": "", "address": "", "phone": "", "email": "", "logo_url": ""}', 'Organization details for reports'),
  ('fiscal_year', '{"start_month": 1, "start_day": 1}', 'Fiscal year start configuration'),
  ('currency', '{"symbol": "৳", "code": "BDT", "decimal_places": 2, "position": "before"}', 'Currency formatting settings'),
  ('default_accounts', '{"cash": null, "bank": null, "income": null, "expense": null}', 'Default accounts for quick transactions')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- RLS for accounting_periods
CREATE POLICY "Authenticated users can view periods" 
ON public.accounting_periods FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage periods" 
ON public.accounting_periods FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- RLS for organization_settings
CREATE POLICY "Authenticated users can view settings" 
ON public.organization_settings FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage settings" 
ON public.organization_settings FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Add action_type column to audit_logs for better categorization
ALTER TABLE public.audit_logs 
ADD COLUMN IF NOT EXISTS action_type text DEFAULT 'data_change',
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- Create function to log lock/unlock actions
CREATE OR REPLACE FUNCTION public.log_lock_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.is_locked IS DISTINCT FROM NEW.is_locked THEN
    INSERT INTO public.audit_logs (
      table_name, record_id, action, action_type, old_data, new_data, changed_by, description
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id,
      CASE WHEN NEW.is_locked THEN 'LOCK' ELSE 'UNLOCK' END,
      'lock_action',
      to_jsonb(OLD),
      to_jsonb(NEW),
      auth.uid(),
      CASE WHEN NEW.is_locked THEN 'Entry locked' ELSE 'Entry unlocked' END
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for journal entry lock logging
DROP TRIGGER IF EXISTS log_journal_entry_lock ON public.journal_entries;
CREATE TRIGGER log_journal_entry_lock
AFTER UPDATE ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.log_lock_action();

-- Create trigger for period lock logging
DROP TRIGGER IF EXISTS log_period_lock ON public.accounting_periods;
CREATE TRIGGER log_period_lock
AFTER UPDATE ON public.accounting_periods
FOR EACH ROW
EXECUTE FUNCTION public.log_lock_action();

-- Function to check if a journal entry can be modified
CREATE OR REPLACE FUNCTION public.can_modify_entry(entry_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_locked boolean;
  v_entry_date date;
  v_period_locked boolean;
BEGIN
  -- Check if entry is individually locked
  SELECT is_locked, entry_date INTO v_is_locked, v_entry_date
  FROM public.journal_entries
  WHERE id = entry_id;
  
  IF v_is_locked THEN
    RETURN false;
  END IF;
  
  -- Check if the period is locked
  SELECT is_locked INTO v_period_locked
  FROM public.accounting_periods
  WHERE year = EXTRACT(YEAR FROM v_entry_date)
    AND month = EXTRACT(MONTH FROM v_entry_date);
  
  IF v_period_locked THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Add comment for parent_account_id
COMMENT ON COLUMN public.accounts.parent_account_id IS 'For contra accounts, links to the main account it offsets';