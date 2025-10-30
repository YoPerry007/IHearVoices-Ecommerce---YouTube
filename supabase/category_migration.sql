-- Migration script to support dynamic categories
-- This converts the category column from ENUM to TEXT to allow dynamic categories

-- Step 1: Add a new temporary column with TEXT type
ALTER TABLE products ADD COLUMN category_new TEXT;

-- Step 2: Copy data from the old ENUM column to the new TEXT column
UPDATE products SET category_new = category::TEXT;

-- Step 3: Drop the old column and rename the new one
ALTER TABLE products DROP COLUMN category;
ALTER TABLE products RENAME COLUMN category_new TO category;

-- Step 4: Add NOT NULL constraint and index
ALTER TABLE products ALTER COLUMN category SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_category_new ON public.products(category);

-- Step 5: Drop the old ENUM type (optional, only if not used elsewhere)
-- DROP TYPE IF EXISTS product_category;

-- Step 6: Create a categories table for better management (recommended for future)
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#8E8E93',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 7: Insert existing categories into the new table
INSERT INTO categories (name, description, color) VALUES
('sneakers', 'Athletic and casual footwear', '#FF6B6B'),
('clothes', 'Apparel and clothing items', '#4ECDC4'),
('accessories', 'Fashion accessories and add-ons', '#45B7D1')
ON CONFLICT (name) DO NOTHING;

-- Step 8: Create trigger to automatically add new categories
CREATE OR REPLACE FUNCTION auto_create_category()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if category exists, if not create it
  INSERT INTO categories (name, description)
  VALUES (NEW.category, NEW.category || ' products')
  ON CONFLICT (name) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_create_category
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_category();

-- Step 9: Update RLS policies for categories table
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are viewable by everyone" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Only authenticated users can insert categories" ON categories
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Only admins can update categories" ON categories
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete categories" ON categories
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Add updated_at trigger for categories
CREATE TRIGGER set_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE categories IS 'Product categories with dynamic creation support';
COMMENT ON COLUMN categories.name IS 'Unique category name (lowercase, no spaces)';
COMMENT ON COLUMN categories.description IS 'Human-readable category description';
COMMENT ON COLUMN categories.color IS 'Hex color code for UI theming';
