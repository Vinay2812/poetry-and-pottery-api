import { GraphQLError } from "graphql";
import { Arg, Ctx, Mutation, Query, Resolver } from "type-graphql";

import { authRequired } from "@/middlewares/auth.middleware";
import {
  EventLevel as PrismaEventLevel,
  EventRegistrationStatus as PrismaEventRegistrationStatus,
  EventStatus as PrismaEventStatus,
} from "@/prisma/generated/client";
import { Context } from "@/types/context";
import { tryCatchAsync } from "@/utils/trycatch";

import {
  CancelRegistrationResponse,
  EventBase,
  EventDetail,
  EventLevel,
  EventRegistration,
  EventRegistrationStatus,
  EventReview,
  EventReviewLike,
  EventReviewUser,
  EventStatus,
  EventWithUserContext,
  EventsFilterInput,
  EventsResponse,
  RegisterForEventInput,
  RegisterForEventResponse,
  RegistrationEvent,
  RegistrationUser,
  RegistrationsFilterInput,
  RegistrationsResponse,
} from "./events.type";

function getUserId(ctx: Context): number {
  const userId = ctx.user?.dbUserId;
  if (!userId) {
    throw new GraphQLError("User ID not found in context");
  }
  return userId;
}

function getUserIdOptional(ctx: Context): number | null {
  return ctx.user?.dbUserId ?? null;
}

function mapEventLevel(level: PrismaEventLevel): EventLevel {
  return level as EventLevel;
}

function mapEventStatus(status: PrismaEventStatus): EventStatus {
  return status as EventStatus;
}

function mapRegistrationStatus(
  status: PrismaEventRegistrationStatus,
): EventRegistrationStatus {
  return status as EventRegistrationStatus;
}

function mapReviewUser(user: {
  id: number;
  email: string;
  name: string | null;
  image: string | null;
}): EventReviewUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
  };
}

function mapReviewLike(like: {
  id: number;
  review_id: number;
  user_id: number;
}): EventReviewLike {
  return {
    id: like.id,
    review_id: like.review_id,
    user_id: like.user_id,
  };
}

function mapReview(review: {
  id: number;
  user_id: number;
  rating: number;
  review: string | null;
  image_urls: string[];
  event_id: string | null;
  created_at: Date;
  updated_at: Date;
  user: {
    id: number;
    email: string;
    name: string | null;
    image: string | null;
  };
  likes: {
    id: number;
    review_id: number;
    user_id: number;
  }[];
}): EventReview {
  return {
    id: review.id,
    user_id: review.user_id,
    rating: review.rating,
    review: review.review,
    image_urls: review.image_urls,
    event_id: review.event_id,
    created_at: review.created_at,
    updated_at: review.updated_at,
    user: mapReviewUser(review.user),
    likes: review.likes.map(mapReviewLike),
  };
}

function mapEventBase(
  event: {
    id: string;
    slug: string;
    title: string;
    description: string;
    starts_at: Date;
    ends_at: Date;
    location: string;
    full_location: string;
    total_seats: number;
    available_seats: number;
    instructor: string;
    includes: string[];
    price: number;
    image: string;
    highlights: string[];
    gallery: string[];
    status: PrismaEventStatus;
    level: PrismaEventLevel;
    created_at: Date;
    updated_at: Date;
    _count: {
      event_registrations: number;
      reviews: number;
    };
  },
  avgRating: number | null,
): EventBase {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    description: event.description,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    location: event.location,
    full_location: event.full_location,
    total_seats: event.total_seats,
    available_seats: event.available_seats,
    instructor: event.instructor,
    includes: event.includes,
    price: event.price,
    image: event.image,
    highlights: event.highlights,
    gallery: event.gallery,
    status: mapEventStatus(event.status),
    level: mapEventLevel(event.level),
    created_at: event.created_at,
    updated_at: event.updated_at,
    registrations_count: event._count.event_registrations,
    reviews_count: event._count.reviews,
    avg_rating: avgRating,
  };
}

function mapRegistrationEvent(event: {
  id: string;
  slug: string;
  title: string;
  description: string;
  starts_at: Date;
  ends_at: Date;
  location: string;
  full_location: string;
  total_seats: number;
  available_seats: number;
  instructor: string;
  includes: string[];
  price: number;
  image: string;
  highlights: string[];
  gallery: string[];
  status: PrismaEventStatus;
  level: PrismaEventLevel;
  created_at: Date;
  updated_at: Date;
}): RegistrationEvent {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    description: event.description,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    location: event.location,
    full_location: event.full_location,
    total_seats: event.total_seats,
    available_seats: event.available_seats,
    instructor: event.instructor,
    includes: event.includes,
    price: event.price,
    image: event.image,
    highlights: event.highlights,
    gallery: event.gallery,
    status: mapEventStatus(event.status),
    level: mapEventLevel(event.level),
    created_at: event.created_at,
    updated_at: event.updated_at,
  };
}

function mapRegistrationUser(user: {
  id: number;
  email: string;
  name: string | null;
  image: string | null;
}): RegistrationUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
  };
}

function mapRegistration(
  registration: {
    id: string;
    event_id: string;
    user_id: number;
    seats_reserved: number;
    price: number;
    discount: number;
    status: PrismaEventRegistrationStatus;
    request_at: Date | null;
    approved_at: Date | null;
    paid_at: Date | null;
    confirmed_at: Date | null;
    cancelled_at: Date | null;
    created_at: Date;
    updated_at: Date;
    event: {
      id: string;
      slug: string;
      title: string;
      description: string;
      starts_at: Date;
      ends_at: Date;
      location: string;
      full_location: string;
      total_seats: number;
      available_seats: number;
      instructor: string;
      includes: string[];
      price: number;
      image: string;
      highlights: string[];
      gallery: string[];
      status: PrismaEventStatus;
      level: PrismaEventLevel;
      created_at: Date;
      updated_at: Date;
    };
    user: {
      id: number;
      email: string;
      name: string | null;
      image: string | null;
    };
  },
  hasReviewed: boolean = false,
): EventRegistration {
  return {
    id: registration.id,
    event_id: registration.event_id,
    user_id: registration.user_id,
    seats_reserved: registration.seats_reserved,
    price: registration.price,
    discount: registration.discount,
    status: mapRegistrationStatus(registration.status),
    request_at: registration.request_at,
    approved_at: registration.approved_at,
    paid_at: registration.paid_at,
    confirmed_at: registration.confirmed_at,
    cancelled_at: registration.cancelled_at,
    created_at: registration.created_at,
    updated_at: registration.updated_at,
    event: mapRegistrationEvent(registration.event),
    user: mapRegistrationUser(registration.user),
    has_reviewed: hasReviewed,
  };
}

@Resolver()
export class EventsResolver {
  // ============ QUERIES ============

  @Query(() => EventsResponse)
  async events(
    @Ctx() ctx: Context,
    @Arg("filter", () => EventsFilterInput, { nullable: true })
    filter?: EventsFilterInput,
  ): Promise<EventsResponse> {
    return tryCatchAsync(async () => {
      const page = filter?.page ?? 1;
      const limit = filter?.limit ?? 12;

      const where: {
        status?: PrismaEventStatus;
        level?: PrismaEventLevel;
        title?: { contains: string; mode: "insensitive" };
      } = {};

      if (filter?.status) {
        where.status = filter.status as PrismaEventStatus;
      }

      if (filter?.level) {
        where.level = filter.level as PrismaEventLevel;
      }

      if (filter?.search) {
        where.title = { contains: filter.search, mode: "insensitive" };
      }

      const [events, total, levelsResult] = await Promise.all([
        ctx.prisma.event.findMany({
          where,
          include: {
            _count: {
              select: { event_registrations: true, reviews: true },
            },
            reviews: { select: { rating: true } },
          },
          orderBy: { starts_at: "asc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.prisma.event.count({ where }),
        ctx.prisma.event.findMany({
          distinct: ["level"],
          select: { level: true },
        }),
      ]);

      // Calculate average rating for each event
      const eventsWithRating = events.map((event) => {
        const { reviews, ...rest } = event;
        const avgRating =
          reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : null;
        return mapEventBase(rest as typeof event, avgRating);
      });

      return {
        data: eventsWithRating,
        total,
        page,
        total_pages: Math.ceil(total / limit),
        levels: levelsResult.map((l) => mapEventLevel(l.level)),
      };
    });
  }

  @Query(() => EventDetail, { nullable: true })
  async eventBySlug(
    @Ctx() ctx: Context,
    @Arg("slug", () => String) slug: string,
  ): Promise<EventDetail | null> {
    return tryCatchAsync(async () => {
      const userId = getUserIdOptional(ctx);

      const event = await ctx.prisma.event.findUnique({
        where: { slug },
        include: {
          reviews: {
            include: {
              user: {
                select: { id: true, email: true, name: true, image: true },
              },
              likes: true,
            },
            orderBy: { created_at: "desc" },
            take: 10,
          },
          _count: {
            select: { reviews: true, event_registrations: true },
          },
        },
      });

      if (!event) {
        return null;
      }

      // Check if user is registered for this event
      let isRegistered = false;
      if (userId) {
        const registration = await ctx.prisma.eventRegistration.findUnique({
          where: {
            event_id_user_id: {
              event_id: event.id,
              user_id: userId,
            },
          },
        });
        isRegistered = !!registration;
      }

      // Calculate average rating
      const avgRating =
        event.reviews.length > 0
          ? event.reviews.reduce((sum, r) => sum + r.rating, 0) /
            event.reviews.length
          : null;

      return {
        ...mapEventBase(event, avgRating),
        reviews: event.reviews.map(mapReview),
        is_registered: isRegistered,
      };
    });
  }

  @Query(() => EventDetail, { nullable: true })
  async eventById(
    @Ctx() ctx: Context,
    @Arg("id", () => String) id: string,
  ): Promise<EventDetail | null> {
    return tryCatchAsync(async () => {
      const userId = getUserIdOptional(ctx);

      const event = await ctx.prisma.event.findUnique({
        where: { id },
        include: {
          reviews: {
            include: {
              user: {
                select: { id: true, email: true, name: true, image: true },
              },
              likes: true,
            },
            orderBy: { created_at: "desc" },
            take: 10,
          },
          _count: {
            select: { reviews: true, event_registrations: true },
          },
        },
      });

      if (!event) {
        return null;
      }

      // Check if user is registered for this event
      let isRegistered = false;
      if (userId) {
        const registration = await ctx.prisma.eventRegistration.findUnique({
          where: {
            event_id_user_id: {
              event_id: event.id,
              user_id: userId,
            },
          },
        });
        isRegistered = !!registration;
      }

      // Calculate average rating
      const avgRating =
        event.reviews.length > 0
          ? event.reviews.reduce((sum, r) => sum + r.rating, 0) /
            event.reviews.length
          : null;

      return {
        ...mapEventBase(event, avgRating),
        reviews: event.reviews.map(mapReview),
        is_registered: isRegistered,
      };
    });
  }

  @Query(() => EventsResponse)
  async upcomingEvents(
    @Ctx() ctx: Context,
    @Arg("filter", () => EventsFilterInput, { nullable: true })
    filter?: EventsFilterInput,
  ): Promise<EventsResponse> {
    return tryCatchAsync(async () => {
      const userId = getUserIdOptional(ctx);
      const page = filter?.page ?? 1;
      const limit = filter?.limit ?? 12;

      // Get user's registered event IDs
      let userEventRegistrationIds: string[] = [];
      if (userId) {
        const userRegistrations = await ctx.prisma.eventRegistration.findMany({
          where: { user_id: userId },
          select: { event_id: true },
        });
        userEventRegistrationIds = userRegistrations.map((r) => r.event_id);
      }

      const where: {
        starts_at: { gte: Date };
        status: { in: PrismaEventStatus[] };
        id?: { notIn: string[] };
        title?: { contains: string; mode: "insensitive" };
      } = {
        starts_at: { gte: new Date() },
        status: { in: [PrismaEventStatus.UPCOMING, PrismaEventStatus.ACTIVE] },
      };

      // Exclude events the user is already registered for
      if (userEventRegistrationIds.length > 0) {
        where.id = { notIn: userEventRegistrationIds };
      }

      if (filter?.search) {
        where.title = { contains: filter.search, mode: "insensitive" };
      }

      const [events, total, levelsResult] = await Promise.all([
        ctx.prisma.event.findMany({
          where,
          include: {
            _count: {
              select: { event_registrations: true, reviews: true },
            },
          },
          orderBy: { starts_at: "asc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.prisma.event.count({ where }),
        ctx.prisma.event.findMany({
          distinct: ["level"],
          select: { level: true },
        }),
      ]);

      return {
        data: events.map((event) => mapEventBase(event, null)),
        total,
        page,
        total_pages: Math.ceil(total / limit),
        levels: levelsResult.map((l) => mapEventLevel(l.level)),
      };
    });
  }

  @Query(() => EventsResponse)
  async pastEvents(
    @Ctx() ctx: Context,
    @Arg("filter", () => EventsFilterInput, { nullable: true })
    filter?: EventsFilterInput,
  ): Promise<EventsResponse> {
    return tryCatchAsync(async () => {
      const page = filter?.page ?? 1;
      const limit = filter?.limit ?? 12;

      const baseWhere = {
        OR: [
          { status: PrismaEventStatus.COMPLETED },
          { ends_at: { lt: new Date() } },
        ],
      };

      const where = filter?.search
        ? {
            AND: [
              baseWhere,
              {
                title: {
                  contains: filter.search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : baseWhere;

      const [events, total, levelsResult] = await Promise.all([
        ctx.prisma.event.findMany({
          where,
          include: {
            _count: {
              select: { event_registrations: true, reviews: true },
            },
            reviews: { select: { rating: true } },
          },
          orderBy: { starts_at: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.prisma.event.count({ where }),
        ctx.prisma.event.findMany({
          distinct: ["level"],
          select: { level: true },
        }),
      ]);

      // Calculate average rating for each event
      const eventsWithRating = events.map((event) => {
        const { reviews, ...rest } = event;
        const avgRating =
          reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : null;
        return mapEventBase(rest as typeof event, avgRating);
      });

      return {
        data: eventsWithRating,
        total,
        page,
        total_pages: Math.ceil(total / limit),
        levels: levelsResult.map((l) => mapEventLevel(l.level)),
      };
    });
  }

  @Query(() => EventWithUserContext, { nullable: true })
  async eventWithUserContext(
    @Ctx() ctx: Context,
    @Arg("eventId", () => String) eventId: string,
  ): Promise<EventWithUserContext | null> {
    return tryCatchAsync(async () => {
      const userId = getUserIdOptional(ctx);

      const event = await ctx.prisma.event.findUnique({
        where: { id: eventId },
        include: {
          reviews: {
            include: {
              user: {
                select: { id: true, email: true, name: true, image: true },
              },
              likes: true,
            },
            orderBy: { created_at: "desc" },
            take: 10,
          },
          _count: {
            select: { reviews: true, event_registrations: true },
          },
        },
      });

      if (!event) {
        return null;
      }

      // Check if event is past
      const now = new Date();
      const isPastEvent =
        event.status === PrismaEventStatus.COMPLETED || event.ends_at < now;

      // Calculate average rating
      const avgRating =
        event.reviews.length > 0
          ? event.reviews.reduce((sum, r) => sum + r.rating, 0) /
            event.reviews.length
          : null;

      // Get user's registration for this event if authenticated
      let registration: EventRegistration | null = null;
      let hasReviewed = false;
      if (userId) {
        const reg = await ctx.prisma.eventRegistration.findFirst({
          where: {
            event_id: eventId,
            user_id: userId,
          },
          include: {
            event: true,
            user: {
              select: { id: true, email: true, name: true, image: true },
            },
          },
        });

        if (reg) {
          // Check if user has reviewed this event
          const review = await ctx.prisma.review.findFirst({
            where: {
              user_id: userId,
              event_id: eventId,
            },
          });
          hasReviewed = !!review;
          registration = mapRegistration(reg, hasReviewed);
        }
      }

      return {
        event: {
          ...mapEventBase(event, avgRating),
          reviews: event.reviews.map(mapReview),
          is_registered: !!registration,
        },
        registration,
        is_past_event: isPastEvent,
        current_user_id: userId,
      };
    });
  }

  // ============ REGISTRATION QUERIES ============

  @Query(() => RegistrationsResponse)
  @authRequired()
  async userRegistrations(
    @Ctx() ctx: Context,
    @Arg("filter", () => RegistrationsFilterInput, { nullable: true })
    filter?: RegistrationsFilterInput,
  ): Promise<RegistrationsResponse> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);
      const page = filter?.page ?? 1;
      const limit = filter?.limit ?? 12;

      const where: {
        user_id: number;
        event?: { title: { contains: string; mode: "insensitive" } };
      } = { user_id: userId };

      if (filter?.search) {
        where.event = {
          title: { contains: filter.search, mode: "insensitive" },
        };
      }

      const [registrations, total] = await Promise.all([
        ctx.prisma.eventRegistration.findMany({
          where,
          include: {
            event: true,
            user: {
              select: { id: true, email: true, name: true, image: true },
            },
          },
          orderBy: { created_at: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.prisma.eventRegistration.count({ where }),
      ]);

      return {
        data: registrations.map((reg) => mapRegistration(reg, false)),
        total,
        page,
        total_pages: Math.ceil(total / limit),
      };
    });
  }

  @Query(() => EventRegistration, { nullable: true })
  @authRequired()
  async registrationById(
    @Ctx() ctx: Context,
    @Arg("registrationId", () => String) registrationId: string,
  ): Promise<EventRegistration | null> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);

      const registration = await ctx.prisma.eventRegistration.findFirst({
        where: {
          id: registrationId,
          user_id: userId,
        },
        include: {
          event: true,
          user: {
            select: { id: true, email: true, name: true, image: true },
          },
        },
      });

      if (!registration) {
        return null;
      }

      // Check if user has reviewed this event
      const review = await ctx.prisma.review.findFirst({
        where: {
          user_id: userId,
          event_id: registration.event_id,
        },
      });

      return mapRegistration(registration, !!review);
    });
  }

  @Query(() => RegistrationsResponse)
  @authRequired()
  async upcomingRegistrations(
    @Ctx() ctx: Context,
    @Arg("filter", () => RegistrationsFilterInput, { nullable: true })
    filter?: RegistrationsFilterInput,
  ): Promise<RegistrationsResponse> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);
      const page = filter?.page ?? 1;
      const limit = filter?.limit ?? 12;
      const now = new Date();

      const baseWhere = {
        user_id: userId,
        event: {
          ends_at: { gt: now },
        },
      };

      const where = filter?.search
        ? {
            ...baseWhere,
            AND: [
              {
                OR: [
                  {
                    event: {
                      title: {
                        contains: filter.search,
                        mode: "insensitive" as const,
                      },
                    },
                  },
                ],
              },
            ],
          }
        : baseWhere;

      const [registrations, total] = await Promise.all([
        ctx.prisma.eventRegistration.findMany({
          where,
          include: {
            event: true,
            user: {
              select: { id: true, email: true, name: true, image: true },
            },
          },
          orderBy: { event: { starts_at: "asc" } },
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.prisma.eventRegistration.count({ where }),
      ]);

      return {
        data: registrations.map((reg) => mapRegistration(reg, false)),
        total,
        page,
        total_pages: Math.ceil(total / limit),
      };
    });
  }

  @Query(() => RegistrationsResponse)
  @authRequired()
  async completedRegistrations(
    @Ctx() ctx: Context,
    @Arg("filter", () => RegistrationsFilterInput, { nullable: true })
    filter?: RegistrationsFilterInput,
  ): Promise<RegistrationsResponse> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);
      const page = filter?.page ?? 1;
      const limit = filter?.limit ?? 12;
      const now = new Date();

      const where = {
        user_id: userId,
        event: {
          ends_at: { lte: now },
        },
      };

      const [registrations, total] = await Promise.all([
        ctx.prisma.eventRegistration.findMany({
          where,
          include: {
            event: true,
            user: {
              select: { id: true, email: true, name: true, image: true },
            },
          },
          orderBy: { event: { ends_at: "desc" } },
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.prisma.eventRegistration.count({ where }),
      ]);

      // If no registrations, return early
      if (registrations.length === 0) {
        return { data: [], total: 0, page, total_pages: 0 };
      }

      // Check if user has reviewed each event
      const eventIds = registrations.map((r) => r.event_id);
      const userReviews = await ctx.prisma.review.findMany({
        where: {
          user_id: userId,
          event_id: { in: eventIds },
        },
        select: { event_id: true },
      });

      // Create a Set of event IDs that have been reviewed
      const reviewedEventIds = new Set<string>();
      for (const review of userReviews) {
        if (review.event_id) {
          reviewedEventIds.add(review.event_id);
        }
      }

      return {
        data: registrations.map((reg) =>
          mapRegistration(reg, reviewedEventIds.has(reg.event_id)),
        ),
        total,
        page,
        total_pages: Math.ceil(total / limit),
      };
    });
  }

  // ============ MUTATIONS ============

  @Mutation(() => RegisterForEventResponse)
  @authRequired()
  async registerForEvent(
    @Ctx() ctx: Context,
    @Arg("input", () => RegisterForEventInput) input: RegisterForEventInput,
  ): Promise<RegisterForEventResponse> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);
      const seats = input.seats ?? 1;

      // Check if already registered
      const existing = await ctx.prisma.eventRegistration.findUnique({
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
          registration: null,
          error: "Already registered for this event",
        };
      }

      // Get event details
      const event = await ctx.prisma.event.findUnique({
        where: { id: input.eventId },
        select: { price: true, available_seats: true },
      });

      if (!event) {
        return {
          success: false,
          registration: null,
          error: "Event not found",
        };
      }

      if (event.available_seats < seats) {
        return {
          success: false,
          registration: null,
          error: "Not enough seats available",
        };
      }

      // Create registration with PENDING status and update available seats
      const [registration] = await ctx.prisma.$transaction([
        ctx.prisma.eventRegistration.create({
          data: {
            event_id: input.eventId,
            user_id: userId,
            seats_reserved: seats,
            price: event.price * seats,
            status: PrismaEventRegistrationStatus.PENDING,
            request_at: new Date(),
          },
          include: {
            event: true,
            user: {
              select: { id: true, email: true, name: true, image: true },
            },
          },
        }),
        ctx.prisma.event.update({
          where: { id: input.eventId },
          data: {
            available_seats: { decrement: seats },
          },
        }),
      ]);

      return {
        success: true,
        registration: mapRegistration(registration, false),
        error: null,
      };
    });
  }

  @Mutation(() => CancelRegistrationResponse)
  @authRequired()
  async cancelRegistration(
    @Ctx() ctx: Context,
    @Arg("registrationId", () => String) registrationId: string,
  ): Promise<CancelRegistrationResponse> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);

      const registration = await ctx.prisma.eventRegistration.findFirst({
        where: {
          id: registrationId,
          user_id: userId,
        },
      });

      if (!registration) {
        return {
          success: false,
          error: "Registration not found",
        };
      }

      await ctx.prisma.$transaction([
        ctx.prisma.eventRegistration.delete({
          where: { id: registrationId },
        }),
        ctx.prisma.event.update({
          where: { id: registration.event_id },
          data: {
            available_seats: { increment: registration.seats_reserved },
          },
        }),
      ]);

      return {
        success: true,
        error: null,
      };
    });
  }
}
