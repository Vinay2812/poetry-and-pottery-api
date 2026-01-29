import { Arg, Ctx, Int, Mutation, Query, Resolver } from "type-graphql";

import { adminRequired } from "@/middlewares/auth.middleware";
import { Context } from "@/types/context";
import { tryCatchAsync } from "@/utils/trycatch";

import {
  AdminCollection,
  AdminCollectionDetail,
  AdminCollectionMutationResponse,
  AdminCollectionsFilterInput,
  AdminCollectionsResponse,
  AssignProductsToCollectionInput,
  CreateCollectionInput,
  UpdateCollectionInput,
} from "./collections.type";

@Resolver()
export class AdminCollectionsResolver {
  @Query(() => AdminCollectionsResponse)
  @adminRequired()
  async adminCollections(
    @Ctx() ctx: Context,
    @Arg("filter", () => AdminCollectionsFilterInput, { nullable: true })
    filter?: AdminCollectionsFilterInput,
  ): Promise<AdminCollectionsResponse> {
    return tryCatchAsync(async () => {
      const search = filter?.search ?? "";
      const page = filter?.page ?? 1;
      const limit = filter?.limit ?? 20;
      const skip = (page - 1) * limit;
      const now = new Date();

      const where: {
        OR?: object[];
        AND?: object[];
      } = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { slug: { contains: search, mode: "insensitive" } },
        ];
      }

      // Filter by active status (within date window)
      if (filter?.active !== undefined) {
        if (filter.active) {
          // Active: currently within date window or no window set
          where.AND = [
            { OR: [{ starts_at: null }, { starts_at: { lte: now } }] },
            { OR: [{ ends_at: null }, { ends_at: { gte: now } }] },
          ];
        } else {
          // Inactive: ended or not yet started
          where.AND = [
            {
              OR: [{ starts_at: { gt: now } }, { ends_at: { lt: now } }],
            },
          ];
        }
      }

      const [collections, total] = await Promise.all([
        ctx.prisma.collection.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: "desc" },
          include: { _count: { select: { products: true } } },
        }),
        ctx.prisma.collection.count({ where }),
      ]);

      return {
        collections: collections.map(
          (c): AdminCollection => ({
            id: c.id,
            slug: c.slug,
            name: c.name,
            description: c.description,
            image_url: c.image_url,
            starts_at: c.starts_at,
            ends_at: c.ends_at,
            created_at: c.created_at,
            updated_at: c.updated_at,
            products_count: c._count.products,
          }),
        ),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    });
  }

  @Query(() => AdminCollectionDetail, { nullable: true })
  @adminRequired()
  async adminCollectionById(
    @Ctx() ctx: Context,
    @Arg("id", () => Int) id: number,
  ): Promise<AdminCollectionDetail | null> {
    return tryCatchAsync(async () => {
      const collection = await ctx.prisma.collection.findUnique({
        where: { id },
        include: {
          _count: { select: { products: true } },
          products: {
            select: {
              id: true,
              name: true,
              slug: true,
              image_urls: true,
              price: true,
              is_active: true,
            },
            orderBy: { name: "asc" },
          },
        },
      });

      if (!collection) return null;

      return {
        id: collection.id,
        slug: collection.slug,
        name: collection.name,
        description: collection.description,
        image_url: collection.image_url,
        starts_at: collection.starts_at,
        ends_at: collection.ends_at,
        created_at: collection.created_at,
        updated_at: collection.updated_at,
        products_count: collection._count.products,
        products: collection.products.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          image_url: p.image_urls[0] ?? null,
          price: p.price,
          is_active: p.is_active,
        })),
      };
    });
  }

  @Mutation(() => AdminCollectionMutationResponse)
  @adminRequired()
  async adminCreateCollection(
    @Ctx() ctx: Context,
    @Arg("input", () => CreateCollectionInput) input: CreateCollectionInput,
  ): Promise<AdminCollectionMutationResponse> {
    return tryCatchAsync(async () => {
      // Validate slug uniqueness
      const existing = await ctx.prisma.collection.findUnique({
        where: { slug: input.slug },
        select: { id: true },
      });

      if (existing) {
        return {
          success: false,
          collectionId: null,
          error: "A collection with this slug already exists",
        };
      }

      const collection = await ctx.prisma.collection.create({
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          image_url: input.image_url,
          starts_at: input.starts_at,
          ends_at: input.ends_at,
        },
      });

      return { success: true, collectionId: collection.id, error: null };
    });
  }

  @Mutation(() => AdminCollectionMutationResponse)
  @adminRequired()
  async adminUpdateCollection(
    @Ctx() ctx: Context,
    @Arg("id", () => Int) id: number,
    @Arg("input", () => UpdateCollectionInput) input: UpdateCollectionInput,
  ): Promise<AdminCollectionMutationResponse> {
    return tryCatchAsync(async () => {
      // Check if collection exists
      const collection = await ctx.prisma.collection.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!collection) {
        return {
          success: false,
          collectionId: null,
          error: "Collection not found",
        };
      }

      // If slug is being updated, validate uniqueness
      if (input.slug) {
        const existing = await ctx.prisma.collection.findFirst({
          where: { slug: input.slug, NOT: { id } },
          select: { id: true },
        });

        if (existing) {
          return {
            success: false,
            collectionId: null,
            error: "A collection with this slug already exists",
          };
        }
      }

      await ctx.prisma.collection.update({
        where: { id },
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          image_url: input.image_url,
          starts_at: input.starts_at,
          ends_at: input.ends_at,
        },
      });

      return { success: true, collectionId: id, error: null };
    });
  }

  @Mutation(() => AdminCollectionMutationResponse)
  @adminRequired()
  async adminDeleteCollection(
    @Ctx() ctx: Context,
    @Arg("id", () => Int) id: number,
  ): Promise<AdminCollectionMutationResponse> {
    return tryCatchAsync(async () => {
      // Check if collection exists
      const collection = await ctx.prisma.collection.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!collection) {
        return {
          success: false,
          collectionId: null,
          error: "Collection not found",
        };
      }

      // Delete collection - products get collection_id set to null via onDelete: SetNull
      await ctx.prisma.collection.delete({ where: { id } });

      return { success: true, collectionId: id, error: null };
    });
  }

  @Mutation(() => AdminCollectionMutationResponse)
  @adminRequired()
  async adminAssignProductsToCollection(
    @Ctx() ctx: Context,
    @Arg("input", () => AssignProductsToCollectionInput)
    input: AssignProductsToCollectionInput,
  ): Promise<AdminCollectionMutationResponse> {
    return tryCatchAsync(async () => {
      const { collectionId, productIds } = input;

      // Verify collection exists
      const collection = await ctx.prisma.collection.findUnique({
        where: { id: collectionId },
        select: { id: true },
      });

      if (!collection) {
        return {
          success: false,
          collectionId: null,
          error: "Collection not found",
        };
      }

      // Update products in a transaction
      await ctx.prisma.$transaction(async (tx) => {
        // First, remove all products from this collection
        await tx.product.updateMany({
          where: { collection_id: collectionId },
          data: { collection_id: null },
        });

        // Then assign the specified products
        if (productIds.length > 0) {
          await tx.product.updateMany({
            where: { id: { in: productIds } },
            data: { collection_id: collectionId },
          });
        }
      });

      return { success: true, collectionId, error: null };
    });
  }

  @Mutation(() => AdminCollectionMutationResponse)
  @adminRequired()
  async adminRemoveProductFromCollection(
    @Ctx() ctx: Context,
    @Arg("productId", () => Int) productId: number,
  ): Promise<AdminCollectionMutationResponse> {
    return tryCatchAsync(async () => {
      await ctx.prisma.product.update({
        where: { id: productId },
        data: { collection_id: null },
      });

      return { success: true, collectionId: null, error: null };
    });
  }
}
