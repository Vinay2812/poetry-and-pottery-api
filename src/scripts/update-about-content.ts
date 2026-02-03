// Script to update the About page content with real business information
// Run with: bun run src/scripts/update-about-content.ts
import { prisma } from "../lib/prisma";

const aboutContent: PrismaJson.AboutPageContent = {
  storyTitle: "Where Clay Meets Soul",
  storySubtitle:
    "A journey from curious beginner to passionate potter, guided by clay and poetry.",
  storyContent: [
    "It initially began as a weekend hobby to get away from college stress and stop missing home in a new city, which soon turned into curiosity for knowing all the details about handmade pottery. I didn't choose pottery, pottery chose me.",
    "With a commerce and mass communication background and never having touched clay, it was difficult to find a center when I started my pottery journey. It began with a curious mind to explore just another art form, which turned into a passion for making handmade pieces, just like handwritten notes and poems.",
    "Pottery for me is not just an art form or a way of expressing myself. This art form is my teacher - it has taught me the importance of trusting the process, patience, uncertainty of life and also the beauty of letting go. The learnings are endless.",
    "I am not a potter, I am a student of pottery and will be forever.",
  ],
  values: [
    {
      icon: "leaf",
      title: "Trust the Process",
      description:
        "Every piece of pottery teaches patience. From wedging clay to the final glaze, we embrace the journey and let the clay guide us.",
    },
    {
      icon: "heart",
      title: "Handmade with Heart",
      description:
        "Each piece is shaped by hand, carrying subtle variations that make it unique - just like handwritten notes and poems.",
    },
    {
      icon: "sparkles",
      title: "The Beauty of Letting Go",
      description:
        "Pottery teaches us to embrace uncertainty and find beauty in imperfection. Not every piece survives the kiln, and that's part of the art.",
    },
  ],
  team: [
    {
      name: "Poetry & Pottery",
      role: "Founder & Potter",
      image:
        "https://images.pexels.com/photos/3094208/pexels-photo-3094208.jpeg?auto=compress&cs=tinysrgb&w=400",
      bio: "Inspired by master Mr. Sandeep Manchekar Sir, creating abstract and asymmetrical pieces with unique glaze combinations. Fusing poetry and pottery - because every hand that shapes has its own story.",
    },
  ],
  processSteps: [
    {
      step: "1",
      title: "Wedging the Clay",
      description:
        "Preparing the clay by removing air bubbles and ensuring consistent texture for shaping.",
    },
    {
      step: "2",
      title: "Shaping",
      description:
        "Using handbuilding and wheel throwing methods to create functional, decorative, and abstract pieces.",
    },
    {
      step: "3",
      title: "Drying & Firing",
      description:
        "Carefully drying the pieces before the first bisque firing in the kiln.",
    },
    {
      step: "4",
      title: "Glazing",
      description:
        "Applying unique glaze combinations - the touch that makes each piece stand out.",
    },
  ],
};

async function main() {
  console.log("Updating About page content...");

  const result = await prisma.contentPage.upsert({
    where: { slug: "about" },
    update: {
      content: aboutContent,
      updated_at: new Date(),
    },
    create: {
      slug: "about",
      title: "About Us",
      content: aboutContent,
      is_active: true,
    },
  });

  console.log(`✅ About page content updated (ID: ${result.id})`);
}

main()
  .catch((e) => {
    console.error("Error updating content:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
