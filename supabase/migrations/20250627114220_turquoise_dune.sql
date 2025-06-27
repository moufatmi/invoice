/*
  # Fix Director Dashboard Access to All Invoices

  1. Updates
    - Add client_data JSONB column to invoices table for better client data handling
    - Add trigger to automatically populate client_data from clients table
    - Add GIN index for better JSONB query performance
    - Ensure director can access all invoice data properly

  2. Security
    - Maintain existing RLS policies
    - Add client_data population for better data consistency
*/

-- Add client_data column to invoices table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'client_data'
  ) THEN
    ALTER TABLE invoices ADD COLUMN client_data jsonb;
  END IF;
END $$;

-- Create function to populate client_data from clients table
CREATE OR REPLACE FUNCTION populate_client_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Populate client_data from clients table when invoice is inserted or updated
  IF NEW.client_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'email', c.email,
      'phone', c.phone,
      'address', c.address
    ) INTO NEW.client_data
    FROM clients c
    WHERE c.id = NEW.client_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically populate client_data
DROP TRIGGER IF EXISTS populate_client_data_trigger ON invoices;
CREATE TRIGGER populate_client_data_trigger
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION populate_client_data();

-- Add GIN index for client_data JSONB queries
CREATE INDEX IF NOT EXISTS idx_invoices_client_data ON invoices USING gin (client_data);

-- Update existing invoices to populate client_data
UPDATE invoices 
SET client_data = (
  SELECT jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'email', c.email,
    'phone', c.phone,
    'address', c.address
  )
  FROM clients c
  WHERE c.id = invoices.client_id
)
WHERE client_data IS NULL AND client_id IS NOT NULL;