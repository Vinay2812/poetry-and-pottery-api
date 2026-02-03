import { Arg, Ctx, Int, Mutation, Query, Resolver } from "type-graphql";

import { adminRequired } from "@/middlewares/auth.middleware";
import { customizationCache } from "@/resolvers/customization/customization.cache";
import { Context } from "@/types/context";
import { tryCatchAsync } from "@/utils/trycatch";

import {
  AdminCustomizationCategorySummary,
  AdminCustomizationMutationResponse,
  AdminCustomizationOption,
  AdminCustomizationOptionsFilterInput,
  AdminCustomizationOptionsResponse,
  AdminCustomizationTypeSummary,
  CreateCustomizationOptionInput,
  UpdateCustomizationOptionInput,
} from "./customization.type";

@Resolver()
export class AdminCustomizationResolver {
  // List all customization options with pagination, search, and filters
  @Query(() => AdminCustomizationOptionsResponse)
  @adminRequired()
  async adminCustomizationOptions(
    @Ctx() ctx: Context,
    @Arg("filter", () => AdminCustomizationOptionsFilterInput, {
      nullable: true,
    })
    filter?: AdminCustomizationOptionsFilterInput,
  ): Promise<AdminCustomizationOptionsResponse> {
    return tryCatchAsync(async () => {
      const search = filter?.search ?? "";
      const category = filter?.category;
      const type = filter?.type;
      const isActive = filter?.isActive;
      const page = filter?.page ?? 1;
      const limit = filter?.limit ?? 20;
      const skip = (page - 1) * limit;

      const where: {
        OR?: { name?: object; value?: object; category?: object }[];
        category?: string;
        type?: string;
        is_active?: boolean;
      } = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { value: { contains: search, mode: "insensitive" } },
          { category: { contains: search, mode: "insensitive" } },
        ];
      }

      if (category) {
        where.category = category;
      }

      if (type) {
        where.type = type;
      }

      if (typeof isActive === "boolean") {
        where.is_active = isActive;
      }

      const [options, total] = await Promise.all([
        ctx.prisma.customizationOption.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            { category: "asc" },
            { type: "asc" },
            { sort_order: "asc" },
            { name: "asc" },
          ],
        }),
        ctx.prisma.customizationOption.count({ where }),
      ]);

      return {
        options: options as AdminCustomizationOption[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    });
  }

  // Get a single customization option by ID
  @Query(() => AdminCustomizationOption, { nullable: true })
  @adminRequired()
  async adminCustomizationOptionById(
    @Ctx() ctx: Context,
    @Arg("id", () => Int) id: number,
  ): Promise<AdminCustomizationOption | null> {
    return tryCatchAsync(async () => {
      const option = await ctx.prisma.customizationOption.findUnique({
        where: { id },
      });

      return option as AdminCustomizationOption | null;
    });
  }

  // Get all unique categories for filter dropdown
  @Query(() => [AdminCustomizationCategorySummary])
  @adminRequired()
  async adminCustomizationCategories(
    @Ctx() ctx: Context,
  ): Promise<AdminCustomizationCategorySummary[]> {
    return tryCatchAsync(async () => {
      const categories = await ctx.prisma.customizationOption.groupBy({
        by: ["category"],
        _count: { id: true },
        orderBy: { category: "asc" },
      });

      return categories.map((c) => ({
        category: c.category,
        count: c._count.id,
      }));
    });
  }

  // Get all unique types for filter dropdown
  @Query(() => [AdminCustomizationTypeSummary])
  @adminRequired()
  async adminCustomizationTypes(
    @Ctx() ctx: Context,
  ): Promise<AdminCustomizationTypeSummary[]> {
    return tryCatchAsync(async () => {
      const types = await ctx.prisma.customizationOption.groupBy({
        by: ["type"],
        _count: { id: true },
        orderBy: { type: "asc" },
      });

      return types.map((t) => ({
        type: t.type,
        count: t._count.id,
      }));
    });
  }

  // Create a new customization option
  @Mutation(() => AdminCustomizationMutationResponse)
  @adminRequired()
  async adminCreateCustomizationOption(
    @Ctx() ctx: Context,
    @Arg("input", () => CreateCustomizationOptionInput)
    input: CreateCustomizationOptionInput,
  ): Promise<AdminCustomizationMutationResponse> {
    return tryCatchAsync(async () => {
      const {
        category,
        type,
        name,
        value,
        price_modifier = 0,
        sort_order = 0,
        is_active = true,
      } = input;

      // Check for unique constraint violation (category + type + value)
      const existingOption = await ctx.prisma.customizationOption.findUnique({
        where: {
          category_type_value: { category, type, value },
        },
        select: { id: true },
      });

      if (existingOption) {
        return {
          success: false,
          optionId: null,
          error:
            "A customization option with this category, type, and value already exists",
        };
      }

      const option = await ctx.prisma.customizationOption.create({
        data: {
          category,
          type,
          name,
          value,
          price_modifier,
          sort_order,
          is_active,
        },
      });

      await customizationCache.invalidateAll();

      return {
        success: true,
        optionId: option.id,
        error: null,
      };
    });
  }

  // Update an existing customization option
  @Mutation(() => AdminCustomizationMutationResponse)
  @adminRequired()
  async adminUpdateCustomizationOption(
    @Ctx() ctx: Context,
    @Arg("id", () => Int) id: number,
    @Arg("input", () => UpdateCustomizationOptionInput)
    input: UpdateCustomizationOptionInput,
  ): Promise<AdminCustomizationMutationResponse> {
    return tryCatchAsync(async () => {
      // Check if option exists
      const existingOption = await ctx.prisma.customizationOption.findUnique({
        where: { id },
        select: { id: true, category: true, type: true, value: true },
      });

      if (!existingOption) {
        return {
          success: false,
          optionId: null,
          error: "Customization option not found",
        };
      }

      // If updating category, type, or value, check for unique constraint
      const newCategory = input.category ?? existingOption.category;
      const newType = input.type ?? existingOption.type;
      const newValue = input.value ?? existingOption.value;

      // Check if the new combination would conflict with another record
      if (
        input.category !== undefined ||
        input.type !== undefined ||
        input.value !== undefined
      ) {
        const conflictingOption =
          await ctx.prisma.customizationOption.findFirst({
            where: {
              category: newCategory,
              type: newType,
              value: newValue,
              NOT: { id },
            },
            select: { id: true },
          });

        if (conflictingOption) {
          return {
            success: false,
            optionId: null,
            error:
              "A customization option with this category, type, and value already exists",
          };
        }
      }

      await ctx.prisma.customizationOption.update({
        where: { id },
        data: input,
      });

      await customizationCache.invalidateAll();

      return {
        success: true,
        optionId: id,
        error: null,
      };
    });
  }

  // Delete a customization option
  @Mutation(() => AdminCustomizationMutationResponse)
  @adminRequired()
  async adminDeleteCustomizationOption(
    @Ctx() ctx: Context,
    @Arg("id", () => Int) id: number,
  ): Promise<AdminCustomizationMutationResponse> {
    return tryCatchAsync(async () => {
      // Check if option exists
      const existingOption = await ctx.prisma.customizationOption.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!existingOption) {
        return {
          success: false,
          optionId: null,
          error: "Customization option not found",
        };
      }

      await ctx.prisma.customizationOption.delete({
        where: { id },
      });

      await customizationCache.invalidateAll();

      return {
        success: true,
        optionId: id,
        error: null,
      };
    });
  }

  // Toggle active status of a customization option
  @Mutation(() => AdminCustomizationMutationResponse)
  @adminRequired()
  async adminToggleCustomizationOptionActive(
    @Ctx() ctx: Context,
    @Arg("id", () => Int) id: number,
  ): Promise<AdminCustomizationMutationResponse> {
    return tryCatchAsync(async () => {
      const option = await ctx.prisma.customizationOption.findUnique({
        where: { id },
        select: { id: true, is_active: true },
      });

      if (!option) {
        return {
          success: false,
          optionId: null,
          error: "Customization option not found",
        };
      }

      await ctx.prisma.customizationOption.update({
        where: { id },
        data: { is_active: !option.is_active },
      });

      await customizationCache.invalidateAll();

      return {
        success: true,
        optionId: id,
        error: null,
      };
    });
  }
}
