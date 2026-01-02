import { Arg, Ctx, Int, Mutation, Query, Resolver } from "type-graphql";

import { adminRequired } from "@/middlewares/auth.middleware";
import { Context } from "@/types/context";
import { tryCatchAsync } from "@/utils/trycatch";

import {
  AdminMutationResponse,
  AdminProduct,
  AdminProductDetail,
  AdminProductMutationResponse,
  AdminProductReviewsResponse,
  AdminProductsFilterInput,
  AdminProductsResponse,
  CreateProductInput,
  UpdateProductInput,
} from "./products.type";

@Resolver()
export class AdminProductsResolver {
  @Query(() => AdminProductsResponse)
  @adminRequired()
  async adminProducts(
    @Ctx() ctx: Context,
    @Arg("filter", () => AdminProductsFilterInput, { nullable: true })
    filter?: AdminProductsFilterInput,
  ): Promise<AdminProductsResponse> {
    return tryCatchAsync(async () => {
      const search = filter?.search ?? "";
      const category = filter?.category;
      const isActive = filter?.isActive;
      const lowStock = filter?.lowStock;
      const page = filter?.page ?? 1;
      const limit = filter?.limit ?? 20;
      const skip = (page - 1) * limit;

      const where: {
        OR?: { name?: object; slug?: object }[];
        product_categories?: { some: { category: string } };
        is_active?: boolean;
        available_quantity?: { lte: number };
      } = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { slug: { contains: search, mode: "insensitive" } },
        ];
      }

      if (category) {
        where.product_categories = { some: { category } };
      }

      if (typeof isActive === "boolean") {
        where.is_active = isActive;
      }

      if (lowStock) {
        where.available_quantity = { lte: 5 };
      }

      const [products, total] = await Promise.all([
        ctx.prisma.product.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: "desc" },
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            price: true,
            total_quantity: true,
            available_quantity: true,
            is_active: true,
            color_name: true,
            color_code: true,
            material: true,
            image_urls: true,
            created_at: true,
            product_categories: {
              select: { category: true },
            },
            _count: {
              select: {
                reviews: true,
                wishlists: true,
                carts: true,
              },
            },
          },
        }),
        ctx.prisma.product.count({ where }),
      ]);

      return {
        products: products.map((p) => ({
          ...p,
          categories: p.product_categories.map((pc) => pc.category),
        })) as AdminProduct[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    });
  }

  @Query(() => AdminProductDetail, { nullable: true })
  @adminRequired()
  async adminProductById(
    @Ctx() ctx: Context,
    @Arg("id", () => Int) id: number,
  ): Promise<AdminProductDetail | null> {
    return tryCatchAsync(async () => {
      const product = await ctx.prisma.product.findUnique({
        where: { id },
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          instructions: true,
          price: true,
          total_quantity: true,
          available_quantity: true,
          is_active: true,
          color_name: true,
          color_code: true,
          material: true,
          image_urls: true,
          created_at: true,
          updated_at: true,
          product_categories: {
            select: { category: true },
          },
          _count: {
            select: {
              reviews: true,
              wishlists: true,
              carts: true,
              purchased_products: true,
            },
          },
        },
      });

      if (!product) return null;

      return {
        ...product,
        categories: product.product_categories.map((pc) => pc.category),
      } as AdminProductDetail;
    });
  }

  @Query(() => AdminProductReviewsResponse)
  @adminRequired()
  async adminProductReviews(
    @Ctx() ctx: Context,
    @Arg("productId", () => Int) productId: number,
  ): Promise<AdminProductReviewsResponse> {
    return tryCatchAsync(async () => {
      const [reviews, aggregation] = await Promise.all([
        ctx.prisma.review.findMany({
          where: { product_id: productId },
          orderBy: { created_at: "desc" },
          select: {
            id: true,
            rating: true,
            review: true,
            image_urls: true,
            created_at: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        }),
        ctx.prisma.review.aggregate({
          where: { product_id: productId },
          _avg: { rating: true },
          _count: true,
        }),
      ]);

      return {
        reviews,
        total: aggregation._count,
        averageRating: aggregation._avg.rating ?? 0,
      };
    });
  }

  @Query(() => [String])
  @adminRequired()
  async adminAllCategories(@Ctx() ctx: Context): Promise<string[]> {
    return tryCatchAsync(async () => {
      const categories = await ctx.prisma.productCategory.findMany({
        distinct: ["category"],
        select: { category: true },
        orderBy: { category: "asc" },
      });

      return categories.map((c) => c.category);
    });
  }

  @Mutation(() => AdminProductMutationResponse)
  @adminRequired()
  async adminCreateProduct(
    @Ctx() ctx: Context,
    @Arg("input", () => CreateProductInput) input: CreateProductInput,
  ): Promise<AdminProductMutationResponse> {
    return tryCatchAsync(async () => {
      const {
        name,
        slug,
        description,
        instructions = [],
        price,
        total_quantity,
        available_quantity,
        is_active = true,
        color_name,
        color_code,
        material,
        image_urls,
        categories,
      } = input;

      // Validate slug uniqueness
      const existingProduct = await ctx.prisma.product.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (existingProduct) {
        return {
          success: false,
          productId: null,
          error: "A product with this slug already exists",
        };
      }

      const product = await ctx.prisma.product.create({
        data: {
          name,
          slug,
          description,
          instructions,
          price,
          total_quantity,
          available_quantity,
          is_active,
          color_name,
          color_code,
          material,
          image_urls,
          product_categories: {
            create: categories.map((category) => ({ category })),
          },
        },
      });

      return {
        success: true,
        productId: product.id,
        error: null,
      };
    });
  }

  @Mutation(() => AdminMutationResponse)
  @adminRequired()
  async adminUpdateProduct(
    @Ctx() ctx: Context,
    @Arg("id", () => Int) id: number,
    @Arg("input", () => UpdateProductInput) input: UpdateProductInput,
  ): Promise<AdminMutationResponse> {
    return tryCatchAsync(async () => {
      const { categories, ...data } = input;

      // If slug is being updated, validate uniqueness
      if (data.slug) {
        const existingProduct = await ctx.prisma.product.findFirst({
          where: { slug: data.slug, NOT: { id } },
          select: { id: true },
        });

        if (existingProduct) {
          return {
            success: false,
            error: "A product with this slug already exists",
          };
        }
      }

      await ctx.prisma.$transaction(async (tx) => {
        // Update product
        await tx.product.update({
          where: { id },
          data,
        });

        // Update categories if provided
        if (categories !== undefined) {
          // Delete existing categories
          await tx.productCategory.deleteMany({
            where: { product_id: id },
          });

          // Create new categories
          if (categories.length > 0) {
            await tx.productCategory.createMany({
              data: categories.map((category) => ({
                product_id: id,
                category,
              })),
            });
          }
        }
      });

      return {
        success: true,
        error: null,
      };
    });
  }

  @Mutation(() => AdminMutationResponse)
  @adminRequired()
  async adminDeleteProduct(
    @Ctx() ctx: Context,
    @Arg("id", () => Int) id: number,
  ): Promise<AdminMutationResponse> {
    return tryCatchAsync(async () => {
      // Check if product has any purchased products
      const purchasedCount = await ctx.prisma.purchasedProductItem.count({
        where: { product_id: id },
      });

      if (purchasedCount > 0) {
        // Has orders - deactivate instead of delete
        await ctx.prisma.product.update({
          where: { id },
          data: { is_active: false },
        });

        return {
          success: true,
          error:
            "Product has orders and was deactivated instead of deleted. This keeps order history intact.",
        };
      }

      // No orders - safe to delete
      await ctx.prisma.product.delete({
        where: { id },
      });

      return {
        success: true,
        error: null,
      };
    });
  }

  @Mutation(() => AdminMutationResponse)
  @adminRequired()
  async adminToggleProductActive(
    @Ctx() ctx: Context,
    @Arg("id", () => Int) id: number,
  ): Promise<AdminMutationResponse> {
    return tryCatchAsync(async () => {
      const product = await ctx.prisma.product.findUnique({
        where: { id },
        select: { is_active: true },
      });

      if (!product) {
        return { success: false, error: "Product not found" };
      }

      await ctx.prisma.product.update({
        where: { id },
        data: { is_active: !product.is_active },
      });

      return {
        success: true,
        error: null,
      };
    });
  }

  @Mutation(() => AdminMutationResponse)
  @adminRequired()
  async adminDeleteProductReview(
    @Ctx() ctx: Context,
    @Arg("reviewId", () => Int) reviewId: number,
  ): Promise<AdminMutationResponse> {
    return tryCatchAsync(async () => {
      const review = await ctx.prisma.review.findUnique({
        where: { id: reviewId },
        select: { product_id: true },
      });

      if (!review) {
        return { success: false, error: "Review not found" };
      }

      await ctx.prisma.review.delete({
        where: { id: reviewId },
      });

      return {
        success: true,
        error: null,
      };
    });
  }
}
