import { GraphQLDateTime } from "graphql-scalars";
import { Field, Float, InputType, Int, ObjectType } from "type-graphql";

import {
  EventLevel,
  EventRegistrationStatus,
  EventStatus,
} from "@/resolvers/events/events.type";

@ObjectType()
export class AdminEventCount {
  @Field(() => Int)
  event_registrations!: number;

  @Field(() => Int)
  reviews!: number;
}

@ObjectType()
export class AdminEvent {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  slug!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String)
  description!: string;

  @Field(() => GraphQLDateTime)
  starts_at!: Date;

  @Field(() => GraphQLDateTime)
  ends_at!: Date;

  @Field(() => String)
  location!: string;

  @Field(() => Int)
  total_seats!: number;

  @Field(() => Int)
  available_seats!: number;

  @Field(() => String)
  instructor!: string;

  @Field(() => Float)
  price!: number;

  @Field(() => String)
  image!: string;

  @Field(() => EventStatus)
  status!: EventStatus;

  @Field(() => EventLevel)
  level!: EventLevel;

  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @Field(() => AdminEventCount)
  _count!: AdminEventCount;
}

@ObjectType()
export class AdminEventDetail {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  slug!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String)
  description!: string;

  @Field(() => GraphQLDateTime)
  starts_at!: Date;

  @Field(() => GraphQLDateTime)
  ends_at!: Date;

  @Field(() => String)
  location!: string;

  @Field(() => String)
  full_location!: string;

  @Field(() => Int)
  total_seats!: number;

  @Field(() => Int)
  available_seats!: number;

  @Field(() => String)
  instructor!: string;

  @Field(() => [String])
  includes!: string[];

  @Field(() => Float)
  price!: number;

  @Field(() => String)
  image!: string;

  @Field(() => [String])
  highlights!: string[];

  @Field(() => [String])
  gallery!: string[];

  @Field(() => EventStatus)
  status!: EventStatus;

  @Field(() => EventLevel)
  level!: EventLevel;

  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @Field(() => GraphQLDateTime)
  updated_at!: Date;

  @Field(() => AdminEventCount)
  _count!: AdminEventCount;
}

@InputType()
export class AdminEventsFilterInput {
  @Field(() => String, { nullable: true })
  search?: string;

  @Field(() => EventStatus, { nullable: true })
  status?: EventStatus;

  @Field(() => EventLevel, { nullable: true })
  level?: EventLevel;

  @Field(() => Boolean, { nullable: true })
  upcoming?: boolean;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  limit?: number;
}

@ObjectType()
export class AdminEventsResponse {
  @Field(() => [AdminEvent])
  events!: AdminEvent[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  limit!: number;

  @Field(() => Int)
  totalPages!: number;
}

@InputType()
export class CreateEventInput {
  @Field(() => String)
  title!: string;

  @Field(() => String)
  slug!: string;

  @Field(() => String)
  description!: string;

  @Field(() => GraphQLDateTime)
  starts_at!: Date;

  @Field(() => GraphQLDateTime)
  ends_at!: Date;

  @Field(() => String)
  location!: string;

  @Field(() => String)
  full_location!: string;

  @Field(() => Int)
  total_seats!: number;

  @Field(() => Int)
  available_seats!: number;

  @Field(() => String)
  instructor!: string;

  @Field(() => [String], { nullable: true })
  includes?: string[];

  @Field(() => Float)
  price!: number;

  @Field(() => String)
  image!: string;

  @Field(() => [String], { nullable: true })
  highlights?: string[];

  @Field(() => [String], { nullable: true })
  gallery?: string[];

  @Field(() => EventStatus, { nullable: true })
  status?: EventStatus;

  @Field(() => EventLevel, { nullable: true })
  level?: EventLevel;
}

@InputType()
export class UpdateEventInput {
  @Field(() => String, { nullable: true })
  title?: string;

  @Field(() => String, { nullable: true })
  slug?: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => GraphQLDateTime, { nullable: true })
  starts_at?: Date;

  @Field(() => GraphQLDateTime, { nullable: true })
  ends_at?: Date;

  @Field(() => String, { nullable: true })
  location?: string;

  @Field(() => String, { nullable: true })
  full_location?: string;

  @Field(() => Int, { nullable: true })
  total_seats?: number;

  @Field(() => Int, { nullable: true })
  available_seats?: number;

  @Field(() => String, { nullable: true })
  instructor?: string;

  @Field(() => [String], { nullable: true })
  includes?: string[];

  @Field(() => Float, { nullable: true })
  price?: number;

  @Field(() => String, { nullable: true })
  image?: string;

  @Field(() => [String], { nullable: true })
  highlights?: string[];

  @Field(() => [String], { nullable: true })
  gallery?: string[];

  @Field(() => EventStatus, { nullable: true })
  status?: EventStatus;

  @Field(() => EventLevel, { nullable: true })
  level?: EventLevel;
}

@ObjectType()
export class AdminEventMutationResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String, { nullable: true })
  eventId?: string | null;

  @Field(() => String, { nullable: true })
  error?: string | null;
}

@ObjectType()
export class AdminRegistrationUser {
  @Field(() => Int)
  id!: number;

  @Field(() => String, { nullable: true })
  name?: string | null;

  @Field(() => String)
  email!: string;

  @Field(() => String, { nullable: true })
  image?: string | null;

  @Field(() => String, { nullable: true })
  phone?: string | null;
}

@ObjectType()
export class AdminEventRegistration {
  @Field(() => String)
  id!: string;

  @Field(() => EventRegistrationStatus)
  status!: EventRegistrationStatus;

  @Field(() => Int)
  seats_reserved!: number;

  @Field(() => Float)
  price!: number;

  @Field(() => Float)
  discount!: number;

  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @Field(() => GraphQLDateTime, { nullable: true })
  request_at?: Date | null;

  @Field(() => GraphQLDateTime, { nullable: true })
  approved_at?: Date | null;

  @Field(() => GraphQLDateTime, { nullable: true })
  paid_at?: Date | null;

  @Field(() => GraphQLDateTime, { nullable: true })
  confirmed_at?: Date | null;

  @Field(() => GraphQLDateTime, { nullable: true })
  cancelled_at?: Date | null;

  @Field(() => AdminRegistrationUser)
  user!: AdminRegistrationUser;
}

@ObjectType()
export class AdminRegistrationStatusCount {
  @Field(() => Int)
  PENDING!: number;

  @Field(() => Int)
  APPROVED!: number;

  @Field(() => Int)
  REJECTED!: number;

  @Field(() => Int)
  PAID!: number;

  @Field(() => Int)
  CONFIRMED!: number;

  @Field(() => Int)
  CANCELLED!: number;
}

@ObjectType()
export class AdminEventRegistrationsResponse {
  @Field(() => [AdminEventRegistration])
  registrations!: AdminEventRegistration[];

  @Field(() => Int)
  total!: number;

  @Field(() => AdminRegistrationStatusCount)
  statusCounts!: AdminRegistrationStatusCount;
}

@ObjectType()
export class AdminEventReviewUser {
  @Field(() => Int)
  id!: number;

  @Field(() => String, { nullable: true })
  name?: string | null;

  @Field(() => String)
  email!: string;

  @Field(() => String, { nullable: true })
  image?: string | null;
}

@ObjectType()
export class AdminEventReview {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  rating!: number;

  @Field(() => String, { nullable: true })
  review?: string | null;

  @Field(() => [String])
  image_urls!: string[];

  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @Field(() => AdminEventReviewUser)
  user!: AdminEventReviewUser;
}

@ObjectType()
export class AdminEventReviewsResponse {
  @Field(() => [AdminEventReview])
  reviews!: AdminEventReview[];

  @Field(() => Int)
  total!: number;

  @Field(() => Float)
  averageRating!: number;
}

@ObjectType()
export class AdminStatusOption {
  @Field(() => String)
  value!: string;

  @Field(() => String)
  label!: string;
}

@ObjectType()
export class AdminLevelOption {
  @Field(() => String)
  value!: string;

  @Field(() => String)
  label!: string;
}
