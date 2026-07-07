-- Add is_contra column to accounts table
ALTER TABLE public.accounts 
ADD COLUMN is_contra boolean DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.accounts.is_contra IS 'Indicates if this is a contra account (opposite normal balance to its type)';