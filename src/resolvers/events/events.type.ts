import { GraphQLDateTime } from "graphql-scalars";
import {
  Field,
  InputType,
  Int,
  ObjectType,
  registerEnumType,
} from "type-graphql";

// Register EventLevel enum for GraphQL
export enum EventLevel {
  BEGINNER = "BEGINNER",
  INTERMEDIATE = "INTERMEDIATE",
  ADVANCED = "ADVANCED",
}

registerEnumType(EventLevel, {
  name: "EventLevel",
  description: "The difficulty level of an event",
});

// Register EventStatus enum for GraphQL
export enum EventStatus {
  UPCOMING = "UPCOMING",
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  CANCELLED = "CANCELLED",
  COMPLETED = "COMPLETED",
}

registerEnumType(EventStatus, {
  name: "EventStatus",
  description: "The status of an event",
});

// Register EventRegistrationStatus enum for GraphQL
export enum EventRegistrationStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  PAID = "PAID",
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
}

registerEnumType(EventRegistrationStatus, {
  name: "EventRegistrationStatus",
  description: "The status of an event registration",
});

@ObjectType()
export class EventReviewUser {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  email!: string;

  @Field(() => String, { nullable: true })
  name?: string | null;

  @Field(() => String, { nullable: true })
  image?: string | null;
}

@ObjectType()
export class EventReviewLike {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  review_id!: number;

  @Field(() => Int)
  user_id!: number;
}

@ObjectType()
export class EventReview {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  user_id!: number;

  @Field(() => Int)
  rating!: number;

  @Field(() => String, { nullable: true })
  review?: string | null;

  @Field(() => [String])
  image_urls!: string[];

  @Field(() => String, { nullable: true })
  event_id?: string | null;

  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @Field(() => GraphQLDateTime)
  updated_at!: Date;

  @Field(() => EventReviewUser)
  user!: EventReviewUser;

  @Field(() => [EventReviewLike])
  likes!: EventReviewLike[];
}

@ObjectType()
export class EventBase {
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

  @Field(() => Int)
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

  // Counts
  @Field(() => Int)
  registrations_count!: number;

  @Field(() => Int)
  reviews_count!: number;

  // Computed
  @Field(() => Number, { nullable: true })
  avg_rating?: number | null;
}

@ObjectType()
export class EventDetail extends EventBase {
  @Field(() => [EventReview])
  reviews!: EventReview[];

  // Whether the current user is registered for this event
  @Field(() => Boolean)
  is_registered!: boolean;
}

@ObjectType()
export class EventsResponse {
  @Field(() => [EventBase])
  data!: EventBase[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  total_pages!: number;

  @Field(() => [EventLevel])
  levels!: EventLevel[];
}

@InputType()
export class EventsFilterInput {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 12 })
  limit?: number;

  @Field(() => EventStatus, { nullable: true })
  status?: EventStatus;

  @Field(() => EventLevel, { nullable: true })
  level?: EventLevel;

  @Field(() => String, { nullable: true })
  search?: string;
}

// Registration types

@ObjectType()
export class RegistrationUser {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  email!: string;

  @Field(() => String, { nullable: true })
  name?: string | null;

  @Field(() => String, { nullable: true })
  image?: string | null;
}

@ObjectType()
export class RegistrationEvent {
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

  @Field(() => Int)
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
}

@ObjectType()
export class EventRegistration {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  event_id!: string;

  @Field(() => Int)
  user_id!: number;

  @Field(() => Int)
  seats_reserved!: number;

  @Field(() => Int)
  price!: number;

  @Field(() => Int)
  discount!: number;

  @Field(() => EventRegistrationStatus)
  status!: EventRegistrationStatus;

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

  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @Field(() => GraphQLDateTime)
  updated_at!: Date;

  @Field(() => RegistrationEvent)
  event!: RegistrationEvent;

  @Field(() => RegistrationUser)
  user!: RegistrationUser;

  // Whether the user has reviewed this event (for completed registrations)
  @Field(() => Boolean)
  has_reviewed!: boolean;
}

@ObjectType()
export class RegistrationsResponse {
  @Field(() => [EventRegistration])
  data!: EventRegistration[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  total_pages!: number;
}

@InputType()
export class RegistrationsFilterInput {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 12 })
  limit?: number;

  @Field(() => String, { nullable: true })
  search?: string;
}

@InputType()
export class RegisterForEventInput {
  @Field(() => String)
  eventId!: string;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  seats?: number;
}

@ObjectType()
export class RegisterForEventResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => EventRegistration, { nullable: true })
  registration?: EventRegistration | null;

  @Field(() => String, { nullable: true })
  error?: string | null;
}

@ObjectType()
export class CancelRegistrationResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String, { nullable: true })
  error?: string | null;
}

// Event with user context (for event detail page)
@ObjectType()
export class EventWithUserContext {
  @Field(() => EventDetail)
  event!: EventDetail;

  @Field(() => EventRegistration, { nullable: true })
  registration?: EventRegistration | null;

  @Field(() => Boolean)
  is_past_event!: boolean;

  @Field(() => Int, { nullable: true })
  current_user_id?: number | null;
}
