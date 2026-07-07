-- Create enum for member types
CREATE TYPE public.member_type AS ENUM ('founding', 'general');

-- Create enum for member status
CREATE TYPE public.member_status AS ENUM ('pending', 'active', 'inactive', 'deceased');

-- Create enum for gender
CREATE TYPE public.gender AS ENUM ('male', 'female', 'other');

-- Create members table
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- System fields
  form_no TEXT,
  beneficiary_id TEXT UNIQUE,
  status public.member_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  deceased_at TIMESTAMP WITH TIME ZONE,
  
  -- Basic Info
  full_name TEXT NOT NULL,
  father_name TEXT,
  mother_name TEXT,
  date_of_birth DATE,
  gender public.gender,
  profession TEXT,
  nationality TEXT,
  religion TEXT,
  blood_group TEXT,
  education TEXT,
  
  -- Contact Info
  present_address TEXT,
  permanent_address TEXT,
  nid TEXT,
  mobile TEXT,
  email TEXT,
  
  -- Membership Info
  member_type public.member_type NOT NULL,
  share_quantity INTEGER NOT NULL DEFAULT 0,
  photo_url TEXT,
  
  -- Nominee Info
  nominee_name TEXT,
  nominee_relation TEXT,
  nominee_nid TEXT
);

-- Enable Row Level Security
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Create policies (for now, allow all authenticated users - will add admin checks later)
CREATE POLICY "Allow authenticated users to view members"
  ON public.members
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert members"
  ON public.members
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update members"
  ON public.members
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete members"
  ON public.members
  FOR DELETE
  TO authenticated
  USING (true);

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create function to generate beneficiary ID
CREATE OR REPLACE FUNCTION public.generate_beneficiary_id(
  p_member_type public.member_type,
  p_full_name TEXT,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS TEXT AS $$
DECLARE
  v_type_prefix CHAR(1);
  v_name_prefix CHAR(1);
  v_serial TEXT;
  v_count INTEGER;
BEGIN
  -- Get type prefix
  v_type_prefix := CASE 
    WHEN p_member_type = 'founding' THEN 'F'
    WHEN p_member_type = 'general' THEN 'G'
  END;
  
  -- Get name prefix (first letter of full name)
  v_name_prefix := UPPER(SUBSTRING(p_full_name FROM 1 FOR 1));
  
  -- Get count of members with same type and year
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.members
  WHERE member_type = p_member_type
    AND EXTRACT(YEAR FROM created_at) = p_year
    AND beneficiary_id IS NOT NULL;
  
  -- Format serial number with leading zeros
  v_serial := LPAD(v_count::TEXT, 4, '0');
  
  -- Return formatted ID
  RETURN v_type_prefix || v_name_prefix || p_year::TEXT || v_serial;
END;
$$ LANGUAGE plpgsql;