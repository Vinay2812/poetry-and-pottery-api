import { GraphQLDateTime } from "graphql-scalars";
import { Field, Float, Int, ObjectType } from "type-graphql";

import {
  EventRegistrationStatus,
  OrderStatus,
} from "@/prisma/generated/client";

@ObjectType()
export class OrdersStats {
  @Field(() => Int)
  pending!: number;

  @Field(() => Int)
  processing!: number;

  @Field(() => Int)
  total!: number;
}

@ObjectType()
export class RegistrationsStats {
  @Field(() => Int)
  pending!: number;

  @Field(() => Int)
  total!: number;
}

@ObjectType()
export class ProductsStats {
  @Field(() => Int)
  outOfStock!: number;

  @Field(() => Int)
  lowStock!: number;

  @Field(() => Int)
  total!: number;
}

@ObjectType()
export class EventsStats {
  @Field(() => Int)
  upcoming!: number;

  @Field(() => Int)
  upcomingIn7Days!: number;

  @Field(() => Int)
  total!: number;
}

@ObjectType()
export class UsersStats {
  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  newThisMonth!: number;
}

@ObjectType()
export class RevenueStats {
  @Field(() => Float)
  totalOrders!: number;

  @Field(() => Float)
  totalRegistrations!: number;
}

@ObjectType()
export class NewsletterStats {
  @Field(() => Int)
  totalSubscribers!: number;

  @Field(() => Int)
  newThisMonth!: number;
}

@ObjectType()
export class DashboardStats {
  @Field(() => OrdersStats)
  orders!: OrdersStats;

  @Field(() => RegistrationsStats)
  registrations!: RegistrationsStats;

  @Field(() => ProductsStats)
  products!: ProductsStats;

  @Field(() => EventsStats)
  events!: EventsStats;

  @Field(() => UsersStats)
  users!: UsersStats;

  @Field(() => RevenueStats)
  revenue!: RevenueStats;

  @Field(() => NewsletterStats)
  newsletter!: NewsletterStats;
}

@ObjectType()
export class RecentOrderUser {
  @Field(() => String, { nullable: true })
  name?: string | null;

  @Field(() => String)
  email!: string;
}

@ObjectType()
export class RecentOrder {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  status!: string;

  @Field(() => Float)
  total!: number;

  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @Field(() => RecentOrderUser)
  user!: RecentOrderUser;
}

@ObjectType()
export class RecentRegistrationUser {
  @Field(() => String, { nullable: true })
  name?: string | null;

  @Field(() => String)
  email!: string;
}

@ObjectType()
export class RecentRegistrationEvent {
  @Field(() => String)
  title!: string;
}

@ObjectType()
export class RecentRegistration {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  status!: string;

  @Field(() => Float)
  price!: number;

  @Field(() => Int)
  seats_reserved!: number;

  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @Field(() => RecentRegistrationUser)
  user!: RecentRegistrationUser;

  @Field(() => RecentRegistrationEvent)
  event!: RecentRegistrationEvent;
}

@ObjectType()
export class LowStockProduct {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  slug!: string;

  @Field(() => Int)
  available_quantity!: number;

  @Field(() => Int)
  total_quantity!: number;

  @Field(() => Float)
  price!: number;
}

@ObjectType()
export class UpcomingEventCount {
  @Field(() => Int)
  event_registrations!: number;
}

@ObjectType()
export class UpcomingEvent {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String)
  slug!: string;

  @Field(() => GraphQLDateTime)
  starts_at!: Date;

  @Field(() => Int)
  available_seats!: number;

  @Field(() => Int)
  total_seats!: number;

  @Field(() => UpcomingEventCount)
  _count!: UpcomingEventCount;
}

@ObjectType()
export class NewsletterSubscriber {
  @Field(() => Int)
  id!: number;

  @Field(() => String, { nullable: true })
  name?: string | null;

  @Field(() => String)
  email!: string;

  @Field(() => String, { nullable: true })
  image?: string | null;

  @Field(() => GraphQLDateTime, { nullable: true })
  newsletter_subscribed_at?: Date | null;
}
