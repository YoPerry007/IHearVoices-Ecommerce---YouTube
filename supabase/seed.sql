-- IHearVoices Sample Data
-- This file contains sample data to populate the database for testing

-- Insert sample products with explicit UUIDs to match frontend mockData
INSERT INTO public.products (id, name, description, category, price, images, brand, sizes, colors, in_stock, stock_count, featured, discount_percentage, rating, review_count) VALUES
-- Sneakers
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Air Max 270 React', 'Premium running shoes with React foam technology for ultimate comfort and style', 'sneakers', 450.00, 
 ARRAY['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500'], 
 'Nike', ARRAY['7', '8', '9', '10', '11', '12'], ARRAY['Black', 'White', 'Red', 'Blue'], true, 25, true, 15, 4.5, 128),

('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Ultraboost 22', 'Energy-returning running shoes with Boost midsole technology', 'sneakers', 380.00,
 ARRAY['https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500', 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500'],
 'Adidas', ARRAY['6', '7', '8', '9', '10', '11', '12'], ARRAY['Core Black', 'Cloud White', 'Solar Red'], true, 18, true, 10, 4.3, 95),

('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Chuck Taylor All Star', 'Classic canvas sneakers with timeless design', 'sneakers', 120.00,
 ARRAY['https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=500', 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=500'],
 'Converse', ARRAY['6', '7', '8', '9', '10', '11'], ARRAY['Black', 'White', 'Red', 'Navy'], true, 35, false, 0, 4.2, 203),

('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'Jordan 1 Retro High', 'Iconic basketball shoes with premium leather construction', 'sneakers', 650.00,
 ARRAY['https://images.unsplash.com/photo-1556906781-9a412961c28c?w=500', 'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=500'],
 'Jordan', ARRAY['7', '8', '9', '10', '11', '12'], ARRAY['Bred', 'Royal', 'Chicago', 'Shadow'], true, 12, true, 5, 4.7, 156),

-- Clothes
('Premium Cotton T-Shirt', 'Soft, breathable cotton t-shirt perfect for everyday wear', 'clothes', 45.00,
 ARRAY['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500', 'https://images.unsplash.com/photo-1583743814966-8936f37f4036?w=500'],
 'IHearVoices', ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'], ARRAY['Black', 'White', 'Navy', 'Grey', 'Green'], true, 50, false, 20, 4.1, 67),

('Denim Jacket', 'Classic denim jacket with modern fit and premium wash', 'clothes', 180.00,
 ARRAY['https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=500', 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=500'],
 'Levi''s', ARRAY['S', 'M', 'L', 'XL', 'XXL'], ARRAY['Light Blue', 'Dark Blue', 'Black'], true, 22, true, 25, 4.4, 89),

('Hoodie Sweatshirt', 'Comfortable fleece hoodie with kangaroo pocket', 'clothes', 95.00,
 ARRAY['https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500'],
 'Champion', ARRAY['S', 'M', 'L', 'XL', 'XXL'], ARRAY['Black', 'Grey', 'Navy', 'Burgundy'], true, 30, false, 15, 4.0, 124),

('Cargo Pants', 'Utility-style cargo pants with multiple pockets', 'clothes', 85.00,
 ARRAY['https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=500', 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=500'],
 'Dickies', ARRAY['28', '30', '32', '34', '36', '38'], ARRAY['Khaki', 'Black', 'Olive', 'Navy'], true, 28, false, 0, 3.9, 76),

-- Accessories
('Leather Wallet', 'Genuine leather bifold wallet with RFID protection', 'accessories', 65.00,
 ARRAY['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500', 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=500'],
 'Bellroy', ARRAY['One Size'], ARRAY['Black', 'Brown', 'Tan'], true, 40, false, 10, 4.6, 234),

('Baseball Cap', 'Adjustable baseball cap with embroidered logo', 'accessories', 35.00,
 ARRAY['https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500', 'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=500'],
 'New Era', ARRAY['One Size'], ARRAY['Black', 'Navy', 'White', 'Red'], true, 45, false, 0, 4.2, 156),

('Backpack', 'Durable canvas backpack with laptop compartment', 'accessories', 120.00,
 ARRAY['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500', 'https://images.unsplash.com/photo-1581605405669-fcdf81165afa?w=500'],
 'Herschel', ARRAY['One Size'], ARRAY['Black', 'Navy', 'Grey', 'Olive'], true, 20, true, 15, 4.3, 98),

('Sunglasses', 'Polarized sunglasses with UV protection', 'accessories', 150.00,
 ARRAY['https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500', 'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=500'],
 'Ray-Ban', ARRAY['One Size'], ARRAY['Black', 'Tortoise', 'Gold'], true, 15, true, 20, 4.5, 187);

-- Create an admin user profile (this would typically be done through the auth system)
-- Note: In a real setup, you'd create this user through Supabase Auth first
-- INSERT INTO public.profiles (id, email, full_name, role) VALUES 
-- ('00000000-0000-0000-0000-000000000001', 'admin@ihearvoices.com', 'Admin User', 'admin');

-- Insert sample reviews
-- INSERT INTO public.reviews (user_id, product_id, rating, comment) VALUES
-- Note: These would use real user IDs in production
-- For now, we'll add them after users are created through the app

-- Sample voice commands for analytics (anonymized)
INSERT INTO public.voice_commands (command_text, recognized_intent, success, response_time_ms) VALUES
('Show me sneakers', 'navigate_catalog_sneakers', true, 250),
('Add to cart', 'add_to_cart', true, 180),
('What''s in my cart', 'view_cart', true, 120),
('Search for red shoes', 'search_products', true, 300),
('Go to home', 'navigate_home', true, 90),
('Show clothes', 'navigate_catalog_clothes', true, 200),
('Buy now', 'quick_purchase', true, 220),
('Remove from cart', 'remove_from_cart', true, 150),
('Show accessories', 'navigate_catalog_accessories', true, 180),
('Checkout', 'proceed_checkout', true, 160);

-- Create some sample cart items (these would be user-specific in production)
-- INSERT INTO public.cart_items (user_id, product_id, quantity, size, color) VALUES
-- ('user-id-here', (SELECT id FROM public.products WHERE name = 'Air Max 270 React' LIMIT 1), 1, '9', 'Black');

-- Update product stock counts based on sample data
UPDATE public.products SET stock_count = 
    CASE 
        WHEN name = 'Air Max 270 React' THEN 25
        WHEN name = 'Ultraboost 22' THEN 18
        WHEN name = 'Chuck Taylor All Star' THEN 35
        WHEN name = 'Jordan 1 Retro High' THEN 12
        WHEN name = 'Premium Cotton T-Shirt' THEN 50
        WHEN name = 'Denim Jacket' THEN 22
        WHEN name = 'Hoodie Sweatshirt' THEN 30
        WHEN name = 'Cargo Pants' THEN 28
        WHEN name = 'Leather Wallet' THEN 40
        WHEN name = 'Baseball Cap' THEN 45
        WHEN name = 'Backpack' THEN 20
        WHEN name = 'Sunglasses' THEN 15
        ELSE stock_count
    END;
