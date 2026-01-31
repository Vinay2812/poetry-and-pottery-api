/* seed-open-mic-events.ts - Seeds 10 open mic events */
import { EventStatus, EventType } from "@/prisma/generated/client";

import { PEXELS_API_KEY } from "../consts/env";
import { prisma } from "../lib/prisma";

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
  const perPage = opts.perPage ?? 30;
  const orientation = opts.orientation ?? "landscape";
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

async function main() {
  console.log("Starting open mic events seed...");

  // Check if open mic events already exist
  const existingOpenMicEvents = await prisma.event.count({
    where: { event_type: EventType.OPEN_MIC },
  });

  if (existingOpenMicEvents > 0) {
    console.log(
      `Found ${existingOpenMicEvents} existing open mic events. Skipping seed to preserve data.`,
    );
    console.log("To re-seed, manually delete open mic events first.");
    process.exit(0);
  }

  // Fetch images for open mic events
  console.log("Fetching images from Pexels...");
  const OPEN_MIC_IMAGES = await fetchPexelsImages({
    query: "open mic poetry cafe stage microphone",
    orientation: "landscape",
    size: "original",
    perPage: 30,
  });
  console.log(`Fetched ${OPEN_MIC_IMAGES.length} images.`);

  // Open mic event data
  const openMicTitles = [
    "Poetry & Clay Open Mic Night",
    "Verses & Vases Evening",
    "Spoken Word Saturday",
    "Ceramic Stories Open Mic",
    "Words in Clay",
    "Open Mic: Art & Soul",
    "The Potter's Mic Night",
    "Artisan Voices Open Mic",
    "Clay & Verse Showcase",
    "Studio Sessions Open Mic",
  ];

  const descriptions = [
    "An intimate evening where poetry meets pottery. Share your verses, stories, or songs in our cozy studio space surrounded by handcrafted ceramics. Whether you're a seasoned performer or a first-timer, all voices are welcome.",
    "Join us for a magical night of spoken word and storytelling. Perform your original work or simply enjoy the creative energy of our community. Chai and light refreshments included.",
    "A monthly gathering for poets, storytellers, and dreamers. Our open mic celebrates the connection between words and craft. Sign up to perform or come to listen and be inspired.",
    "Experience the fusion of verbal and visual art at our signature open mic event. Each performer gets 5 minutes to share their craft while surrounded by beautiful pottery creations.",
    "An evening dedicated to the art of expression. Share your poetry, prose, or personal stories in an encouraging, judgment-free space. All skill levels welcome.",
    "Our studio transforms into a cozy performance space for this special open mic night. Come early to explore our gallery before the performances begin.",
    "A celebration of creativity in all its forms. Whether you write haiku or hip-hop, sonnets or slam poetry, there's a place for you on our stage.",
    "Connect with fellow artists and poetry enthusiasts at our monthly open mic. Enjoy performances, make new friends, and discover the vibrant creative community.",
    "An evening where the rhythm of words meets the texture of clay. Perform your work or simply soak in the creative atmosphere of our artisan studio.",
    "The perfect blend of art and literature. Our open mic features local poets, musicians, and storytellers in the unique setting of a working pottery studio.",
  ];

  const locations = [
    "Mumbai Studio",
    "Pune Workshop",
    "Bengaluru Clay Lab",
    "Delhi Art Space",
    "Jaipur Craft Hub",
    "Sangli Studio",
  ];

  const fullLocations = [
    "Mumbai Studio, Mumbai, Maharashtra, India",
    "Pune Workshop, Pune, Maharashtra, India",
    "Bengaluru Clay Lab, Bengaluru, Karnataka, India",
    "Delhi Art Space, Delhi, Delhi, India",
    "Jaipur Craft Hub, Jaipur, Rajasthan, India",
    "Sangli Studio, Sangli, Maharashtra, India",
  ];

  const includedItems = [
    [
      "Stage time (5 mins)",
      "Chai & snacks",
      "Gallery access",
      "Community vibes",
    ],
    ["Open mic slot", "Hot beverages", "Studio tour", "Poetry zine"],
    ["Performance spot", "Refreshments", "Networking time", "Event recording"],
    ["Mic time", "Artisan chai", "Gallery viewing", "Poster keepsake"],
    ["Stage access", "Light bites", "Creative workshop", "Community circle"],
  ];

  const highlightsItems = [
    "Live performances",
    "Intimate setting",
    "Community gathering",
    "Original poetry",
    "Spoken word",
    "Storytelling",
    "Musical interludes",
    "Art gallery access",
    "Networking opportunity",
    "Creative expression",
    "Supportive audience",
    "First-timer friendly",
    "Artisan atmosphere",
    "Chai & conversations",
  ];

  const performerNames = [
    "Akshita Jain",
    "Ananya Sharma",
    "Vikram Iyer",
    "Priya Menon",
    "Rahul Deshmukh",
    "Kavya Nair",
    "Arjun Kapoor",
    "Meera Joshi",
    "Siddharth Rao",
    "Tanvi Kulkarni",
    "Nikhil Agarwal",
    "Riya Sen",
    "Kabir Malhotra",
    "Aditi Verma",
    "Rohan Gupta",
    "Sneha Patel",
  ];

  const lineupNotes = [
    "Sign-ups open at 6 PM. First come, first served!",
    "Pre-registered performers get priority. Walk-ins welcome!",
    "Theme: Love & Loss. All interpretations welcome.",
    "Open theme night - share whatever moves you.",
    "Special feature: Student poetry showcase.",
    "Celebrating women's voices this month.",
    "Multilingual night - perform in any language!",
    "Acoustic instruments welcome for musical pieces.",
    "First-timers night - extra encouragement for newcomers!",
    "Anniversary special - our 12th open mic celebration!",
  ];

  const now = new Date();

  const eventsData = openMicTitles.map((title, i) => {
    // Date range: +7 days to +90 days from now (all upcoming)
    const daysOffset = randInt(7, 90);
    const starts = new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000);
    // Open mic events typically in evening: 6 PM to 8 PM start
    starts.setHours(randInt(18, 20), 0, 0, 0);
    // Duration: 2 to 3 hours
    const ends = new Date(starts.getTime() + randInt(2, 3) * 60 * 60 * 1000);

    const total_seats = randInt(20, 50);
    const available_seats = randInt(5, total_seats);
    const highlights = pickManyUnique(highlightsItems, randInt(4, 6));
    const gallery = pickManyUnique(OPEN_MIC_IMAGES, randInt(3, 5));
    const performers = pickManyUnique(performerNames, randInt(1, 3)); // Max 3 performers

    const locationIndex = randInt(0, locations.length - 1);
    const location = locations[locationIndex];
    const fullLocation = fullLocations[locationIndex];

    const slug = `open-mic-${i + 1}-${title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")}`;

    return {
      slug,
      title,
      description: descriptions[i],
      event_type: EventType.OPEN_MIC,
      starts_at: starts,
      ends_at: ends,
      location,
      full_location: fullLocation,
      total_seats,
      available_seats,
      instructor: null, // Open mic events don't have instructors
      includes: pick(includedItems),
      price: randInt(199, 499), // Lower price than workshops
      image: pick(OPEN_MIC_IMAGES),
      highlights,
      gallery,
      status: EventStatus.UPCOMING,
      level: null, // Open mic events don't have skill levels
      performers,
      lineup_notes: lineupNotes[i],
    };
  });

  const createdEvents = await prisma.event.createMany({ data: eventsData });
  console.log(`\nInserted ${createdEvents.count} open mic events:`);

  // Display created events
  const dbEvents = await prisma.event.findMany({
    where: { event_type: EventType.OPEN_MIC },
    orderBy: { starts_at: "asc" },
    select: {
      title: true,
      location: true,
      starts_at: true,
      total_seats: true,
      available_seats: true,
      price: true,
      performers: true,
    },
  });

  for (const event of dbEvents) {
    const dateStr = event.starts_at.toLocaleDateString("en-IN", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    console.log(
      `  - ${event.title} @ ${event.location} | ${dateStr} | ₹${event.price} | ${event.available_seats}/${event.total_seats} seats | ${event.performers.length} performers`,
    );
  }

  console.log("\n✅ Open mic events seeded successfully.");
}

main()
  .catch((e) => {
    console.error("Error seeding open mic events:", e);
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
 *   bun run src/scripts/seed-open-mic-events.ts
 *
 * Prerequisites:
 *   - The database must be set up and migrated
 *   - PEXELS_API_KEY must be set in environment
 *
 * What this script does:
 *   1. Checks if open mic events exist - if so, exits without changes
 *   2. Fetches images from Pexels for open mic atmosphere
 *   3. Creates 10 open mic events with:
 *      - Unique titles and descriptions
 *      - Random dates (7-90 days in future)
 *      - Evening time slots (6-8 PM start)
 *      - Performer lineups (max 3 performers)
 *      - Lineup notes/themes
 *      - Lower price points than workshops (₹199-499)
 *
 */
