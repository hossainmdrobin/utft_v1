-- Add user_id column to members table
ALTER TABLE public.members 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_members_user_id ON public.members(user_id);

-- Drop existing policies on members table
DROP POLICY IF EXISTS "Admins can do everything with members" ON public.members;
DROP POLICY IF EXISTS "Users can view approved members" ON public.members;

-- Create new restrictive policies for members table
CREATE POLICY "Admins can do everything with members"
ON public.members
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view their own record"
ON public.members
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view member directory"
ON public.members
FOR SELECT
TO authenticated
USING (status = 'active' AND user_id IS NOT NULL);

-- Drop existing policies on share_transactions table
DROP POLICY IF EXISTS "Users can view transactions" ON public.share_transactions;
DROP POLICY IF EXISTS "Admins can manage all transactions" ON public.share_transactions;

-- Create new restrictive policies for share_transactions
CREATE POLICY "Admins can manage all transactions"
ON public.share_transactions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own transactions"
ON public.share_transactions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()) OR
  transfer_from_member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()) OR
  transfer_to_member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
);

-- Create public member directory view with only non-sensitive fields
CREATE OR REPLACE VIEW public.member_directory AS
SELECT 
  id,
  beneficiary_id,
  full_name,
  member_type,
  status,
  share_quantity,
  photo_url,
  approved_at
FROM public.members
WHERE status = 'active' AND user_id IS NOT NULL;

-- Grant access to the view
GRANT SELECT ON public.member_directory TO authenticated;

-- Add RLS to the view (inherits from base table but add explicit policy)
ALTER VIEW public.member_directory SET (security_invoker = true);