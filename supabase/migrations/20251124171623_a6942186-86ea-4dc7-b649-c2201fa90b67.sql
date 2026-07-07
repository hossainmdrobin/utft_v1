-- Fix RLS policy for admins to allow INSERT operations
DROP POLICY IF EXISTS "Admins can do everything with members" ON public.members;

CREATE POLICY "Admins can do everything with members" 
ON public.members 
FOR ALL 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));