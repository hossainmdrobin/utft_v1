-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Update members table RLS policies to include admin access
DROP POLICY IF EXISTS "Allow authenticated users to view members" ON public.members;
DROP POLICY IF EXISTS "Allow authenticated users to insert members" ON public.members;
DROP POLICY IF EXISTS "Allow authenticated users to update members" ON public.members;
DROP POLICY IF EXISTS "Allow authenticated users to delete members" ON public.members;

CREATE POLICY "Admins can do everything with members"
  ON public.members
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view approved members"
  ON public.members
  FOR SELECT
  USING (status = 'active' OR auth.uid() IS NOT NULL);

-- Function to approve member and generate beneficiary ID
CREATE OR REPLACE FUNCTION public.approve_member(p_member_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_type member_type;
  v_full_name TEXT;
  v_beneficiary_id TEXT;
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve members';
  END IF;

  -- Get member details
  SELECT member_type, full_name INTO v_member_type, v_full_name
  FROM public.members
  WHERE id = p_member_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found or already processed';
  END IF;

  -- Generate beneficiary ID
  v_beneficiary_id := public.generate_beneficiary_id(v_member_type, v_full_name);

  -- Update member
  UPDATE public.members
  SET 
    status = 'active',
    beneficiary_id = v_beneficiary_id,
    approved_at = now(),
    updated_at = now()
  WHERE id = p_member_id;
END;
$$;

-- Function to reject member
CREATE OR REPLACE FUNCTION public.reject_member(p_member_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can reject members';
  END IF;

  -- Update member status
  UPDATE public.members
  SET 
    status = 'inactive',
    updated_at = now()
  WHERE id = p_member_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found or already processed';
  END IF;
END;
$$;