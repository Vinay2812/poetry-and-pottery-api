import { Arg, Ctx, Int, Mutation, Query, Resolver } from "type-graphql";

import { adminRequired } from "@/middlewares/auth.middleware";
import { customizationCache } from "@/resolvers/customization/customization.cache";
import { Context } from "@/types/context";
import { tryCatchAsync } from "@/utils/trycatch";

import { AdminCustomizationOption } from "./customization.type";
import {
  AdminCustomizeCategoriesResponse,
  AdminCustomizeCategory,
  AdminCustomizeCategoryMutationResponse,
  CreateCustomizeCategoryInput,
  UpdateCustomizeCategoryInput,
} from "./customize-category.type";

@Resolver()
export class AdminCustomizeCategoryResolver {
  // List all customize categories with their options
  @Query(() => AdminCustomizeCategoriesResponse)
  @adminRequired()
  async adminCustomizeCategories(
    @Ctx() ctx: Context,
  ): Promise<AdminCustomizeCategoriesResponse> {
    return tryCatchAsync(async () => {
      const categories = await ctx.prisma.customizeCategory.findMany({
        orderBy: { category: "asc" },
        include: {
          options: {
            orderBy: [{ type: "asc" }, { sort_order: "asc" }, { name: "asc" }],
          },
          _count: {
            select: { options: true },
          },
        },
      });

      const formattedCategories = categories.map((cat) => ({
        id: cat.id,
        category: cat.category,
        base_price: cat.base_price,
        image_url: cat.image_url,
        is_active: cat.is_active,
        created_at: cat.created_at,
        updated_at: cat.updated_at,
        options_count: cat._count.options,
        options: cat.options.map((opt) => ({
          id: opt.id,
          customize_category_id: opt.customize_category_id,
          category_name: cat.category,
          type: opt.type,
          name: opt.name,
          value: opt.value,
          price_modifier: opt.price_modifier,
          sort_order: opt.sort_order,
          is_active: opt.is_active,
          created_at: opt.created_at,
          updated_at: opt.updated_at,
        })) as AdminCustomizationOption[],
      }));

      return {
        categories: formattedCategories,
        total: categories.length,
      };
    });
  }

  // Get a single customize category by ID
  @Query(() => AdminCustomizeCategory, { nullable: true })
  @adminRequired()
  async adminCustomizeCategoryById(
    @Ctx() ctx: Context,
    @Arg("id", () => Int) id: number,
  ): Promise<AdminCustomizeCategory | null> {
    return tryCatchAsync(async () => {
      const category = await ctx.prisma.customizeCategory.findUnique({
        where: { id },
        include: {
          options: {
            orderBy: [{ type: "asc" }, { sort_order: "asc" }, { name: "asc" }],
          },
          _count: {
            select: { options: true },
          },
        },
      });

      if (!category) {
        return null;
      }

      return {
        id: category.id,
        category: category.category,
        base_price: category.base_price,
        image_url: category.image_url,
        is_active: category.is_active,
        created_at: category.created_at,
        updated_at: category.updated_at,
        options_count: category._count.options,
        options: category.options.map((opt) => ({
          id: opt.id,
          customize_category_id: opt.customize_category_id,
          category_name: category.category,
          type: opt.type,
          name: opt.name,
          value: opt.value,
          price_modifier: opt.price_modifier,
          sort_order: opt.sort_order,
          is_active: opt.is_active,
          created_at: opt.created_at,
          updated_at: opt.updated_at,
        })) as AdminCustomizationOption[],
      };
    });
  }

  // Create a new customize category
  @Mutation(() => AdminCustomizeCategoryMutationResponse)
  @adminRequired()
  async adminCreateCustomizeCategory(
    @Ctx() ctx: Context,
    @Arg("input", () => CreateCustomizeCategoryInput)
    input: CreateCustomizeCategoryInput,
  ): Promise<AdminCustomizeCategoryMutationResponse> {
    return tryCatchAsync(async () => {
      const { category, base_price = 0, image_url, is_active = true } = input;

      // Check for duplicate category name
      const existingCategory = await ctx.prisma.customizeCategory.findUnique({
        where: { category },
        select: { id: true },
      });

      if (existingCategory) {
        return {
          success: false,
          categoryId: null,
          error: "A customize category with this name already exists",
        };
      }

      const newCategory = await ctx.prisma.customizeCategory.create({
        data: {
          category,
          base_price,
          image_url,
          is_active,
        },
      });

      await customizationCache.invalidateAll();

      return {
        success: true,
        categoryId: newCategory.id,
        error: null,
      };
    });
  }

  // Update an existing customize category
  @Mutation(() => AdminCustomizeCategoryMutationResponse)
  @adminRequired()
  async adminUpdateCustomizeCategory(
    @Ctx() ctx: Context,
    @Arg("id", () => Int) id: number,
    @Arg("input", () => UpdateCustomizeCategoryInput)
    input: UpdateCustomizeCategoryInput,
  ): Promise<AdminCustomizeCategoryMutationResponse> {
    return tryCatchAsync(async () => {
      // Check if category exists
      const existingCategory = await ctx.prisma.customizeCategory.findUnique({
        where: { id },
        select: { id: true, category: true },
      });

      if (!existingCategory) {
        return {
          success: false,
          categoryId: null,
          error: "Customize category not found",
        };
      }

      // If updating category name, check for conflict
      if (input.category && input.category !== existingCategory.category) {
        const conflictingCategory =
          await ctx.prisma.customizeCategory.findUnique({
            where: { category: input.category },
            select: { id: true },
          });

        if (conflictingCategory) {
          return {
            success: false,
            categoryId: null,
            error: "A customize category with this name already exists",
          };
        }
      }

      await ctx.prisma.customizeCategory.update({
        where: { id },
        data: input,
      });

      await customizationCache.invalidateAll();

      return {
        success: true,
        categoryId: id,
        error: null,
      };
    });
  }

  // Delete a customize category
  @Mutation(() => AdminCustomizeCategoryMutationResponse)
  @adminRequired()
  async adminDeleteCustomizeCategory(
    @Ctx() ctx: Context,
    @Arg("id", () => Int) id: number,
  ): Promise<AdminCustomizeCategoryMutationResponse> {
    return tryCatchAsync(async () => {
      // Check if category exists
      const existingCategory = await ctx.prisma.customizeCategory.findUnique({
        where: { id },
        include: {
          _count: {
            select: { options: true },
          },
        },
      });

      if (!existingCategory) {
        return {
          success: false,
          categoryId: null,
          error: "Customize category not found",
        };
      }

      // Check if category has options
      if (existingCategory._count.options > 0) {
        return {
          success: false,
          categoryId: null,
          error: `Cannot delete category with ${existingCategory._count.options} associated options. Please delete the options first.`,
        };
      }

      await ctx.prisma.customizeCategory.delete({
        where: { id },
      });

      await customizationCache.invalidateAll();

      return {
        success: true,
        categoryId: id,
        error: null,
      };
    });
  }

  // Toggle active status of a customize category
  @Mutation(() => AdminCustomizeCategoryMutationResponse)
  @adminRequired()
  async adminToggleCustomizeCategoryActive(
    @Ctx() ctx: Context,
    @Arg("id", () => Int) id: number,
  ): Promise<AdminCustomizeCategoryMutationResponse> {
    return tryCatchAsync(async () => {
      const category = await ctx.prisma.customizeCategory.findUnique({
        where: { id },
        select: { id: true, is_active: true },
      });

      if (!category) {
        return {
          success: false,
          categoryId: null,
          error: "Customize category not found",
        };
      }

      await ctx.prisma.customizeCategory.update({
        where: { id },
        data: { is_active: !category.is_active },
      });

      await customizationCache.invalidateAll();

      return {
        success: true,
        categoryId: id,
        error: null,
      };
    });
  }
}
