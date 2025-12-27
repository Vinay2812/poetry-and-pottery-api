/* prisma/seed.ts */
import {
  EventLevel,
  EventStatus,
  OrderStatus,
  UserRole,
} from "@/prisma/generated/client";

import { PEXELS_API_KEY } from "../consts/env";
import { prisma } from "./prisma";

if (!PEXELS_API_KEY) {
  throw new Error("Missing PEXELS_API_KEY in environment");
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]) {
  return arr[randInt(0, arr.length - 1)];
}
function pickManyUnique<T>(arr: T[], count: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < count && copy.length) {
    const i = randInt(0, copy.length - 1);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

type PexelsPhoto = {
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
};

async function fetchPexelsImages(opts: {
  query: string;
  perPage?: number;
  orientation?: "landscape" | "portrait" | "square";
  size?: "large" | "large2x" | "medium" | "small" | "original";
}): Promise<string[]> {
  const perPage = opts.perPage ?? 80; // max 80 for Pexels
  const orientation = opts.orientation ?? "square";
  const size = opts.size ?? "large";

  const url =
    `https://api.pexels.com/v1/search?` +
    `query=${encodeURIComponent(opts.query)}` +
    `&per_page=${perPage}` +
    `&orientation=${orientation}`;

  const res = await fetch(url, {
    headers: { Authorization: PEXELS_API_KEY! },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Pexels API error (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { photos: PexelsPhoto[] };
  const photos = data?.photos ?? [];
  if (photos.length === 0) {
    throw new Error(`Pexels returned 0 photos for query: ${opts.query}`);
  }

  return photos
    .map((p) => p?.src?.[size])
    .filter((u): u is string => Boolean(u));
}

async function allTablesEmptyOrExit() {
  const checks = await prisma.$transaction([
    prisma.user.count(),
    prisma.userAddress.count(),
    prisma.product.count(),
    prisma.productCategory.count(),
    prisma.event.count(),
    prisma.eventRegistration.count(),
    prisma.review.count(),
    prisma.reviewLike.count(),
    prisma.wishlist.count(),
    prisma.cart.count(),
    prisma.productOrder.count(),
    prisma.purchasedProductItem.count(),
  ]);

  const anyHasData = checks.some((c) => c > 0);
  if (anyHasData) {
    console.log("Seed skipped: at least one table already has data.");
    process.exit(0);
  }
}

async function main() {
  await allTablesEmptyOrExit();

  const N = 500;
  const CAPPED_N = 30;

  // -----------------------------
  // Fetch PEXELS image pools (separately)
  // -----------------------------
  console.log("Fetching images from Pexels...");

  const [USER_IMAGES, PRODUCT_IMAGES, EVENT_IMAGES] = await Promise.all([
    fetchPexelsImages({
      query: "professional portrait profile",
      orientation: "portrait",
      size: "original",
      perPage: 50,
    }),
    fetchPexelsImages({
      query: "pottery handmade mug vase cup plate",
      orientation: "square",
      size: "original",
      perPage: 5000,
    }),
    fetchPexelsImages({
      query: "pottery handmade clay workshop",
      orientation: "landscape",
      size: "original",
      perPage: 5000,
    }),
  ]);

  console.log(
    `Images fetched -> users: ${USER_IMAGES.length}, products: ${PRODUCT_IMAGES.length}, events: ${EVENT_IMAGES.length}`,
  );

  // -----------------------------
  // USERS (10, with 1 admin)
  // -----------------------------
  const users = [
    {
      auth_id: "auth_vinay_0001",
      email: "vinaysarda2812@gmail.com",
      phone: "+919900000001",
      name: "Vinay Sarda",
      role: UserRole.ADMIN,
    },
    {
      auth_id: "auth_user_0002",
      email: "aarya.shah@example.com",
      phone: "+919900000002",
      name: "Aarya Shah",
      role: UserRole.USER,
    },
    {
      auth_id: "auth_user_0003",
      email: "rohan.mehta@example.com",
      phone: "+919900000003",
      name: "Rohan Mehta",
      role: UserRole.USER,
    },
    {
      auth_id: "auth_user_0004",
      email: "isha.kapoor@example.com",
      phone: "+919900000004",
      name: "Isha Kapoor",
      role: UserRole.USER,
    },
    {
      auth_id: "auth_user_0005",
      email: "kabir.jain@example.com",
      phone: "+919900000005",
      name: "Kabir Jain",
      role: UserRole.USER,
    },
    {
      auth_id: "auth_user_0006",
      email: "neha.iyer@example.com",
      phone: "+919900000006",
      name: "Neha Iyer",
      role: UserRole.USER,
    },
    {
      auth_id: "auth_user_0007",
      email: "aditya.verma@example.com",
      phone: "+919900000007",
      name: "Aditya Verma",
      role: UserRole.USER,
    },
    {
      auth_id: "auth_user_0008",
      email: "sana.khan@example.com",
      phone: "+919900000008",
      name: "Sana Khan",
      role: UserRole.USER,
    },
    {
      auth_id: "auth_user_0009",
      email: "manav.singh@example.com",
      phone: "+919900000009",
      name: "Manav Singh",
      role: UserRole.USER,
    },
    {
      auth_id: "auth_user_0010",
      email: "priya.nair@example.com",
      phone: "+919900000010",
      name: "Priya Nair",
      role: UserRole.USER,
    },
  ];

  await prisma.$transaction(
    async (prisma) => {
      const createdUsers = await prisma.user.createMany({
        data: users.map((u) => ({
          auth_id: u.auth_id,
          email: u.email,
          phone: u.phone ?? null,
          name: u.name ?? null,
          image: pick(USER_IMAGES),
          role: u.role,
        })),
      });
      console.log(`Inserted users: ${createdUsers.count}`);

      const dbUsers = await prisma.user.findMany({ orderBy: { id: "asc" } });

      // -----------------------------
      // PRODUCTS (100)
      // -----------------------------
      const productNames = [
        "Terracotta Tea Cup",
        "Hand-thrown Mug",
        "Glazed Dinner Plate",
        "Minimal Vase",
        "Speckled Bowl",
        "Ramen Bowl",
        "Planter Pot",
        "Ceramic Tumbler",
        "Incense Holder",
        "Soap Dish",
        "Serving Platter",
        "Oil Pourer",
        "Espresso Cup",
        "Sculpted Vase",
        "Berry Bowl",
        "Snack Plate",
      ];

      const materials = [
        "Stoneware",
        "Porcelain",
        "Earthenware",
        "Terracotta",
        "Ceramic",
      ];
      const colors = [
        { code: "#F2E9DC", name: "Sand" },
        { code: "#E8D5C4", name: "Blush Clay" },
        { code: "#C7D3D4", name: "Mist" },
        { code: "#2F3E46", name: "Charcoal" },
        { code: "#A3B18A", name: "Sage" },
        { code: "#588157", name: "Forest Green" },
        { code: "#3A5A40", name: "Dark Olive" },
        { code: "#223323", name: "Charcoal Gray" },
        { code: "#1F2937", name: "Jet Black" },
        { code: "#4B5563", name: "Storm Gray" },
        { code: "#6B7280", name: "Slate Gray" },
        { code: "#9CA3AF", name: "Cloud Gray" },
        { code: "#D1D5DB", name: "Light Gray" },
      ];

      const instructionsPool = [
        "Do not use in dishwasher",
        "Handwash recommended",
        "Dishwasher safe (top rack)",
        "Microwave safe",
        "Avoid sudden temperature changes",
        "Do not use abrasive scrubbers",
        "Do not use in microwave",
        "Avoid microwave oven",
      ];

      const productData = Array.from({ length: N }).map((_, i) => {
        const c = pick(colors);
        const name = `${pick(productNames)} #${i + 1}`;
        const total = randInt(10, 200);
        const available = randInt(0, total);
        const price = randInt(299, 4999);

        const slug = `product-${i + 1}-${name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")}`;

        const imageUrlsCount = randInt(2, 5);
        const imageUrls = pickManyUnique(PRODUCT_IMAGES, imageUrlsCount);

        return {
          slug,
          name,
          description: `Handcrafted ${pick(
            materials,
          )} piece made for everyday use. Each item is unique with subtle variations.`,
          instructions: pickManyUnique(instructionsPool, randInt(2, 4)),
          color_code: c.code,
          color_name: c.name,
          material: pick(materials),
          total_quantity: total,
          available_quantity: available,
          is_active: true,
          price,
          image_urls: imageUrls,
        };
      });

      const createdProducts = await prisma.product.createMany({
        data: productData,
      });
      console.log(`Inserted products: ${createdProducts.count}`);

      const dbProducts = await prisma.product.findMany({
        select: { id: true },
      });

      // -----------------------------
      // PRODUCT CATEGORIES (100)
      // -----------------------------
      const categories = [
        "Mugs",
        "Plates",
        "Bowls",
        "Vases",
        "Planters",
        "Accessories",
        "Serveware",
      ];
      const productCategoryRows = Array.from({ length: N }).map(() => ({
        product_id: pick(dbProducts).id,
        category: pick(categories),
      }));

      const pcSet = new Set<string>();
      const productCategories: { product_id: number; category: string }[] = [];
      for (const r of productCategoryRows) {
        const k = `${r.product_id}::${r.category}`;
        if (!pcSet.has(k)) {
          pcSet.add(k);
          productCategories.push(r);
        }
        if (productCategories.length >= N) break;
      }

      const createdProductCategories = await prisma.productCategory.createMany({
        data: productCategories,
      });
      console.log(
        `Inserted productCategories: ${createdProductCategories.count}`,
      );

      // -----------------------------
      // EVENTS (100)
      // -----------------------------
      const instructors = [
        "Meera",
        "Kunal",
        "Aditi",
        "Arjun",
        "Sanya",
        "Nikhil",
        "Riya",
      ];
      const locations = [
        "Mumbai Studio",
        "Pune Workshop",
        "Bengaluru Clay Lab",
        "Delhi Art Space",
        "Jaipur Craft Hub",
      ];

      const fullLocations = [
        "Mumbai Studio, Mumbai, Maharashtra, India",
        "Pune Workshop, Pune, Maharashtra, India",
        "Bengaluru Clay Lab, Bengaluru, Karnataka, India",
        "Delhi Art Space, Delhi, Delhi, India",
        "Jaipur Craft Hub, Jaipur, Rajasthan, India",
      ];

      const eventTitles = [
        "Wheel Throwing Basics",
        "Glazing 101",
        "Handbuilding Masterclass",
        "Porcelain Techniques",
        "Functional Ceramics",
        "Surface Decoration",
        "Electric Kiln Firing",
        "Studio Practice",
      ];

      const descriptions = [
        "Learn fundamental wheel throwing techniques and create your first bowl or mug. Perfect for complete beginners eager to explore the potter's wheel.",
        "Master the art of glazing with hands-on practice using various firing techniques and color combinations. Discover how to achieve professional-quality finishes.",
        "Explore pinch, coil, and slab building methods to create sculptural forms. Build confidence in hand-sculpting and develop your unique artistic style.",
        "A advanced session on how to use the electric kiln to fire your pottery. You will learn how to use the electric kiln to fire your pottery and how to achieve professional-quality finishes.",
        "Dive deep into porcelain working with advanced shaping and surface manipulation. This intermediate session covers delicate techniques for fine ceramics.",
        "Create functional pieces designed for everyday use. Learn how to balance aesthetics with durability in your pottery creations.",
        "Discover surface techniques including carving, stamping, and texture application. Transform your pieces with creative decorative methods and patterns.",
        "Join an open studio session with guidance from our instructor. Work on your ongoing projects with personalized feedback and creative support.",
        "Learn the basics of pottery and create your first piece. Perfect for complete beginners eager to explore the potter's wheel.",
      ];

      const includedItems = [
        ["Clay (5kg)", "All hand tools", "Firing included", "Apron provided"],
        ["Premium glazes", "Brush sets", "Kiln access", "Sample palette"],
        [
          "Natural clay",
          "Sculpting tools",
          "Air-dry materials",
          "Firing (1st piece)",
        ],
        [
          "Electric kiln",
          "All hand tools",
          "Firing included",
          "Apron provided",
        ],
        [
          "Fine porcelain",
          "Specialized tools",
          "Texture tools",
          "1 kiln firing",
        ],
        [
          "Stoneware clay",
          "Functional forms guide",
          "Tools",
          "Glazing session",
        ],
        ["Ceramic clay", "Functional forms guide", "Tools", "Glazing session"],
        [
          "Decorating tools",
          "Glaze samples",
          "Stamps and textures",
          "Finishing supplies",
        ],
        [
          "Studio materials",
          "Your choice of clay",
          "All equipment",
          "2 hour studio time",
        ],
        [
          "All equipment",
          "2 hour studio time",
          "Studio materials",
          "Take-home guidance",
        ],
      ];

      const highlightsItems = [
        "Live demo",
        "Hands-on practice",
        "Take-home guidance",
        "Fire your pottery",
        "Learn how to use the electric kiln",
        "Learn how to achieve professional-quality finishes",
        "Functional ceramics",
        "Learn how to balance aesthetics with durability in your pottery creations",
        "Surface decoration",
        "Studio practice",
        "open studio session",
        "Personalized feedback",
        "Create your first piece",
        "Creative support",
      ];

      const now = new Date();
      const eventsData = Array.from({ length: CAPPED_N }).map((_, i) => {
        // Date range: -30 days to +70 days from now
        const daysOffset = randInt(-30, 70);
        const starts = new Date(
          now.getTime() + daysOffset * 24 * 60 * 60 * 1000,
        );
        // Time between 10 AM (10) and 7 PM (19)
        starts.setHours(randInt(10, 19), 0, 0, 0);
        // Duration: 1 to 4 hours (max 4 hours)
        const ends = new Date(
          starts.getTime() + randInt(1, 4) * 60 * 60 * 1000,
        );

        const total_seats = randInt(8, 24);
        const available_seats = randInt(0, total_seats);
        const highlights = pickManyUnique(highlightsItems, randInt(2, 5));
        const gallery = pickManyUnique(
          [...EVENT_IMAGES, ...PRODUCT_IMAGES],
          randInt(2, 6),
        );
        const status = pick([EventStatus.ACTIVE, EventStatus.UPCOMING]);
        const level = pick([
          EventLevel.BEGINNER,
          EventLevel.INTERMEDIATE,
          EventLevel.ADVANCED,
        ]);

        const locationIndex = randInt(0, locations.length - 1);
        const location = locations[locationIndex];
        const fullLocation = fullLocations[locationIndex];

        return {
          slug: `event-${i + 1}-${pick(eventTitles)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")}`,
          title: `${pick(eventTitles)} #${i + 1}`,
          description: pick(descriptions),
          starts_at: starts,
          ends_at: ends,
          location: location,
          full_location: fullLocation,
          total_seats,
          available_seats,
          instructor: pick(instructors),
          includes: pick(includedItems),
          price: randInt(499, 7999),
          image: pick(EVENT_IMAGES),
          highlights: highlights,
          gallery: gallery,
          status: status,
          level: level,
        };
      });

      const createdEvents = await prisma.event.createMany({ data: eventsData });
      console.log(`Inserted events: ${createdEvents.count}`);

      const dbEvents = await prisma.event.findMany({
        select: { id: true, price: true },
      });

      // -----------------------------
      // USER ADDRESSES (100)
      // -----------------------------
      const cities = [
        { city: "Mumbai", state: "Maharashtra", zip: "400001" },
        { city: "Pune", state: "Maharashtra", zip: "411001" },
        { city: "Bengaluru", state: "Karnataka", zip: "560001" },
        { city: "Delhi", state: "Delhi", zip: "110001" },
        { city: "Jaipur", state: "Rajasthan", zip: "302001" },
      ];

      const addressData = Array.from({ length: CAPPED_N }).map((_, i) => {
        const cs = pick(cities);
        const u = pick(dbUsers);
        return {
          user_id: u.id,
          address_line_1: `${randInt(1, 999)}, ${pick([
            "Clay Street",
            "Kiln Road",
            "Studio Lane",
            "Glaze Avenue",
          ])}`,
          address_line_2:
            pick([
              "Near Market",
              "Opp. Park",
              "Above Cafe",
              "Next to Metro",
              "",
            ]) || null,
          landmark:
            pick([
              "Community Center",
              "Main Circle",
              "Riverfront",
              "Art Gallery",
              "",
            ]) || null,
          city: cs.city,
          state: cs.state,
          zip: cs.zip,
          contact_number: u.phone ?? null,
          name: u.name ?? `User ${i + 1}`,
        };
      });

      const createdAddresses = await prisma.userAddress.createMany({
        data: addressData,
      });
      console.log(`Inserted userAddresses: ${createdAddresses.count}`);

      // -----------------------------
      // CARTS + WISHLISTS (100 each)
      // -----------------------------
      const makeUniquePairs = (count: number) => {
        const set = new Set<string>();
        const pairs: { user_id: number; product_id: number }[] = [];
        while (pairs.length < count) {
          const u = pick(dbUsers).id;
          const p = pick(dbProducts).id;
          const k = `${u}::${p}`;
          if (!set.has(k)) {
            set.add(k);
            pairs.push({ user_id: u, product_id: p });
          }
        }
        return pairs;
      };

      const wishlistPairs = makeUniquePairs(N);
      const cartPairs = makeUniquePairs(CAPPED_N);

      const createdWishlists = await prisma.wishlist.createMany({
        data: wishlistPairs,
      });
      console.log(`Inserted wishlists: ${createdWishlists.count}`);

      const createdCarts = await prisma.cart.createMany({
        data: cartPairs.map((x) => ({ ...x, quantity: randInt(1, 5) })),
      });
      console.log(`Inserted carts: ${createdCarts.count}`);

      // -----------------------------
      // PRODUCT ORDERS (100) + PURCHASED ITEMS (100)
      // -----------------------------
      const orderStatuses = [
        OrderStatus.PROCESSING,
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
        OrderStatus.CANCELLED,
        OrderStatus.RETURNED,
        OrderStatus.REFUNDED,
      ];

      const dbAddresses = await prisma.userAddress.findMany({
        select: { id: true, user_id: true },
      });

      const purchasedItemSet = new Set<string>(); // orderId::productId
      let purchasedCount = 0;

      for (let i = 0; i < CAPPED_N; i++) {
        const u = pick(dbUsers);
        const addr =
          pick(dbAddresses.filter((a) => a.user_id === u.id)) ??
          pick(dbAddresses);

        const shipping_fee = randInt(0, 250);
        const subtotal = randInt(499, 12000);
        const total = subtotal + shipping_fee;
        const status = pick(orderStatuses);

        const order = await prisma.productOrder.create({
          data: {
            user_id: u.id,
            shipping_fee,
            subtotal,
            total,
            status,
            shipped_at:
              status === OrderStatus.SHIPPED || status === OrderStatus.DELIVERED
                ? new Date()
                : null,
            delivered_at: status === OrderStatus.DELIVERED ? new Date() : null,
            cancelled_at: status === OrderStatus.CANCELLED ? new Date() : null,
            returned_at: status === OrderStatus.RETURNED ? new Date() : null,
            refunded_at: status === OrderStatus.REFUNDED ? new Date() : null,
            shipping_address: { userAddressId: addr.id },
          },
        });

        if (purchasedCount < CAPPED_N) {
          let tries = 0;
          while (tries++ < 50) {
            const prod = pick(dbProducts).id;
            const key = `${order.id}::${prod}`;
            if (purchasedItemSet.has(key)) continue;
            purchasedItemSet.add(key);

            await prisma.purchasedProductItem.create({
              data: {
                order_id: order.id,
                product_id: prod,
                quantity: randInt(1, 4),
                price: randInt(299, 4999),
              },
            });
            purchasedCount++;
            break;
          }
        }
      }

      console.log(`Inserted productOrders: ${CAPPED_N}`);
      console.log(`Inserted purchasedProductItems: ${purchasedCount}`);

      // -----------------------------
      // EVENT REGISTRATIONS (20)
      // -----------------------------
      const regSet = new Set<string>();
      const regs: {
        event_id: string;
        user_id: number;
        seats_reserved: number;
        price: number;
      }[] = [];
      while (regs.length < CAPPED_N) {
        const e = pick(dbEvents);
        const u = pick(dbUsers);
        const k = `${e.id}::${u.id}`;
        if (regSet.has(k)) continue;
        regSet.add(k);
        regs.push({
          event_id: e.id,
          user_id: u.id,
          seats_reserved: randInt(1, 3),
          price: e.price,
        });
      }
      const createdRegs = await prisma.eventRegistration.createMany({
        data: regs,
      });
      console.log(`Inserted eventRegistrations: ${createdRegs.count}`);

      // -----------------------------
      // REVIEWS (100) (polymorphic)
      // -----------------------------
      const productReviewTexts = [
        "Excellent finish and great weight in the hand.",
        "Loved the glaze, looks even better in person.",
        "Solid craftsmanship, would buy again.",
        "The bowl is perfect for everyday use.",
        "The plate is perfect for everyday use.",
        "The vase is perfect for everyday use.",
        "The planter is perfect for everyday use.",
        "The accessory is perfect for everyday use.",
        "The serveware is perfect for everyday use.",
        "The mug is perfect for everyday use.",
        "The plate is perfect for everyday use.",
        "The vase is perfect for everyday use.",
        "Design is beautiful and functional.",
        "Useful and well made.",
        "Beautiful and unique design.",
        "Well crafted and durable.",
        "Beautiful and unique design.",
      ];

      const eventReviewTexts = [
        "Solid craftsmanship, would buy again.",
        "Great workshop — learned a lot and had fun.",
        "Instructor was clear and helpful throughout.",
        "The workshop was a great experience and I learned a lot.",
        "The instructor was very knowledgeable and the workshop was well organized.",
        "Had a great time and learned a lot.",
        "Workshop was well organized and the instructor was great.",
        "Instructor was knowledgeable and the workshop was well organized.",
        "Had fun while learning and creating something new.",
        "Super fun workshop, highly recommend!",
      ];

      const productReviewSet = new Set<string>(); // productId::userId
      const eventReviewSet = new Set<string>(); // eventId::userId

      const reviews = [];
      while (reviews.length < N) {
        const u = pick(dbUsers);
        const isProduct = Math.random() < 0.6;

        if (isProduct) {
          const p = pick(dbProducts).id;
          const k = `${p}::${u.id}`;
          if (productReviewSet.has(k)) continue;
          productReviewSet.add(k);

          reviews.push({
            user_id: u.id,
            rating: randInt(3, 5),
            review: pick(productReviewTexts),
            image_urls: [pick(PRODUCT_IMAGES), pick(PRODUCT_IMAGES)],
            product_id: p,
            event_id: null,
          });
        } else {
          const e = pick(dbEvents).id;
          const k = `${e}::${u.id}`;
          if (eventReviewSet.has(k)) continue;
          eventReviewSet.add(k);

          reviews.push({
            user_id: u.id,
            rating: randInt(3, 5),
            review: pick(eventReviewTexts),
            image_urls: [pick(EVENT_IMAGES), pick(EVENT_IMAGES)],
            product_id: null,
            event_id: e,
          });
        }
      }

      const createdReviews = await prisma.review.createMany({ data: reviews });
      console.log(`Inserted reviews: ${createdReviews.count}`);

      const dbReviews = await prisma.review.findMany({ select: { id: true } });

      // -----------------------------
      // REVIEW LIKES (100)
      // -----------------------------
      const likeSet = new Set<string>();
      const likes: { review_id: number; user_id: number }[] = [];
      while (likes.length < N) {
        const r = pick(dbReviews).id;
        const u = pick(dbUsers).id;
        const k = `${r}::${u}`;
        if (likeSet.has(k)) continue;
        likeSet.add(k);
        likes.push({ review_id: r, user_id: u });
      }
      const createdLikes = await prisma.reviewLike.createMany({ data: likes });
      console.log(`Inserted reviewLikes: ${createdLikes.count}`);
    },
    {
      timeout: 10000,
    },
  );

  console.log("✅ Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
