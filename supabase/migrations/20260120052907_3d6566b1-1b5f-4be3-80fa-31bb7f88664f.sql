-- Create share_receivables table to track monthly share payment obligations
CREATE TABLE public.share_receivables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  share_quantity INTEGER NOT NULL DEFAULT 0,
  share_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  remaining_amount DECIMAL(10, 2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue')),
  payment_date TIMESTAMPTZ,
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(member_id, year, month)
);

-- Enable RLS
ALTER TABLE public.share_receivables ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users"
  ON public.share_receivables FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON public.share_receivables FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON public.share_receivables FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Enable delete for authenticated users"
  ON public.share_receivables FOR DELETE
  TO authenticated
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_share_receivables_updated_at
  BEFORE UPDATE ON public.share_receivables
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create trigger for auto status update based on payment
CREATE OR REPLACE FUNCTION public.update_share_receivable_status()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.paid_amount >= NEW.total_amount AND NEW.total_amount > 0 THEN
    NEW.status := 'paid';
    NEW.payment_date := COALESCE(NEW.payment_date, now());
  ELSIF NEW.paid_amount > 0 AND NEW.paid_amount < NEW.total_amount THEN
    NEW.status := 'partial';
  ELSIF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE THEN
    NEW.status := 'overdue';
  ELSE
    NEW.status := 'pending';
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE TRIGGER update_share_receivable_status_trigger
  BEFORE INSERT OR UPDATE ON public.share_receivables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_share_receivable_status();

-- Enable realtime for share_receivables
ALTER PUBLICATION supabase_realtime ADD TABLE public.share_receivables;