// poetry-and-pottery-api/src/resolvers/admin/settings/seed.ts
import type { ExtendedPrismaClient } from "@/lib/prisma";

import { SITE_CONTENT_DEFAULTS } from "./defaults";

// Idempotent: only inserts a row when the key is missing.
// NEVER overwrites admin edits.
export async function seedSiteContentDefaults(
  prisma: ExtendedPrismaClient,
): Promise<void> {
  const existing = await prisma.siteSetting.findMany({
    where: { key: { in: Object.keys(SITE_CONTENT_DEFAULTS) } },
    select: { key: true },
  });
  const have = new Set(existing.map((r) => r.key));
  const inserts = Object.entries(SITE_CONTENT_DEFAULTS)
    .filter(([key]) => !have.has(key))
    .map(([key, value]) =>
      prisma.siteSetting.create({
        data: { key, value: value as unknown as PrismaJson.SettingValue },
      }),
    );
  if (inserts.length === 0) return;
  await Promise.all(inserts);
  const insertedKeys = Object.keys(SITE_CONTENT_DEFAULTS).filter(
    (k) => !have.has(k),
  );
  console.log(
    `[seed] inserted ${inserts.length} site_setting default(s): ${insertedKeys.join(", ")}`,
  );
}
