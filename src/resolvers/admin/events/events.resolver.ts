import "reflect-metadata";
import { Arg, Ctx, Int, Mutation, Query, Resolver } from "type-graphql";

import { adminRequired } from "@/middlewares/auth.middleware";
import { eventCache } from "@/resolvers/events/events.cache";
import {
  EventLevel,
  EventRegistrationStatus,
  EventStatus,
  EventType,
} from "@/resolvers/events/events.type";
import { Context } from "@/types/context";
import { tryCatchAsync } from "@/utils/trycatch";

import {
  AdminBulkDeleteEventsResponse,
  AdminEvent,
  AdminEventDetail,
  AdminEventMutationResponse,
  AdminEventRegistrationsResponse,
  AdminEventReviewsResponse,
  AdminEventTypeOption,
  AdminEventsFilterInput,
  AdminEventsResponse,
  AdminLevelOption,
  AdminStatusOption,
  BulkDeleteEventsInput,
  CreateEventInput,
  UpdateEventInput,
} from "./events.type";

@Resolver()
export class AdminEventsResolver {
  @Query(() => AdminEventsResponse)
  @adminRequired()
  async adminEvents(
    @Ctx() ctx: Context,
    @Arg("filter", () => AdminEventsFilterInput, { nullable: true })
    filter?: AdminEventsFilterInput,
  ): Promise<AdminEventsResponse> {
    return tryCatchAsync(async () => {
      const search = filter?.search ?? "";
      const status = filter?.status;
      const level = filter?.level;
      const eventType = filter?.event_type;
      const upcoming = filter?.upcoming;
      const startDate = filter?.startDate;
      const endDate = filter?.endDate;
      const page = filter?.page ?? 1;
      const limit = filter?.limit ?? 20;
      const skip = (page - 1) * limit;

      const where: {
        OR?: {
          title?: object;
          slug?: object;
          instructor?: object;
          location?: object;
        }[];
        status?: EventStatus;
        level?: EventLevel;
        event_type?: EventType;
        starts_at?: { gte?: Date; lte?: Date };
      } = {};

      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { slug: { contains: search, mode: "insensitive" } },
          { instructor: { contains: search, mode: "insensitive" } },
          { location: { contains: search, mode: "insensitive" } },
        ];
      }

      if (status) {
        where.status = status;
      }

      if (level) {
        where.level = level;
      }

      if (eventType) {
        where.event_type = eventType;
      }

      // Handle date filtering - startDate and endDate take precedence over upcoming
      if (startDate || endDate) {
        where.starts_at = {};
        if (startDate) {
          where.starts_at.gte = new Date(startDate);
        }
        if (endDate) {
          where.starts_at.lte = new Date(endDate);
        }
      } else if (upcoming) {
        where.starts_at = { gte: new Date() };
      }

      const [events, total] = await Promise.all([
        ctx.prisma.event.findMany({
          where,
          skip,
          take: limit,
          orderBy: { starts_at: "desc" },
          select: {
            id: true,
            slug: true,
            title: true,
            description: true,
            event_type: true,
            starts_at: true,
            ends_at: true,
            location: true,
            total_seats: true,
            available_seats: true,
            instructor: true,
            price: true,
            image: true,
            status: true,
            level: true,
            performers: true,
            lineup_notes: true,
            created_at: true,
            _count: {
              select: {
                event_registrations: true,
                reviews: true,
              },
            },
          },
        }),
        ctx.prisma.event.count({ where }),
      ]);

      return {
        events: events as AdminEvent[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    });
  }

  @Query(() => AdminEventDetail, { nullable: true })
  @adminRequired()
  async adminEventById(
    @Ctx() ctx: Context,
    @Arg("id", () => String) id: string,
  ): Promise<AdminEventDetail | null> {
    return tryCatchAsync(async () => {
      const event = await ctx.prisma.event.findUnique({
        where: { id },
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          event_type: true,
          starts_at: true,
          ends_at: true,
          location: true,
          full_location: true,
          total_seats: true,
          available_seats: true,
          instructor: true,
          includes: true,
          price: true,
          image: true,
          highlights: true,
          gallery: true,
          status: true,
          level: true,
          performers: true,
          lineup_notes: true,
          created_at: true,
          updated_at: true,
          _count: {
            select: {
              event_registrations: true,
              reviews: true,
            },
          },
        },
      });

      return event as AdminEventDetail | null;
    });
  }

  @Query(() => AdminEventRegistrationsResponse)
  @adminRequired()
  async adminEventRegistrations(
    @Ctx() ctx: Context,
    @Arg("eventId", () => String) eventId: string,
  ): Promise<AdminEventRegistrationsResponse> {
    return tryCatchAsync(async () => {
      const registrations = await ctx.prisma.eventRegistration.findMany({
        where: { event_id: eventId },
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          status: true,
          seats_reserved: true,
          price: true,
          discount: true,
          created_at: true,
          request_at: true,
          approved_at: true,
          paid_at: true,
          confirmed_at: true,
          cancelled_at: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              phone: true,
            },
          },
        },
      });

      // Calculate status counts
      const statusCounts = {
        PENDING: 0,
        APPROVED: 0,
        REJECTED: 0,
        PAID: 0,
        CONFIRMED: 0,
        CANCELLED: 0,
      };

      for (const reg of registrations) {
        statusCounts[reg.status] = (statusCounts[reg.status] || 0) + 1;
      }

      return {
        registrations:
          registrations as unknown as AdminEventRegistrationsResponse["registrations"],
        total: registrations.length,
        statusCounts,
      };
    });
  }

  @Query(() => AdminEventReviewsResponse)
  @adminRequired()
  async adminEventReviews(
    @Ctx() ctx: Context,
    @Arg("eventId", () => String) eventId: string,
  ): Promise<AdminEventReviewsResponse> {
    return tryCatchAsync(async () => {
      const [reviews, aggregation] = await Promise.all([
        ctx.prisma.review.findMany({
          where: { event_id: eventId },
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
          where: { event_id: eventId },
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

  @Query(() => [AdminStatusOption])
  @adminRequired()
  async adminEventStatusOptions(): Promise<AdminStatusOption[]> {
    return [
      { value: EventStatus.UPCOMING, label: "Upcoming" },
      { value: EventStatus.ACTIVE, label: "Active" },
      { value: EventStatus.INACTIVE, label: "Inactive" },
      { value: EventStatus.COMPLETED, label: "Completed" },
      { value: EventStatus.CANCELLED, label: "Cancelled" },
    ];
  }

  @Query(() => [AdminLevelOption])
  @adminRequired()
  async adminEventLevelOptions(): Promise<AdminLevelOption[]> {
    return [
      { value: EventLevel.BEGINNER, label: "Beginner" },
      { value: EventLevel.INTERMEDIATE, label: "Intermediate" },
      { value: EventLevel.ADVANCED, label: "Advanced" },
    ];
  }

  @Query(() => [AdminEventTypeOption])
  @adminRequired()
  async adminEventTypeOptions(): Promise<AdminEventTypeOption[]> {
    return [
      { value: EventType.POTTERY_WORKSHOP, label: "Pottery Workshop" },
      { value: EventType.OPEN_MIC, label: "Open Mic" },
    ];
  }

  @Mutation(() => AdminEventMutationResponse)
  @adminRequired()
  async adminCreateEvent(
    @Ctx() ctx: Context,
    @Arg("input", () => CreateEventInput) input: CreateEventInput,
  ): Promise<AdminEventMutationResponse> {
    return tryCatchAsync(async () => {
      const {
        title,
        slug,
        description,
        event_type = EventType.POTTERY_WORKSHOP,
        starts_at,
        ends_at,
        location,
        full_location,
        total_seats,
        available_seats,
        instructor,
        includes = [],
        price,
        image,
        highlights = [],
        gallery = [],
        status = EventStatus.UPCOMING,
        level,
        performers = [],
        lineup_notes,
      } = input;

      // Validate slug uniqueness
      const existingEvent = await ctx.prisma.event.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (existingEvent) {
        return {
          success: false,
          eventId: null,
          error: "An event with this slug already exists",
        };
      }

      // Validate dates
      if (new Date(starts_at) >= new Date(ends_at)) {
        return {
          success: false,
          eventId: null,
          error: "End date must be after start date",
        };
      }

      // Validate type-specific required fields
      if (event_type === EventType.POTTERY_WORKSHOP) {
        if (!instructor) {
          return {
            success: false,
            eventId: null,
            error: "Instructor is required for pottery workshops",
          };
        }
      }

      return eventCache.withTransaction(ctx.prisma, async (tx) => {
        const event = await tx.event.create({
          data: {
            title,
            slug,
            description,
            event_type,
            starts_at,
            ends_at,
            location,
            full_location,
            total_seats,
            available_seats,
            instructor,
            includes,
            price,
            image,
            highlights,
            gallery,
            status,
            level,
            performers,
            lineup_notes,
          },
        });
        return { success: true, eventId: event.id, error: null };
      });
    });
  }

  @Mutation(() => AdminEventMutationResponse)
  @adminRequired()
  async adminUpdateEvent(
    @Ctx() ctx: Context,
    @Arg("id", () => String) id: string,
    @Arg("input", () => UpdateEventInput) input: UpdateEventInput,
  ): Promise<AdminEventMutationResponse> {
    return tryCatchAsync(async () => {
      // If slug is being updated, validate uniqueness
      if (input.slug) {
        const existingEvent = await ctx.prisma.event.findFirst({
          where: { slug: input.slug, NOT: { id } },
          select: { id: true },
        });

        if (existingEvent) {
          return {
            success: false,
            eventId: null,
            error: "An event with this slug already exists",
          };
        }
      }

      if (input.starts_at && input.ends_at) {
        if (new Date(input.starts_at) >= new Date(input.ends_at)) {
          return {
            success: false,
            eventId: null,
            error: "End date must be after start date",
          };
        }
      }

      return eventCache.withTransaction(ctx.prisma, async (tx) => {
        await tx.event.update({ where: { id }, data: input });
        return { success: true, eventId: id, error: null };
      });
    });
  }

  @Mutation(() => AdminEventMutationResponse)
  @adminRequired()
  async adminDeleteEvent(
    @Ctx() ctx: Context,
    @Arg("id", () => String) id: string,
  ): Promise<AdminEventMutationResponse> {
    return tryCatchAsync(async () => {
      const registrationCount = await ctx.prisma.eventRegistration.count({
        where: { event_id: id },
      });

      return eventCache.withTransaction(ctx.prisma, async (tx) => {
        if (registrationCount > 0) {
          await tx.event.update({
            where: { id },
            data: { status: EventStatus.CANCELLED },
          });
          return {
            success: true,
            eventId: id,
            error:
              "Event has registrations and was cancelled instead of deleted. This keeps registration history intact.",
          };
        }
        await tx.event.delete({ where: { id } });
        return { success: true, eventId: null, error: null };
      });
    });
  }

  @Mutation(() => AdminEventMutationResponse)
  @adminRequired()
  async adminUpdateEventStatus(
    @Ctx() ctx: Context,
    @Arg("id", () => String) id: string,
    @Arg("status", () => String) statusStr: string,
  ): Promise<AdminEventMutationResponse> {
    return tryCatchAsync(async () => {
      const status = statusStr as EventStatus;

      return eventCache.withTransaction(ctx.prisma, async (tx) => {
        await tx.event.update({ where: { id }, data: { status } });
        return { success: true, eventId: id, error: null };
      });
    });
  }

  @Mutation(() => AdminEventMutationResponse)
  @adminRequired()
  async adminDeleteEventReview(
    @Ctx() ctx: Context,
    @Arg("reviewId", () => Int) reviewId: number,
  ): Promise<AdminEventMutationResponse> {
    return tryCatchAsync(async () => {
      const review = await ctx.prisma.review.findUnique({
        where: { id: reviewId },
        select: { event_id: true },
      });

      if (!review) {
        return { success: false, eventId: null, error: "Review not found" };
      }

      await ctx.prisma.review.delete({
        where: { id: reviewId },
      });

      return {
        success: true,
        eventId: review.event_id,
        error: null,
      };
    });
  }

  @Mutation(() => AdminBulkDeleteEventsResponse)
  @adminRequired()
  async adminBulkDeleteEvents(
    @Ctx() ctx: Context,
    @Arg("input", () => BulkDeleteEventsInput) input: BulkDeleteEventsInput,
  ): Promise<AdminBulkDeleteEventsResponse> {
    return tryCatchAsync(async () => {
      const results: AdminBulkDeleteEventsResponse["results"] = [];
      let deletedCount = 0;
      let cancelledCount = 0;
      let failedCount = 0;

      for (const id of input.ids) {
        try {
          const registrationCount = await ctx.prisma.eventRegistration.count({
            where: { event_id: id },
          });

          if (registrationCount > 0) {
            await ctx.prisma.event.update({
              where: { id },
              data: { status: EventStatus.CANCELLED },
            });
            results.push({
              id,
              success: true,
              action: "cancelled",
              error: "Event has registrations and was cancelled instead",
            });
            cancelledCount++;
          } else {
            await ctx.prisma.event.delete({
              where: { id },
            });
            results.push({
              id,
              success: true,
              action: "deleted",
              error: null,
            });
            deletedCount++;
          }
        } catch (error) {
          results.push({
            id,
            success: false,
            action: "failed",
            error: error instanceof Error ? error.message : "Unknown error",
          });
          failedCount++;
        }
      }

      return {
        success: failedCount === 0,
        totalRequested: input.ids.length,
        deletedCount,
        cancelledCount,
        failedCount,
        results,
        error:
          failedCount > 0 ? `${failedCount} events failed to process` : null,
      };
    });
  }
}
