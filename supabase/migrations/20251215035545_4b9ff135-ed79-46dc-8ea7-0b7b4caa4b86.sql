-- Create report_templates table for saving custom report configurations
CREATE TABLE public.report_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

-- Admins can manage all templates
CREATE POLICY "Admins can manage report templates"
ON public.report_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- All authenticated users can view templates
CREATE POLICY "Authenticated users can view templates"
ON public.report_templates
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Add updated_at trigger
CREATE TRIGGER update_report_templates_updated_at
BEFORE UPDATE ON public.report_templates
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();