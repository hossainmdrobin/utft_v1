-- Create trust_settings table for trust-wide configuration
CREATE TABLE public.trust_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.trust_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage settings
CREATE POLICY "Admins can manage trust settings"
ON public.trust_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Everyone can view settings
CREATE POLICY "Everyone can view settings"
ON public.trust_settings
FOR SELECT
TO authenticated
USING (true);

-- Create share_transactions table
CREATE TABLE public.share_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'transfer_in', 'transfer_out', 'payment', 'refund')),
  share_quantity INTEGER NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  transfer_to_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  transfer_from_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL
);

ALTER TABLE public.share_transactions ENABLE ROW LEVEL SECURITY;

-- Admins can manage all transactions
CREATE POLICY "Admins can manage all transactions"
ON public.share_transactions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Users can view transactions
CREATE POLICY "Users can view transactions"
ON public.share_transactions
FOR SELECT
TO authenticated
USING (true);

-- Create trigger for trust_settings updated_at
CREATE TRIGGER update_trust_settings_updated_at
BEFORE UPDATE ON public.trust_settings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Insert default share price setting
INSERT INTO public.trust_settings (key, value)
VALUES ('share_price', '{"amount": 100, "currency": "BDT"}')
ON CONFLICT (key) DO NOTHING;