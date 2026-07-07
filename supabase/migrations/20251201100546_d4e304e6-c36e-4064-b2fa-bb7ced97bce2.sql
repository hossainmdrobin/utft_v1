-- Create monthly_donations table
CREATE TABLE public.monthly_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2000),
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  payment_date TIMESTAMP WITH TIME ZONE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial', 'overdue')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(member_id, month, year)
);

-- Enable RLS
ALTER TABLE public.monthly_donations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all donations"
  ON public.monthly_donations
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view their own donations"
  ON public.monthly_donations
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    member_id IN (
      SELECT id FROM public.members WHERE user_id = auth.uid()
    )
  );

-- Create index for better performance
CREATE INDEX idx_monthly_donations_member_id ON public.monthly_donations(member_id);
CREATE INDEX idx_monthly_donations_status ON public.monthly_donations(status);
CREATE INDEX idx_monthly_donations_date ON public.monthly_donations(year, month);

-- Add trigger for updated_at
CREATE TRIGGER update_monthly_donations_updated_at
  BEFORE UPDATE ON public.monthly_donations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add audit logging trigger
CREATE TRIGGER log_monthly_donations_changes
  AFTER INSERT OR UPDATE ON public.monthly_donations
  FOR EACH ROW
  EXECUTE FUNCTION public.log_member_changes();