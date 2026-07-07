-- Create audit_logs table for tracking changes
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT')),
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  description TEXT
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create index for better performance
CREATE INDEX idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_changed_at ON public.audit_logs(changed_at DESC);

-- Create trigger function to auto-log member changes
CREATE OR REPLACE FUNCTION public.log_member_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, changed_by, description)
    VALUES (
      'members',
      NEW.id,
      'UPDATE',
      to_jsonb(OLD),
      to_jsonb(NEW),
      auth.uid(),
      'Member record updated'
    );
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, new_data, changed_by, description)
    VALUES (
      'members',
      NEW.id,
      'INSERT',
      to_jsonb(NEW),
      auth.uid(),
      'New member created'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger to members table
CREATE TRIGGER member_changes_audit
AFTER INSERT OR UPDATE ON public.members
FOR EACH ROW
EXECUTE FUNCTION public.log_member_changes();