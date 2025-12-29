-- @param {Int} $1:limit The maximum number of products to return
-- @param {Int} $2:userId? The user ID for personalization (nullable)

WITH
-- User's interacted products
user_interacted_products AS (
  SELECT DISTINCT product_id
  FROM (
    SELECT product_id FROM carts WHERE user_id = $2
    UNION ALL
    SELECT product_id FROM wishlists WHERE user_id = $2
    UNION ALL
    SELECT ppi.product_id
    FROM purchased_product_items ppi
    WHERE EXISTS (
      SELECT 1 FROM product_orders po
      WHERE po.id = ppi.order_id AND po.user_id = $2
    )
  ) AS user_products
  WHERE ($2::int) IS NOT NULL
),
-- Best sellers
best_sellers AS (
  SELECT product_id, COUNT(*) AS purchase_count
  FROM purchased_product_items
  GROUP BY product_id
  ORDER BY purchase_count DESC
  LIMIT $1 * 3
),
-- Product stats (single scan of reviews table)
product_stats AS (
  SELECT
    product_id,
    AVG(rating)::numeric(3,2) AS avg_rating,
    COUNT(*) AS reviews_count
  FROM reviews
  WHERE product_id IS NOT NULL
  GROUP BY product_id
),
-- Top rated products (derived from product_stats)
top_rated AS (
  SELECT product_id, avg_rating
  FROM product_stats
  WHERE avg_rating > 4
  ORDER BY avg_rating DESC
  LIMIT $1 * 3
),
-- User's preferred categories (from interacted products)
user_categories AS (
  SELECT DISTINCT pc.category
  FROM product_categories pc
  WHERE ($2::int) IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_interacted_products uip
      WHERE uip.product_id = pc.product_id
    )
),
-- Priority 1: User's personalized recommendations
user_recommendations AS (
  SELECT DISTINCT pc.product_id
  FROM product_categories pc
  WHERE ($2::int) IS NOT NULL
    AND EXISTS (SELECT 1 FROM user_categories uc WHERE uc.category = pc.category)
    AND NOT EXISTS (SELECT 1 FROM user_interacted_products uip WHERE uip.product_id = pc.product_id)
    AND EXISTS (SELECT 1 FROM products p WHERE p.id = pc.product_id AND p.is_active = true)
  LIMIT $1 * 3
),
-- User's wishlisted products (for exclusion)
user_wishlist AS (
  SELECT product_id
  FROM wishlists
  WHERE user_id = $2 AND ($2::int) IS NOT NULL
),

-- Available products (for exclusion)
available_products AS (
  SELECT id AS product_id
  FROM products
  WHERE available_quantity > 0
),

-- Priority 5: Fallback active products
fallback_products AS (
  SELECT id AS product_id
  FROM products p
  WHERE p.is_active = true
    AND NOT EXISTS (SELECT 1 FROM user_wishlist uw WHERE uw.product_id = p.id)
    AND EXISTS (SELECT 1 FROM available_products ap WHERE ap.product_id = p.id)
  ORDER BY p.created_at DESC
  LIMIT $1 * 2
),
-- Collect all candidate products with priorities (excluding wishlisted products)
candidate_products AS (
  -- Priority 1: user_recommendations already excludes interacted products (including wishlist)
  SELECT product_id, 1 AS priority FROM user_recommendations
  UNION ALL
  -- Priority 2: Best sellers that are also top rated
  SELECT bs.product_id, 2 AS priority
  FROM best_sellers bs
  WHERE EXISTS (SELECT 1 FROM top_rated tr WHERE tr.product_id = bs.product_id)
    AND NOT EXISTS (SELECT 1 FROM user_wishlist uw WHERE uw.product_id = bs.product_id) 
    AND EXISTS (SELECT 1 FROM available_products ap WHERE ap.product_id = bs.product_id)
  UNION ALL
  -- Priority 3: Best sellers
  SELECT bs.product_id, 3 AS priority
  FROM best_sellers bs
  WHERE NOT EXISTS (SELECT 1 FROM user_wishlist uw WHERE uw.product_id = bs.product_id )
    AND EXISTS (SELECT 1 FROM available_products ap WHERE ap.product_id = bs.product_id)
  UNION ALL
  -- Priority 4: Top rated
  SELECT tr.product_id, 4 AS priority
  FROM top_rated tr
  WHERE NOT EXISTS (SELECT 1 FROM user_wishlist uw WHERE uw.product_id = tr.product_id)
    AND EXISTS (SELECT 1 FROM available_products ap WHERE ap.product_id = tr.product_id)
  UNION ALL
  -- Priority 5: Fallback (already filtered)
  SELECT fp.product_id, 5 AS priority FROM fallback_products fp
  WHERE EXISTS (SELECT 1 FROM available_products ap WHERE ap.product_id = fp.product_id)
),
-- Deduplicate keeping highest priority per product
ranked_products AS (
  SELECT
    cp.product_id,
    cp.priority,
    uw.product_id IS NOT NULL AS in_wishlist,
    COALESCE(bs.purchase_count, 0) AS purchase_count,
    COALESCE(ps.avg_rating, 0) AS avg_rating,
    COALESCE(ps.reviews_count, 0) AS reviews_count,
    ROW_NUMBER() OVER (
      PARTITION BY cp.product_id
      ORDER BY cp.priority, COALESCE(bs.purchase_count, 0) DESC, COALESCE(ps.avg_rating, 0) DESC
    ) AS rn
  FROM candidate_products cp
  LEFT JOIN best_sellers bs ON cp.product_id = bs.product_id
  LEFT JOIN product_stats ps ON cp.product_id = ps.product_id
  LEFT JOIN user_wishlist uw ON cp.product_id = uw.product_id
)
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
  COALESCE(rp.in_wishlist, false) AS in_wishlist,
  COALESCE(rp.avg_rating, 0) AS avg_rating,
  COALESCE(rp.reviews_count, 0) AS reviews_count,
  COALESCE(pc_agg.categories, '[]'::jsonb) AS categories
FROM products p
INNER JOIN ranked_products rp ON p.id = rp.product_id AND rp.rn = 1
LEFT JOIN LATERAL (
  SELECT jsonb_agg(jsonb_build_object('id', pc.id, 'category', pc.category)) AS categories
  FROM product_categories pc
  WHERE pc.product_id = p.id
) pc_agg ON true
WHERE p.is_active = true AND p.available_quantity > 0
ORDER BY rp.priority, rp.purchase_count DESC, rp.avg_rating DESC
LIMIT $1 * 3;