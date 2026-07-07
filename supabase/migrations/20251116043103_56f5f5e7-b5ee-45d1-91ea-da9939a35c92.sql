-- Fix search_path for handle_updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix search_path for generate_beneficiary_id function
CREATE OR REPLACE FUNCTION public.generate_beneficiary_id(
  p_member_type public.member_type,
  p_full_name TEXT,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS TEXT 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;