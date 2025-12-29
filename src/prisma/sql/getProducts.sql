-- @param {Int} $1:limitParam The maximum number of products to return
-- @param {Int} $2:offsetParam The offset for pagination
-- @param {String} $3:searchParam? Search term for product name (nullable)
-- @param {String} $4:categoriesParam? Comma-separated categories (nullable)
-- @param {String} $5:materialsParam? Comma-separated materials (nullable)
-- @param {Int} $6:minPriceParam? Minimum price filter (nullable)
-- @param {Int} $7:maxPriceParam? Maximum price filter (nullable)
-- @param {String} $8:orderByParam? Order by option (nullable)
-- @param {Int} $9:userIdParam? The user ID for wishlist check (nullable)

WITH
-- Product stats from reviews
product_stats AS (
  SELECT
    product_id,
    AVG(rating)::numeric(3,2) AS avg_rating,
    COUNT(*) AS reviews_count
  FROM reviews
  WHERE product_id IS NOT NULL
  GROUP BY product_id
),
-- Best sellers for featured sorting
best_sellers AS (
  SELECT product_id, COUNT(*) AS purchase_count
  FROM purchased_product_items
  GROUP BY product_id
),
-- User wishlist
user_wishlist AS (
  SELECT product_id
  FROM wishlists
  WHERE user_id = $9 AND ($9::int) IS NOT NULL
),
-- Base filtered products (before category/material/price filters for available options)
base_filtered_products AS (
  SELECT DISTINCT p.id, p.price, p.material
  FROM products p
  WHERE p.is_active = true
    AND p.available_quantity > 0
    -- Search filter only
    AND (
      ($3::text) IS NULL
      OR p.name ILIKE '%' || $3 || '%'
      OR p.description ILIKE '%' || $3 || '%'
    )
),
-- Available categories from base filtered products
available_categories AS (
  SELECT DISTINCT pc.category
  FROM product_categories pc
  WHERE EXISTS (SELECT 1 FROM base_filtered_products bf WHERE bf.id = pc.product_id)
),
-- Available materials from base filtered products
available_materials AS (
  SELECT DISTINCT bf.material
  FROM base_filtered_products bf
),
-- Price range from base filtered products
price_range AS (
  SELECT
    MIN(bf.price) AS min_available_price,
    MAX(bf.price) AS max_available_price
  FROM base_filtered_products bf
),
-- Fully filtered products (with all filters applied)
filtered_products AS (
  SELECT DISTINCT p.id
  FROM products p
  LEFT JOIN product_categories pc ON p.id = pc.product_id
  WHERE p.is_active = true
    AND p.available_quantity > 0
    -- Search filter
    AND (
      ($3::text) IS NULL
      OR p.name ILIKE '%' || $3 || '%'
      OR p.description ILIKE '%' || $3 || '%'
    )
    -- Categories filter (comma-separated string)
    AND (
      ($4::text) IS NULL
      OR pc.category = ANY(string_to_array($4, ','))
    )
    -- Materials filter (comma-separated string)
    AND (
      ($5::text) IS NULL
      OR p.material = ANY(string_to_array($5, ','))
    )
    -- Price range filters
    AND (($6::int) IS NULL OR p.price >= $6)
    AND (($7::int) IS NULL OR p.price <= $7)
),
-- Count total products
total_count AS (
  SELECT COUNT(*) AS total FROM filtered_products
),
-- Aggregate available filter options
filter_options AS (
  SELECT
    (SELECT jsonb_agg(category ORDER BY category) FROM available_categories) AS available_categories,
    (SELECT jsonb_agg(material ORDER BY material) FROM available_materials) AS available_materials,
    (SELECT min_available_price FROM price_range) AS min_available_price,
    (SELECT max_available_price FROM price_range) AS max_available_price
),
-- Products with all data
products_with_data AS (
  SELECT
    p.id,
    p.slug,
    p.name,
    p.color_code,
    p.color_name,
    p.material,
    p.total_quantity,
    p.available_quantity,
    p.price,
    COALESCE(p.image_urls, '{}'::text[]) AS image_urls,
    p.created_at,
    p.updated_at,
    COALESCE(uw.product_id IS NOT NULL, false) AS in_wishlist,
    COALESCE(ps.avg_rating, 0) AS avg_rating,
    COALESCE(ps.reviews_count, 0) AS reviews_count,
    COALESCE(bs.purchase_count, 0) AS purchase_count,
    COALESCE(pc_agg.categories, '[]'::jsonb) AS categories
  FROM products p
  INNER JOIN filtered_products fp ON p.id = fp.id
  LEFT JOIN product_stats ps ON p.id = ps.product_id
  LEFT JOIN best_sellers bs ON p.id = bs.product_id
  LEFT JOIN user_wishlist uw ON p.id = uw.product_id
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object('id', pc.id, 'category', pc.category)) AS categories
    FROM product_categories pc
    WHERE pc.product_id = p.id
  ) pc_agg ON true
)
SELECT
  pwd.id,
  pwd.slug,
  pwd.name,
  pwd.color_code,
  pwd.color_name,
  pwd.material,
  pwd.total_quantity,
  pwd.available_quantity,
  pwd.price,
  pwd.image_urls,
  pwd.created_at,
  pwd.updated_at,
  pwd.in_wishlist,
  pwd.avg_rating,
  pwd.reviews_count,
  pwd.categories,
  tc.total AS total_count,
  fo.available_categories,
  fo.available_materials,
  fo.min_available_price,
  fo.max_available_price
FROM products_with_data pwd
CROSS JOIN total_count tc
CROSS JOIN filter_options fo
ORDER BY
  CASE WHEN $8 = 'featured' THEN pwd.purchase_count END DESC NULLS LAST,
  CASE WHEN $8 = 'featured' THEN pwd.avg_rating END DESC NULLS LAST,
  CASE WHEN $8 = 'new' THEN pwd.created_at END DESC NULLS LAST,
  CASE WHEN $8 = 'price_low_to_high' THEN pwd.price END ASC NULLS LAST,
  CASE WHEN $8 = 'price_high_to_low' THEN pwd.price END DESC NULLS LAST,
  CASE WHEN $8 = 'rating_high_to_low' THEN pwd.avg_rating END DESC NULLS LAST,
  CASE WHEN $8 = 'rating_low_to_high' THEN pwd.avg_rating END ASC NULLS LAST,
  -- Default fallback: featured (purchase_count + avg_rating)
  CASE WHEN $8 IS NULL OR $8 NOT IN ('featured', 'new', 'price_low_to_high', 'price_high_to_low', 'rating_high_to_low', 'rating_low_to_high')
    THEN pwd.purchase_count END DESC NULLS LAST,
  CASE WHEN $8 IS NULL OR $8 NOT IN ('featured', 'new', 'price_low_to_high', 'price_high_to_low', 'rating_high_to_low', 'rating_low_to_high')
    THEN pwd.avg_rating END DESC NULLS LAST,
  pwd.id ASC
LIMIT $1
OFFSET $2;
