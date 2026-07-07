-- =====================================================
-- CONTRIBUTION TRACKING & FINE CALCULATION SYSTEM
-- =====================================================

-- 1. Create fine_rules table for configurable fine settings
CREATE TABLE public.fine_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  fine_type TEXT NOT NULL CHECK (fine_type IN ('fixed', 'percentage')),
  fine_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
  grace_period_days INTEGER NOT NULL DEFAULT 0,
  is_cumulative BOOLEAN NOT NULL DEFAULT false,
  cumulative_frequency TEXT CHECK (cumulative_frequency IN ('daily', 'weekly', 'monthly')),
  max_fine_amount DECIMAL(10, 2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. Create member_charges table for yearly down payments and additional charges
CREATE TABLE public.member_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  charge_type TEXT NOT NULL CHECK (charge_type IN ('yearly_down_payment', 'additional_charge', 'adjustment')),
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  year INTEGER NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial', 'overdue')),
  payment_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 3. Create fine_transactions table for tracking applied fines
CREATE TABLE public.fine_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  donation_id UUID REFERENCES public.monthly_donations(id) ON DELETE SET NULL,
  charge_id UUID REFERENCES public.member_charges(id) ON DELETE SET NULL,
  fine_rule_id UUID REFERENCES public.fine_rules(id) ON DELETE SET NULL,
  fine_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial', 'waived')),
  applied_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_date TIMESTAMP WITH TIME ZONE,
  waived_by UUID REFERENCES auth.users(id),
  waived_at TIMESTAMP WITH TIME ZONE,
  waive_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Create contribution_settings table for default monthly contribution amounts
CREATE TABLE public.contribution_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
  default_contribution_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  default_due_day INTEGER NOT NULL DEFAULT 10 CHECK (default_due_day >= 1 AND default_due_day <= 28),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(member_id)
);

-- 5. Add global default contribution setting
INSERT INTO public.organization_settings (key, value, description)
VALUES 
  ('default_contribution_amount', '{"amount": 0}', 'Default monthly contribution amount for all members'),
  ('default_due_day', '{"day": 10}', 'Default due day of month for contributions'),
  ('fine_enabled', '{"enabled": true}', 'Enable/disable automatic fine calculation')
ON CONFLICT (key) DO NOTHING;

-- 6. Enable RLS on new tables
ALTER TABLE public.fine_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fine_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_settings ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for fine_rules
CREATE POLICY "Admins can manage fine rules" ON public.fine_rules
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view fine rules" ON public.fine_rules
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 8. RLS Policies for member_charges
CREATE POLICY "Admins can manage all charges" ON public.member_charges
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members can view their own charges" ON public.member_charges
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- 9. RLS Policies for fine_transactions
CREATE POLICY "Admins can manage all fines" ON public.fine_transactions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members can view their own fines" ON public.fine_transactions
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- 10. RLS Policies for contribution_settings
CREATE POLICY "Admins can manage contribution settings" ON public.contribution_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members can view their own contribution settings" ON public.contribution_settings
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- 11. Function to calculate and apply fines automatically
CREATE OR REPLACE FUNCTION public.calculate_member_fines()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_donation RECORD;
  v_charge RECORD;
  v_rule RECORD;
  v_fine_amount DECIMAL(10, 2);
  v_existing_fine UUID;
  v_days_overdue INTEGER;
BEGIN
  -- Get active fine rule
  SELECT * INTO v_rule FROM public.fine_rules WHERE is_active = true LIMIT 1;
  
  IF v_rule IS NULL THEN
    RETURN;
  END IF;

  -- Process overdue monthly donations
  FOR v_donation IN 
    SELECT md.*, m.full_name
    FROM public.monthly_donations md
    JOIN public.members m ON md.member_id = m.id
    WHERE md.status IN ('pending', 'partial', 'overdue')
      AND md.due_date IS NOT NULL
      AND md.due_date < CURRENT_DATE - INTERVAL '1 day' * v_rule.grace_period_days
  LOOP
    v_days_overdue := CURRENT_DATE - v_donation.due_date - v_rule.grace_period_days;
    
    -- Calculate fine based on type
    IF v_rule.fine_type = 'fixed' THEN
      v_fine_amount := v_rule.fine_value;
      
      -- If cumulative, multiply by periods
      IF v_rule.is_cumulative AND v_days_overdue > 0 THEN
        CASE v_rule.cumulative_frequency
          WHEN 'daily' THEN v_fine_amount := v_rule.fine_value * v_days_overdue;
          WHEN 'weekly' THEN v_fine_amount := v_rule.fine_value * CEIL(v_days_overdue / 7.0);
          WHEN 'monthly' THEN v_fine_amount := v_rule.fine_value * CEIL(v_days_overdue / 30.0);
        END CASE;
      END IF;
    ELSE
      -- Percentage based
      v_fine_amount := (v_donation.amount - v_donation.paid_amount) * (v_rule.fine_value / 100);
      
      IF v_rule.is_cumulative AND v_days_overdue > 0 THEN
        CASE v_rule.cumulative_frequency
          WHEN 'daily' THEN v_fine_amount := v_fine_amount * v_days_overdue;
          WHEN 'weekly' THEN v_fine_amount := v_fine_amount * CEIL(v_days_overdue / 7.0);
          WHEN 'monthly' THEN v_fine_amount := v_fine_amount * CEIL(v_days_overdue / 30.0);
        END CASE;
      END IF;
    END IF;

    -- Apply max fine cap if set
    IF v_rule.max_fine_amount IS NOT NULL AND v_fine_amount > v_rule.max_fine_amount THEN
      v_fine_amount := v_rule.max_fine_amount;
    END IF;

    -- Check if fine already exists for this donation
    SELECT id INTO v_existing_fine 
    FROM public.fine_transactions 
    WHERE donation_id = v_donation.id AND status NOT IN ('paid', 'waived');

    IF v_existing_fine IS NULL THEN
      -- Create new fine
      INSERT INTO public.fine_transactions (
        member_id, donation_id, fine_rule_id, fine_amount, reason, applied_date
      ) VALUES (
        v_donation.member_id, 
        v_donation.id, 
        v_rule.id, 
        v_fine_amount,
        'Late payment fine for ' || TO_CHAR(MAKE_DATE(v_donation.year, v_donation.month, 1), 'Month YYYY'),
        CURRENT_DATE
      );
    ELSE
      -- Update existing fine amount
      UPDATE public.fine_transactions 
      SET fine_amount = v_fine_amount, updated_at = now()
      WHERE id = v_existing_fine;
    END IF;

    -- Update donation status to overdue
    UPDATE public.monthly_donations 
    SET status = 'overdue', updated_at = now() 
    WHERE id = v_donation.id AND status != 'overdue';
  END LOOP;

  -- Process overdue member charges
  FOR v_charge IN 
    SELECT mc.*, m.full_name
    FROM public.member_charges mc
    JOIN public.members m ON mc.member_id = m.id
    WHERE mc.status IN ('pending', 'partial', 'overdue')
      AND mc.due_date IS NOT NULL
      AND mc.due_date < CURRENT_DATE - INTERVAL '1 day' * v_rule.grace_period_days
  LOOP
    v_days_overdue := CURRENT_DATE - v_charge.due_date - v_rule.grace_period_days;
    
    IF v_rule.fine_type = 'fixed' THEN
      v_fine_amount := v_rule.fine_value;
      IF v_rule.is_cumulative AND v_days_overdue > 0 THEN
        CASE v_rule.cumulative_frequency
          WHEN 'daily' THEN v_fine_amount := v_rule.fine_value * v_days_overdue;
          WHEN 'weekly' THEN v_fine_amount := v_rule.fine_value * CEIL(v_days_overdue / 7.0);
          WHEN 'monthly' THEN v_fine_amount := v_rule.fine_value * CEIL(v_days_overdue / 30.0);
        END CASE;
      END IF;
    ELSE
      v_fine_amount := (v_charge.amount - v_charge.paid_amount) * (v_rule.fine_value / 100);
      IF v_rule.is_cumulative AND v_days_overdue > 0 THEN
        CASE v_rule.cumulative_frequency
          WHEN 'daily' THEN v_fine_amount := v_fine_amount * v_days_overdue;
          WHEN 'weekly' THEN v_fine_amount := v_fine_amount * CEIL(v_days_overdue / 7.0);
          WHEN 'monthly' THEN v_fine_amount := v_fine_amount * CEIL(v_days_overdue / 30.0);
        END CASE;
      END IF;
    END IF;

    IF v_rule.max_fine_amount IS NOT NULL AND v_fine_amount > v_rule.max_fine_amount THEN
      v_fine_amount := v_rule.max_fine_amount;
    END IF;

    SELECT id INTO v_existing_fine 
    FROM public.fine_transactions 
    WHERE charge_id = v_charge.id AND status NOT IN ('paid', 'waived');

    IF v_existing_fine IS NULL THEN
      INSERT INTO public.fine_transactions (
        member_id, charge_id, fine_rule_id, fine_amount, reason, applied_date
      ) VALUES (
        v_charge.member_id, 
        v_charge.id, 
        v_rule.id, 
        v_fine_amount,
        'Late payment fine for ' || v_charge.charge_type || ' - ' || v_charge.year,
        CURRENT_DATE
      );
    ELSE
      UPDATE public.fine_transactions 
      SET fine_amount = v_fine_amount, updated_at = now()
      WHERE id = v_existing_fine;
    END IF;

    UPDATE public.member_charges 
    SET status = 'overdue', updated_at = now() 
    WHERE id = v_charge.id AND status != 'overdue';
  END LOOP;
END;
$$;

-- 12. Function to get member financial summary
CREATE OR REPLACE FUNCTION public.get_member_financial_summary(p_member_id UUID)
RETURNS TABLE (
  total_contributions DECIMAL(10, 2),
  total_paid DECIMAL(10, 2),
  total_due DECIMAL(10, 2),
  total_fines DECIMAL(10, 2),
  fines_paid DECIMAL(10, 2),
  fines_pending DECIMAL(10, 2),
  total_charges DECIMAL(10, 2),
  charges_paid DECIMAL(10, 2),
  charges_due DECIMAL(10, 2),
  grand_total_due DECIMAL(10, 2),
  payment_status TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH donations AS (
    SELECT 
      COALESCE(SUM(amount), 0) as total,
      COALESCE(SUM(paid_amount), 0) as paid
    FROM monthly_donations WHERE member_id = p_member_id
  ),
  fines AS (
    SELECT 
      COALESCE(SUM(fine_amount), 0) as total,
      COALESCE(SUM(paid_amount), 0) as paid,
      COALESCE(SUM(fine_amount - paid_amount) FILTER (WHERE status NOT IN ('paid', 'waived')), 0) as pending
    FROM fine_transactions WHERE member_id = p_member_id
  ),
  charges AS (
    SELECT 
      COALESCE(SUM(amount), 0) as total,
      COALESCE(SUM(paid_amount), 0) as paid
    FROM member_charges WHERE member_id = p_member_id
  )
  SELECT 
    d.total::DECIMAL(10,2),
    d.paid::DECIMAL(10,2),
    (d.total - d.paid)::DECIMAL(10,2),
    f.total::DECIMAL(10,2),
    f.paid::DECIMAL(10,2),
    f.pending::DECIMAL(10,2),
    c.total::DECIMAL(10,2),
    c.paid::DECIMAL(10,2),
    (c.total - c.paid)::DECIMAL(10,2),
    ((d.total - d.paid) + f.pending + (c.total - c.paid))::DECIMAL(10,2),
    CASE 
      WHEN (d.total - d.paid) + f.pending + (c.total - c.paid) = 0 THEN 'cleared'
      WHEN f.pending > 0 THEN 'fine_applied'
      WHEN EXISTS (
        SELECT 1 FROM monthly_donations WHERE member_id = p_member_id AND status = 'overdue'
      ) OR EXISTS (
        SELECT 1 FROM member_charges WHERE member_id = p_member_id AND status = 'overdue'
      ) THEN 'overdue'
      WHEN (d.total - d.paid) + (c.total - c.paid) > 0 THEN 'due'
      ELSE 'cleared'
    END::TEXT
  FROM donations d, fines f, charges c;
END;
$$;

-- 13. Trigger to update statuses on payment
CREATE OR REPLACE FUNCTION public.update_payment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update status based on payment
  IF NEW.paid_amount >= NEW.amount AND NEW.amount > 0 THEN
    NEW.status := 'paid';
    NEW.payment_date := COALESCE(NEW.payment_date, now());
  ELSIF NEW.paid_amount > 0 AND NEW.paid_amount < NEW.amount THEN
    NEW.status := 'partial';
  ELSIF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE THEN
    NEW.status := 'overdue';
  ELSE
    NEW.status := 'pending';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_monthly_donation_status
  BEFORE UPDATE OF paid_amount ON public.monthly_donations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_status();

CREATE TRIGGER update_member_charge_status
  BEFORE UPDATE OF paid_amount ON public.member_charges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_status();

-- 14. Trigger to clear fines when payment is complete
CREATE OR REPLACE FUNCTION public.clear_fines_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    -- Mark related fines as requiring attention (but don't auto-pay them)
    -- Fines still need to be paid separately
    NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- 15. Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.monthly_donations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fine_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.member_charges;

-- 16. Create index for better query performance
CREATE INDEX idx_monthly_donations_member_status ON public.monthly_donations(member_id, status);
CREATE INDEX idx_fine_transactions_member_status ON public.fine_transactions(member_id, status);
CREATE INDEX idx_member_charges_member_status ON public.member_charges(member_id, status);
CREATE INDEX idx_monthly_donations_due_date ON public.monthly_donations(due_date) WHERE status IN ('pending', 'partial', 'overdue');

-- 17. Insert default fine rule
INSERT INTO public.fine_rules (name, fine_type, fine_value, grace_period_days, is_cumulative, cumulative_frequency, is_active)
VALUES ('Default Late Payment Fine', 'fixed', 50, 5, true, 'monthly', true);