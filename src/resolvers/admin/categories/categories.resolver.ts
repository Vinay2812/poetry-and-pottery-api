import { Arg, Ctx, Mutation, Query, Resolver } from "type-graphql";

import { adminRequired } from "@/middlewares/auth.middleware";
import { Context } from "@/types/context";
import { tryCatchAsync } from "@/utils/trycatch";

import {
  AdminCategoriesResponse,
  AdminCategory,
  AdminCategoryConfig,
  AdminCategoryMutationResponse,
  AdminIconOption,
} from "./categories.type";

// Default icons for common categories
const DEFAULT_CATEGORY_ICONS: Record<string, string> = {
  bowls: "bowl",
  mugs: "coffee",
  plates: "plate",
  vases: "flower",
  planters: "plant",
  decor: "home",
  gifts: "gift",
  kitchenware: "utensils",
  serveware: "serving",
  art: "palette",
};

// Site setting key for category configuration
const CATEGORY_CONFIG_KEY = "category_icons";

async function getCategoryIconConfig(
  ctx: Context,
): Promise<Record<string, string>> {
  const setting = await ctx.prisma.siteSetting.findUnique({
    where: { key: CATEGORY_CONFIG_KEY },
  });

  if (setting && typeof setting.value === "object" && setting.value !== null) {
    return setting.value as Record<string, string>;
  }

  return {};
}

async function saveCategoryIconConfig(
  ctx: Context,
  config: Record<string, string>,
): Promise<void> {
  await ctx.prisma.siteSetting.upsert({
    where: { key: CATEGORY_CONFIG_KEY },
    create: { key: CATEGORY_CONFIG_KEY, value: config },
    update: { value: config },
  });
}

@Resolver()
export class AdminCategoriesResolver {
  @Query(() => AdminCategoriesResponse)
  @adminRequired()
  async adminCategories(@Ctx() ctx: Context): Promise<AdminCategoriesResponse> {
    return tryCatchAsync(async () => {
      // Get all unique categories with product counts
      const categoryData = await ctx.prisma.productCategory.groupBy({
        by: ["category"],
        _count: { category: true },
        orderBy: { category: "asc" },
      });

      // Get icon config
      const iconConfig = await getCategoryIconConfig(ctx);

      // Create a map of categories with counts
      const categoryMap = new Map<string, number>();

      // Add categories from products
      for (const c of categoryData) {
        categoryMap.set(c.category, c._count.category);
      }

      // Add categories from icon config (with 0 products if not in map)
      for (const name of Object.keys(iconConfig)) {
        if (!categoryMap.has(name)) {
          categoryMap.set(name, 0);
        }
      }

      // Build categories array
      const categories: AdminCategory[] = Array.from(categoryMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, productCount]) => ({
          name,
          icon:
            iconConfig[name] ||
            DEFAULT_CATEGORY_ICONS[name.toLowerCase()] ||
            "tag",
          productCount,
        }));

      return {
        categories,
        total: categories.length,
      };
    });
  }

  @Query(() => [AdminCategoryConfig])
  @adminRequired()
  async adminAllConfiguredCategories(
    @Ctx() ctx: Context,
  ): Promise<AdminCategoryConfig[]> {
    return tryCatchAsync(async () => {
      const iconConfig = await getCategoryIconConfig(ctx);

      // Get categories from products
      const productCategories = await ctx.prisma.productCategory.findMany({
        distinct: ["category"],
        select: { category: true },
        orderBy: { category: "asc" },
      });

      const allCategoryNames = new Set([
        ...productCategories.map((c) => c.category),
        ...Object.keys(iconConfig),
      ]);

      return Array.from(allCategoryNames)
        .sort()
        .map((name) => ({
          name,
          icon:
            iconConfig[name] ||
            DEFAULT_CATEGORY_ICONS[name.toLowerCase()] ||
            "tag",
        }));
    });
  }

  @Query(() => [AdminIconOption])
  @adminRequired()
  async adminAvailableIcons(): Promise<AdminIconOption[]> {
    return [
      { value: "tag", label: "Tag" },
      { value: "bowl", label: "Bowl" },
      { value: "coffee", label: "Coffee/Mug" },
      { value: "plate", label: "Plate" },
      { value: "flower", label: "Flower/Vase" },
      { value: "plant", label: "Plant/Planter" },
      { value: "home", label: "Home/Decor" },
      { value: "gift", label: "Gift" },
      { value: "utensils", label: "Utensils" },
      { value: "serving", label: "Serving" },
      { value: "palette", label: "Art/Palette" },
      { value: "heart", label: "Heart" },
      { value: "star", label: "Star" },
      { value: "sparkles", label: "Sparkles" },
      { value: "gem", label: "Gem" },
      { value: "shapes", label: "Shapes" },
    ];
  }

  @Mutation(() => AdminCategoryMutationResponse)
  @adminRequired()
  async adminUpdateCategoryIcon(
    @Ctx() ctx: Context,
    @Arg("category", () => String) category: string,
    @Arg("icon", () => String) icon: string,
  ): Promise<AdminCategoryMutationResponse> {
    return tryCatchAsync(async () => {
      const config = await getCategoryIconConfig(ctx);
      config[category] = icon;
      await saveCategoryIconConfig(ctx, config);

      return { success: true, error: null };
    });
  }

  @Mutation(() => AdminCategoryMutationResponse)
  @adminRequired()
  async adminAddCategory(
    @Ctx() ctx: Context,
    @Arg("name", () => String) name: string,
    @Arg("icon", () => String, { nullable: true, defaultValue: "tag" })
    icon: string,
  ): Promise<AdminCategoryMutationResponse> {
    return tryCatchAsync(async () => {
      if (!name || name.trim().length === 0) {
        return { success: false, error: "Category name is required" };
      }

      const normalizedName = name.trim();
      const config = await getCategoryIconConfig(ctx);

      if (config[normalizedName]) {
        return { success: false, error: "Category already exists" };
      }

      config[normalizedName] = icon;
      await saveCategoryIconConfig(ctx, config);

      return { success: true, error: null };
    });
  }

  @Mutation(() => AdminCategoryMutationResponse)
  @adminRequired()
  async adminRenameCategory(
    @Ctx() ctx: Context,
    @Arg("oldName", () => String) oldName: string,
    @Arg("newName", () => String) newName: string,
  ): Promise<AdminCategoryMutationResponse> {
    return tryCatchAsync(async () => {
      if (!newName || newName.trim().length === 0) {
        return { success: false, error: "New category name is required" };
      }

      const normalizedNewName = newName.trim();

      if (oldName === normalizedNewName) {
        return { success: true, error: null }; // No change needed
      }

      // Check if new name already exists
      const existingWithNewName = await ctx.prisma.productCategory.findFirst({
        where: { category: normalizedNewName },
      });

      if (existingWithNewName) {
        return {
          success: false,
          error: "A category with this name already exists",
        };
      }

      await ctx.prisma.$transaction(async (tx) => {
        // Update all product categories
        await tx.productCategory.updateMany({
          where: { category: oldName },
          data: { category: normalizedNewName },
        });
      });

      // Update icon config
      const config = await getCategoryIconConfig(ctx);
      if (config[oldName]) {
        config[normalizedNewName] = config[oldName];
        delete config[oldName];
        await saveCategoryIconConfig(ctx, config);
      }

      return { success: true, error: null };
    });
  }

  @Mutation(() => AdminCategoryMutationResponse)
  @adminRequired()
  async adminDeleteCategory(
    @Ctx() ctx: Context,
    @Arg("name", () => String) name: string,
  ): Promise<AdminCategoryMutationResponse> {
    return tryCatchAsync(async () => {
      await ctx.prisma.$transaction(async (tx) => {
        // Delete all product category associations
        await tx.productCategory.deleteMany({
          where: { category: name },
        });
      });

      // Remove from icon config
      const config = await getCategoryIconConfig(ctx);
      if (config[name]) {
        delete config[name];
        await saveCategoryIconConfig(ctx, config);
      }

      return { success: true, error: null };
    });
  }
}
