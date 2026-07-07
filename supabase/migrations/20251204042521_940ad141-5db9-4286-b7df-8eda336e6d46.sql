-- Account types enum
CREATE TYPE public.account_type AS ENUM ('asset', 'liability', 'equity', 'income', 'expense');

-- Chart of Accounts table
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  account_type public.account_type NOT NULL,
  parent_id UUID REFERENCES public.accounts(id),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  opening_balance DECIMAL(15,2) DEFAULT 0,
  current_balance DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Journal Entries table (header)
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number VARCHAR(20) NOT NULL UNIQUE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference TEXT,
  description TEXT,
  member_id UUID REFERENCES public.members(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'voided')),
  total_debit DECIMAL(15,2) DEFAULT 0,
  total_credit DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  posted_by UUID REFERENCES auth.users(id),
  posted_at TIMESTAMPTZ
);

-- Journal Entry Lines table (details)
CREATE TABLE public.journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  description TEXT,
  debit DECIMAL(15,2) DEFAULT 0,
  credit DECIMAL(15,2) DEFAULT 0,
  member_id UUID REFERENCES public.members(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;

-- RLS Policies for accounts
CREATE POLICY "Admins can manage accounts"
ON public.accounts FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view accounts"
ON public.accounts FOR SELECT
TO authenticated
USING (is_active = true);

-- RLS Policies for journal_entries
CREATE POLICY "Admins can manage journal entries"
ON public.journal_entries FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view their journal entries"
ON public.journal_entries FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
);

-- RLS Policies for journal_entry_lines
CREATE POLICY "Admins can manage journal entry lines"
ON public.journal_entry_lines FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view their journal entry lines"
ON public.journal_entry_lines FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  journal_entry_id IN (
    SELECT id FROM journal_entries 
    WHERE member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  )
);

-- Indexes
CREATE INDEX idx_accounts_code ON public.accounts(code);
CREATE INDEX idx_accounts_type ON public.accounts(account_type);
CREATE INDEX idx_accounts_parent ON public.accounts(parent_id);
CREATE INDEX idx_journal_entries_date ON public.journal_entries(entry_date);
CREATE INDEX idx_journal_entries_member ON public.journal_entries(member_id);
CREATE INDEX idx_journal_entry_lines_entry ON public.journal_entry_lines(journal_entry_id);
CREATE INDEX idx_journal_entry_lines_account ON public.journal_entry_lines(account_id);

-- Trigger for updated_at
CREATE TRIGGER update_accounts_updated_at
BEFORE UPDATE ON public.accounts
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_journal_entries_updated_at
BEFORE UPDATE ON public.journal_entries
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to generate next entry number
CREATE OR REPLACE FUNCTION public.generate_entry_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.journal_entries
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  
  RETURN 'JE-' || v_year || '-' || LPAD(v_count::TEXT, 5, '0');
END;
$$;

-- Function to update account balances when journal entry is posted
CREATE OR REPLACE FUNCTION public.update_account_balances()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'posted' AND (OLD.status IS NULL OR OLD.status != 'posted') THEN
    -- Update account balances
    UPDATE public.accounts a
    SET current_balance = current_balance + (
      SELECT COALESCE(SUM(
        CASE 
          WHEN a.account_type IN ('asset', 'expense') THEN debit - credit
          ELSE credit - debit
        END
      ), 0)
      FROM public.journal_entry_lines jel
      WHERE jel.journal_entry_id = NEW.id AND jel.account_id = a.id
    )
    WHERE a.id IN (SELECT account_id FROM public.journal_entry_lines WHERE journal_entry_id = NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_account_balances
AFTER UPDATE ON public.journal_entries
FOR EACH ROW EXECUTE FUNCTION public.update_account_balances();

-- Insert default chart of accounts
INSERT INTO public.accounts (code, name, account_type, is_system, description) VALUES
-- Assets
('1000', 'Assets', 'asset', true, 'Parent account for all assets'),
('1100', 'Cash and Bank', 'asset', true, 'Cash and bank accounts'),
('1101', 'Cash in Hand', 'asset', false, 'Physical cash'),
('1102', 'Bank Account', 'asset', false, 'Primary bank account'),
('1200', 'Accounts Receivable', 'asset', true, 'Money owed by members'),
('1201', 'Member Receivables', 'asset', false, 'Receivables from members'),
('1300', 'Share Capital Receivable', 'asset', false, 'Unpaid share capital'),

-- Liabilities
('2000', 'Liabilities', 'liability', true, 'Parent account for all liabilities'),
('2100', 'Accounts Payable', 'liability', true, 'Money owed to others'),
('2200', 'Advance Receipts', 'liability', false, 'Advance payments received'),

-- Equity
('3000', 'Equity', 'equity', true, 'Parent account for equity'),
('3100', 'Share Capital', 'equity', false, 'Member share capital'),
('3200', 'Retained Earnings', 'equity', false, 'Accumulated earnings'),
('3300', 'Donation Fund', 'equity', false, 'Monthly donations fund'),

-- Income
('4000', 'Income', 'income', true, 'Parent account for income'),
('4100', 'Share Income', 'income', false, 'Income from share sales'),
('4200', 'Donation Income', 'income', false, 'Monthly donation income'),
('4300', 'Other Income', 'income', false, 'Miscellaneous income'),

-- Expenses
('5000', 'Expenses', 'expense', true, 'Parent account for expenses'),
('5100', 'Administrative Expenses', 'expense', false, 'Admin and office expenses'),
('5200', 'Welfare Expenses', 'expense', false, 'Member welfare payments'),
('5300', 'Other Expenses', 'expense', false, 'Miscellaneous expenses');

-- Set parent relationships
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE code = '1000') WHERE code IN ('1100', '1200', '1300');
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE code = '1100') WHERE code IN ('1101', '1102');
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE code = '1200') WHERE code = '1201';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE code = '2000') WHERE code IN ('2100', '2200');
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE code = '3000') WHERE code IN ('3100', '3200', '3300');
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE code = '4000') WHERE code IN ('4100', '4200', '4300');
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE code = '5000') WHERE code IN ('5100', '5200', '5300');