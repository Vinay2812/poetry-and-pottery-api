import { Arg, Ctx, Int, Mutation, Query, Resolver } from "type-graphql";

import { prisma } from "@/lib/prisma";
import { authRequired } from "@/middlewares/auth.middleware";
import { Context } from "@/types/context";

import {
  CreateEventReviewInput,
  CreateProductReviewInput,
  CreateReviewResponse,
  DeleteReviewResponse,
  Review,
  ReviewsFilterInput,
  ReviewsResponse,
  ToggleLikeAction,
  ToggleReviewLikeResponse,
} from "./reviews.type";

function mapReview(
  review: {
    id: number;
    user_id: number;
    rating: number;
    review: string | null;
    image_urls: string[];
    product_id: number | null;
    event_id: string | null;
    created_at: Date;
    updated_at: Date;
    user: {
      id: number;
      name: string | null;
      image: string | null;
    };
    likes: {
      id: number;
      review_id: number;
      user_id: number;
    }[];
  },
  currentUserId?: number,
): Review {
  return {
    id: review.id,
    user_id: review.user_id,
    rating: review.rating,
    review: review.review,
    image_urls: review.image_urls,
    product_id: review.product_id,
    event_id: review.event_id,
    created_at: review.created_at,
    updated_at: review.updated_at,
    user: {
      id: review.user.id,
      name: review.user.name,
      image: review.user.image,
    },
    likes: review.likes.map((like) => ({
      id: like.id,
      review_id: like.review_id,
      user_id: like.user_id,
    })),
    likes_count: review.likes.length,
    is_liked_by_current_user: currentUserId
      ? review.likes.some((like) => like.user_id === currentUserId)
      : false,
  };
}

@Resolver()
export class ReviewsResolver {
  @Query(() => ReviewsResponse)
  async productReviews(
    @Arg("productId", () => Int) productId: number,
    @Arg("filter", () => ReviewsFilterInput, { nullable: true })
    filter?: ReviewsFilterInput,
    @Ctx() ctx?: Context,
  ): Promise<ReviewsResponse> {
    const page = filter?.page ?? 1;
    const limit = filter?.limit ?? 10;
    const currentUserId = ctx?.user?.dbUserId;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { product_id: productId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          likes: true,
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where: { product_id: productId } }),
    ]);

    return {
      data: reviews.map((review) => mapReview(review, currentUserId)),
      total,
      page,
      total_pages: Math.ceil(total / limit),
    };
  }

  @Query(() => ReviewsResponse)
  async eventReviews(
    @Arg("eventId", () => String) eventId: string,
    @Arg("filter", () => ReviewsFilterInput, { nullable: true })
    filter?: ReviewsFilterInput,
    @Ctx() ctx?: Context,
  ): Promise<ReviewsResponse> {
    const page = filter?.page ?? 1;
    const limit = filter?.limit ?? 10;
    const currentUserId = ctx?.user?.dbUserId;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { event_id: eventId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          likes: true,
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where: { event_id: eventId } }),
    ]);

    return {
      data: reviews.map((review) => mapReview(review, currentUserId)),
      total,
      page,
      total_pages: Math.ceil(total / limit),
    };
  }

  @Mutation(() => CreateReviewResponse)
  @authRequired()
  async createProductReview(
    @Arg("input") input: CreateProductReviewInput,
    @Ctx() ctx: Context,
  ): Promise<CreateReviewResponse> {
    const userId = ctx.user!.dbUserId!;

    // Check if user already reviewed this product
    const existing = await prisma.review.findUnique({
      where: {
        product_id_user_id: {
          product_id: input.productId,
          user_id: userId,
        },
      },
    });

    if (existing) {
      return {
        success: false,
        error: "You have already reviewed this product",
      };
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: input.productId },
    });

    if (!product) {
      return {
        success: false,
        error: "Product not found",
      };
    }

    const review = await prisma.review.create({
      data: {
        user_id: userId,
        product_id: input.productId,
        rating: input.rating,
        review: input.review?.trim() || null,
        image_urls: input.imageUrls ?? [],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        likes: true,
      },
    });

    return {
      success: true,
      review: mapReview(review, userId),
    };
  }

  @Mutation(() => CreateReviewResponse)
  @authRequired()
  async createEventReview(
    @Arg("input") input: CreateEventReviewInput,
    @Ctx() ctx: Context,
  ): Promise<CreateReviewResponse> {
    const userId = ctx.user!.dbUserId!;

    // Check if user already reviewed this event
    const existing = await prisma.review.findUnique({
      where: {
        event_id_user_id: {
          event_id: input.eventId,
          user_id: userId,
        },
      },
    });

    if (existing) {
      return {
        success: false,
        error: "You have already reviewed this event",
      };
    }

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: input.eventId },
    });

    if (!event) {
      return {
        success: false,
        error: "Event not found",
      };
    }

    // Check if user has a confirmed registration for this event
    const registration = await prisma.eventRegistration.findUnique({
      where: {
        event_id_user_id: {
          event_id: input.eventId,
          user_id: userId,
        },
      },
    });

    if (!registration || registration.status !== "CONFIRMED") {
      return {
        success: false,
        error: "You can only review events you have attended",
      };
    }

    const review = await prisma.review.create({
      data: {
        user_id: userId,
        event_id: input.eventId,
        rating: input.rating,
        review: input.review?.trim() || null,
        image_urls: input.imageUrls ?? [],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        likes: true,
      },
    });

    return {
      success: true,
      review: mapReview(review, userId),
    };
  }

  @Mutation(() => DeleteReviewResponse)
  @authRequired()
  async deleteReview(
    @Arg("reviewId", () => Int) reviewId: number,
    @Ctx() ctx: Context,
  ): Promise<DeleteReviewResponse> {
    const userId = ctx.user!.dbUserId!;

    // Find the review
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return {
        success: false,
        error: "Review not found",
      };
    }

    // Check if user owns the review
    if (review.user_id !== userId) {
      return {
        success: false,
        error: "You can only delete your own reviews",
      };
    }

    await prisma.review.delete({
      where: { id: reviewId },
    });

    return {
      success: true,
    };
  }

  @Mutation(() => ToggleReviewLikeResponse)
  @authRequired()
  async toggleReviewLike(
    @Arg("reviewId", () => Int) reviewId: number,
    @Ctx() ctx: Context,
  ): Promise<ToggleReviewLikeResponse> {
    const userId = ctx.user!.dbUserId!;

    // Check if review exists
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return {
        success: false,
        error: "Review not found",
      };
    }

    // Check if already liked
    const existing = await prisma.reviewLike.findUnique({
      where: {
        review_id_user_id: {
          review_id: reviewId,
          user_id: userId,
        },
      },
    });

    let action: ToggleLikeAction;

    if (existing) {
      // Unlike
      await prisma.reviewLike.delete({
        where: { id: existing.id },
      });
      action = ToggleLikeAction.UNLIKED;
    } else {
      // Like
      await prisma.reviewLike.create({
        data: {
          review_id: reviewId,
          user_id: userId,
        },
      });
      action = ToggleLikeAction.LIKED;
    }

    // Get updated likes count
    const likesCount = await prisma.reviewLike.count({
      where: { review_id: reviewId },
    });

    return {
      success: true,
      action,
      likes_count: likesCount,
    };
  }
}
