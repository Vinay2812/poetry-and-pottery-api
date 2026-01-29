/* seed-collections.ts - Seeds collections and assigns products to them */
import { Prisma } from "@/prisma/generated/client";

import { prisma } from "../lib/prisma";

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]) {
  return arr[randInt(0, arr.length - 1)];
}

async function main() {
  console.log("Starting collections seed...");

  // Check if collections already exist
  const existingCollections = await prisma.collection.count();
  if (existingCollections > 0) {
    console.log(
      `Found ${existingCollections} existing collections. Skipping seed to preserve data.`,
    );
    console.log("To re-seed, manually delete collections first.");
    process.exit(0);
  }

  // Get all products to assign to collections
  const products = await prisma.product.findMany({
    select: { id: true, name: true, material: true },
  });

  if (products.length === 0) {
    console.log("No products found. Please run the main seed script first.");
    process.exit(1);
  }

  console.log(`Found ${products.length} products to assign to collections.`);

  const now = new Date();

  // Collection image URLs (pottery images from Pexels)
  const collectionImages = [
    "https://images.pexels.com/photos/2162938/pexels-photo-2162938.jpeg",
    "https://images.pexels.com/photos/3094218/pexels-photo-3094218.jpeg",
    "https://images.pexels.com/photos/4207892/pexels-photo-4207892.jpeg",
    "https://images.pexels.com/photos/6941426/pexels-photo-6941426.jpeg",
    "https://images.pexels.com/photos/2424235/pexels-photo-2424235.jpeg",
    "https://images.pexels.com/photos/3680079/pexels-photo-3680079.jpeg",
  ];

  // Define 6 collections with various time windows
  const collectionsData: Prisma.CollectionCreateManyInput[] = [
    {
      slug: "spring-2025",
      name: "Spring 2025 Collection",
      description:
        "Fresh, light pieces inspired by the renewal of spring. Delicate florals and soft pastels that bring warmth to any space.",
      image_url: pick(collectionImages),
      starts_at: new Date("2025-03-01"),
      ends_at: new Date("2025-05-31"),
    },
    {
      slug: "winter-2025",
      name: "Winter 2025 Collection",
      description:
        "Cozy, warm pieces perfect for the cold season. Rich earth tones and textured glazes that evoke fireside comfort.",
      image_url: pick(collectionImages),
      starts_at: new Date("2025-12-01"),
      ends_at: new Date("2026-02-28"),
    },
    {
      slug: "artisan-classics",
      name: "Artisan Classics",
      description:
        "Timeless pottery designs that never go out of style. Handcrafted with traditional techniques passed down through generations.",
      image_url: pick(collectionImages),
      starts_at: null,
      ends_at: null,
    },
    {
      slug: "minimalist-living",
      name: "Minimalist Living",
      description:
        "Clean lines and understated elegance for the modern home. Each piece is designed to complement contemporary spaces.",
      image_url: pick(collectionImages),
      starts_at: null,
      ends_at: null,
    },
    {
      slug: "summer-2026",
      name: "Summer 2026 Collection",
      description:
        "Bright, cheerful pieces perfect for outdoor dining and summer entertaining. Durable yet beautiful.",
      image_url: pick(collectionImages),
      starts_at: new Date("2026-06-01"),
      ends_at: new Date("2026-08-31"),
    },
    {
      slug: "rustic-charm",
      name: "Rustic Charm",
      description:
        "Earthy textures and warm tones that bring countryside warmth to your table. Perfect for cozy gatherings.",
      image_url: pick(collectionImages),
      starts_at: null,
      ends_at: null,
    },
  ];

  // Create collections
  const createdCollections = await prisma.collection.createManyAndReturn({
    data: collectionsData,
  });

  console.log(`Created ${createdCollections.length} collections:`);
  createdCollections.forEach((c) => {
    const status =
      c.ends_at && c.ends_at < now
        ? "(archived)"
        : c.starts_at && c.starts_at > now
          ? "(upcoming)"
          : "(active)";
    console.log(`  - ${c.name} ${status}`);
  });

  // Assign products to collections
  // Each collection gets a random subset of products
  // ~70% of products will be assigned, 30% remain unassigned

  const productIds = products.map((p) => p.id);
  const totalToAssign = Math.floor(productIds.length * 0.7);

  // Shuffle products
  const shuffledProducts = [...productIds].sort(() => Math.random() - 0.5);

  // Take products to assign
  const productsToAssign = shuffledProducts.slice(0, totalToAssign);

  // Distribute products across collections
  let assignedCount = 0;
  const productsPerCollection = Math.ceil(
    productsToAssign.length / createdCollections.length,
  );

  for (let i = 0; i < createdCollections.length; i++) {
    const collection = createdCollections[i];
    const startIdx = i * productsPerCollection;
    const endIdx = Math.min(
      startIdx + productsPerCollection,
      productsToAssign.length,
    );
    const collectionProductIds = productsToAssign.slice(startIdx, endIdx);

    if (collectionProductIds.length === 0) continue;

    await prisma.product.updateMany({
      where: { id: { in: collectionProductIds } },
      data: { collection_id: collection.id },
    });

    assignedCount += collectionProductIds.length;
    console.log(
      `  Assigned ${collectionProductIds.length} products to "${collection.name}"`,
    );
  }

  console.log(`\nTotal products assigned to collections: ${assignedCount}`);
  console.log(
    `Products without collection: ${productIds.length - assignedCount}`,
  );

  // Summary
  console.log("\n--- Collection Summary ---");
  const finalCollections = await prisma.collection.findMany({
    include: {
      _count: {
        select: { products: true },
      },
    },
    orderBy: { name: "asc" },
  });

  for (const c of finalCollections) {
    const status =
      c.ends_at && c.ends_at < now
        ? "ARCHIVED"
        : c.starts_at && c.starts_at > now
          ? "UPCOMING"
          : "ACTIVE";
    console.log(`${c.name}: ${c._count.products} products [${status}]`);
  }

  console.log("\n✅ Collections seeded successfully.");
}

main()
  .catch((e) => {
    console.error("Error seeding collections:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/*
 * ========================================
 * HOW TO RUN THIS SCRIPT
 * ========================================
 *
 * From the poetry-and-pottery-api directory, run:
 *
 *   bun run src/scripts/seed-collections.ts
 *
 * Prerequisites:
 *   - The database must be set up and migrated
 *   - Products must already exist (run the main seed script first: bun run db:init)
 *
 * What this script does:
 *   1. Checks if collections exist - if so, exits without changes
 *   2. Creates 6 collections (Spring 2025, Winter 2025, Summer 2026, Artisan Classics, Minimalist Living, Rustic Charm)
 *   3. Assigns ~70% of products to collections (evenly distributed)
 *   4. Leaves ~30% of products without a collection
 *
 */
