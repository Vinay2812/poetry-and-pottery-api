import { GraphQLError } from "graphql";
import { Arg, Ctx, Mutation, Query, Resolver } from "type-graphql";

import { authRequired } from "@/middlewares/auth.middleware";
import {
  Prisma,
  DailyWorkshopBlackoutType as PrismaDailyWorkshopBlackoutType,
  DailyWorkshopRegistrationStatus as PrismaDailyWorkshopRegistrationStatus,
} from "@/prisma/generated/client";
import { Context } from "@/types/context";
import { tryCatchAsync } from "@/utils/trycatch";

import { dailyWorkshopCache } from "./daily-workshops.cache";
import {
  CreateDailyWorkshopRegistrationInput,
  CreateDailyWorkshopRegistrationResponse,
  DailyWorkshopAvailabilityDay,
  DailyWorkshopAvailabilityInput,
  DailyWorkshopAvailabilityResponse,
  DailyWorkshopConfig,
  DailyWorkshopPricingTier,
  DailyWorkshopRegistration,
  DailyWorkshopRegistrationStatus,
  DailyWorkshopRegistrationsFilterInput,
  DailyWorkshopRegistrationsResponse,
  DailyWorkshopSlotAvailability,
  RescheduleDailyWorkshopRegistrationInput,
} from "./daily-workshops.type";

const ACTIVE_REGISTRATION_STATUSES: PrismaDailyWorkshopRegistrationStatus[] = [
  PrismaDailyWorkshopRegistrationStatus.PENDING,
  PrismaDailyWorkshopRegistrationStatus.APPROVED,
  PrismaDailyWorkshopRegistrationStatus.PAID,
  PrismaDailyWorkshopRegistrationStatus.CONFIRMED,
];

type DailyWorkshopConfigWithRelations = Prisma.DailyWorkshopConfigGetPayload<{
  include: {
    pricing_tiers: true;
    blackout_rules: true;
  };
}>;

type DailyWorkshopRegistrationWithSlots =
  Prisma.DailyWorkshopRegistrationGetPayload<{
    include: {
      slots: true;
    };
  }>;

type BlackoutRecoveryPayload = {
  pending_slot_start_times: string[];
  required_slots: number;
  window_start_minutes: number | null;
  window_end_minutes: number | null;
};

function getUserId(ctx: Context): number {
  const userId = ctx.user?.dbUserId;
  if (!userId) {
    throw new GraphQLError("User ID not found in context");
  }
  return userId;
}

function mapRegistrationStatus(
  status: PrismaDailyWorkshopRegistrationStatus,
): DailyWorkshopRegistrationStatus {
  return status as DailyWorkshopRegistrationStatus;
}

function mapPricingTier(
  tier: DailyWorkshopConfigWithRelations["pricing_tiers"][number],
): DailyWorkshopPricingTier {
  return {
    id: tier.id,
    config_id: tier.config_id,
    hours: tier.hours,
    price_per_person: tier.price_per_person,
    pieces_per_person: tier.pieces_per_person,
    sort_order: tier.sort_order,
    is_active: tier.is_active,
  };
}

function mapConfig(
  config: DailyWorkshopConfigWithRelations,
): DailyWorkshopConfig {
  return {
    id: config.id,
    key: config.key,
    name: config.name,
    description: config.description,
    is_active: config.is_active,
    timezone: config.timezone,
    opening_hour: config.opening_hour,
    closing_hour: config.closing_hour,
    slot_duration_minutes: config.slot_duration_minutes,
    slot_capacity: config.slot_capacity,
    booking_window_days: config.booking_window_days,
    auto_cancel_on_blackout: config.auto_cancel_on_blackout,
    pricing_tiers: config.pricing_tiers
      .filter((tier) => tier.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(mapPricingTier),
  };
}

function mapRegistration(
  registration: DailyWorkshopRegistrationWithSlots,
): DailyWorkshopRegistration {
  return {
    id: registration.id,
    config_id: registration.config_id,
    user_id: registration.user_id,
    participants: registration.participants,
    total_hours: registration.total_hours,
    slots_count: registration.slots_count,
    price_per_person: registration.price_per_person,
    pieces_per_person: registration.pieces_per_person,
    base_amount: registration.base_amount,
    discount: registration.discount,
    final_amount: registration.final_amount,
    total_pieces: registration.total_pieces,
    currency: registration.currency,
    pricing_snapshot:
      typeof registration.pricing_snapshot === "object" &&
      registration.pricing_snapshot !== null
        ? (registration.pricing_snapshot as object)
        : {},
    status: mapRegistrationStatus(registration.status),
    request_at: registration.request_at,
    approved_at: registration.approved_at,
    paid_at: registration.paid_at,
    confirmed_at: registration.confirmed_at,
    cancelled_at: registration.cancelled_at,
    cancelled_reason: registration.cancelled_reason,
    cancelled_by_user_id: registration.cancelled_by_user_id,
    cancelled_by_blackout_rule_id: registration.cancelled_by_blackout_rule_id,
    created_at: registration.created_at,
    updated_at: registration.updated_at,
    slots: registration.slots.map((slot) => ({
      id: slot.id,
      registration_id: slot.registration_id,
      slot_start_at: slot.slot_start_at,
      slot_end_at: slot.slot_end_at,
    })),
  };
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getTimeZoneParts(
  value: Date,
  timeZone: string,
): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
} {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hour12: false,
  });

  const parts = formatter.formatToParts(value);
  const map = new Map(parts.map((part) => [part.type, part.value]));
  const weekdayLabel = map.get("weekday") ?? "Sun";

  return {
    year: Number(map.get("year") ?? "1970"),
    month: Number(map.get("month") ?? "1"),
    day: Number(map.get("day") ?? "1"),
    hour: Number(map.get("hour") ?? "0"),
    minute: Number(map.get("minute") ?? "0"),
    second: Number(map.get("second") ?? "0"),
    weekday: WEEKDAY_INDEX[weekdayLabel] ?? 0,
  };
}

function getTimeZoneOffsetMinutes(value: Date, timeZone: string): number {
  const parts = getTimeZoneParts(value, timeZone);
  const utcFromZoned = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return (utcFromZoned - value.getTime()) / (60 * 1000);
}

function makeDateInTimeZone(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  let utcTime = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let date = new Date(utcTime);

  for (let i = 0; i < 2; i += 1) {
    const offsetMinutes = getTimeZoneOffsetMinutes(date, timeZone);
    utcTime =
      Date.UTC(year, month - 1, day, hour, minute, 0, 0) -
      offsetMinutes * 60 * 1000;
    date = new Date(utcTime);
  }

  return date;
}

function startOfDayInTimeZone(value: Date, timeZone: string): Date {
  const parts = getTimeZoneParts(value, timeZone);
  return makeDateInTimeZone(parts.year, parts.month, parts.day, 0, 0, timeZone);
}

function addDaysInTimeZone(value: Date, days: number, timeZone: string): Date {
  const parts = getTimeZoneParts(value, timeZone);
  const shifted = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + days),
  );
  return makeDateInTimeZone(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
    0,
    0,
    timeZone,
  );
}

function getMinutesOfDayInTimeZone(value: Date, timeZone: string): number {
  const parts = getTimeZoneParts(value, timeZone);
  return parts.hour * 60 + parts.minute;
}

function getDateKeyInTimeZone(value: Date, timeZone: string): string {
  const parts = getTimeZoneParts(value, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function getObjectRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function parseBlackoutRecoveryPayload(
  snapshot: unknown,
): BlackoutRecoveryPayload | null {
  const snapshotRecord = getObjectRecord(snapshot);
  if (!snapshotRecord) {
    return null;
  }

  const blackoutRecovery = getObjectRecord(snapshotRecord["blackout_recovery"]);
  if (!blackoutRecovery) {
    return null;
  }

  const rawPending = blackoutRecovery["pending_slot_start_times"];
  const pending_slot_start_times = Array.isArray(rawPending)
    ? rawPending
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    : [];

  const required_slots = Number(blackoutRecovery["required_slots"]);
  const windowStartMinutesRaw = Number(
    blackoutRecovery["window_start_minutes"],
  );
  const windowEndMinutesRaw = Number(blackoutRecovery["window_end_minutes"]);
  const normalizedRequiredSlots = Number.isNaN(required_slots)
    ? pending_slot_start_times.length
    : Math.max(1, required_slots);

  if (normalizedRequiredSlots < 1 && pending_slot_start_times.length < 1) {
    return null;
  }

  return {
    pending_slot_start_times,
    required_slots: normalizedRequiredSlots,
    window_start_minutes: Number.isNaN(windowStartMinutesRaw)
      ? null
      : windowStartMinutesRaw,
    window_end_minutes: Number.isNaN(windowEndMinutesRaw)
      ? null
      : windowEndMinutesRaw,
  };
}

function mergeBlackoutRecoveryPayload(
  snapshot: unknown,
  payload: BlackoutRecoveryPayload | null,
): Record<string, unknown> {
  const snapshotRecord = getObjectRecord(snapshot) ?? {};
  const nextSnapshot: Record<string, unknown> = { ...snapshotRecord };

  if (!payload) {
    delete nextSnapshot["blackout_recovery"];
    return nextSnapshot;
  }

  nextSnapshot["blackout_recovery"] = {
    pending_slot_start_times: payload.pending_slot_start_times,
    required_slots: payload.required_slots,
    window_start_minutes: payload.window_start_minutes,
    window_end_minutes: payload.window_end_minutes,
  };

  return nextSnapshot;
}

function inferPartialRecoverySlotCountFromReason(
  reason?: string | null,
): number {
  const text = reason?.trim();
  if (!text) {
    return 0;
  }

  if (!/\bsession(s)?\b/i.test(text) || !/\bcancelled\b/i.test(text)) {
    return 0;
  }

  const explicitCountMatch = [...text.matchAll(/\b(\d+)\s+session(s)?\b/gi)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (explicitCountMatch.length > 0) {
    return Math.max(...explicitCountMatch);
  }

  const explicitDates = text.match(
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}\b/g,
  );
  if (explicitDates && explicitDates.length > 0) {
    return explicitDates.length;
  }

  if (/remaining booked sessions are still active\./i.test(text)) {
    return 1;
  }

  return 1;
}

function toDateOnlyValueInTimeZone(value: Date, timeZone: string): number {
  const parts = getTimeZoneParts(value, timeZone);
  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

function overlapsRange(
  startMinutes: number,
  endMinutes: number,
  rangeStartMinutes: number,
  rangeEndMinutes: number,
): boolean {
  return startMinutes < rangeEndMinutes && endMinutes > rangeStartMinutes;
}

function isDateWithinRange(
  value: Date,
  timeZone: string,
  start?: Date | null,
  end?: Date | null,
): boolean {
  const date = toDateOnlyValueInTimeZone(value, timeZone);
  const startTime = start ? toDateOnlyValueInTimeZone(start, timeZone) : null;
  const endTime = end ? toDateOnlyValueInTimeZone(end, timeZone) : null;

  if (startTime !== null && date < startTime) {
    return false;
  }

  if (endTime !== null && date > endTime) {
    return false;
  }

  return true;
}

function isBlockedByRule(
  slotStart: Date,
  slotEnd: Date,
  timeZone: string,
  rule: DailyWorkshopConfigWithRelations["blackout_rules"][number],
): boolean {
  if (!rule.is_active) {
    return false;
  }

  const ruleTimeZone = rule.timezone?.trim() || timeZone;
  const slotStartMinutes = getMinutesOfDayInTimeZone(slotStart, ruleTimeZone);
  const slotEndMinutes = getMinutesOfDayInTimeZone(slotEnd, ruleTimeZone);

  if (
    !overlapsRange(
      slotStartMinutes,
      slotEndMinutes,
      rule.range_start_minutes,
      rule.range_end_minutes,
    )
  ) {
    return false;
  }

  const slotDateParts = getTimeZoneParts(slotStart, ruleTimeZone);

  if (rule.type === PrismaDailyWorkshopBlackoutType.ONE_TIME) {
    if (!rule.one_time_start_at || !rule.one_time_end_at) {
      return false;
    }

    return slotStart < rule.one_time_end_at && slotEnd > rule.one_time_start_at;
  }

  if (
    !isDateWithinRange(
      slotStart,
      ruleTimeZone,
      rule.recurrence_start_date,
      rule.recurrence_end_date,
    )
  ) {
    return false;
  }

  if (rule.type === PrismaDailyWorkshopBlackoutType.DAILY) {
    return true;
  }

  if (rule.type === PrismaDailyWorkshopBlackoutType.WEEKLY) {
    if (rule.weekdays.length === 0) {
      return false;
    }

    return rule.weekdays.includes(slotDateParts.weekday);
  }

  if (rule.type === PrismaDailyWorkshopBlackoutType.MONTHLY) {
    if (rule.month_days.length === 0) {
      return false;
    }

    return rule.month_days.includes(slotDateParts.day);
  }

  return false;
}

function findBestTierFallback(
  tiers: DailyWorkshopConfigWithRelations["pricing_tiers"],
  totalHours: number,
): DailyWorkshopConfigWithRelations["pricing_tiers"][number] | null {
  const active = tiers
    .filter((tier) => tier.is_active)
    .sort((a, b) => a.hours - b.hours);

  const exact = active.find((tier) => tier.hours === totalHours);
  if (exact) {
    return exact;
  }

  let fallback:
    | DailyWorkshopConfigWithRelations["pricing_tiers"][number]
    | null = null;

  for (const tier of active) {
    if (tier.hours <= totalHours) {
      fallback = tier;
    }
  }

  return fallback;
}

function findTierCombination(
  tiers: DailyWorkshopConfigWithRelations["pricing_tiers"],
  totalHours: number,
): DailyWorkshopConfigWithRelations["pricing_tiers"][number][] | null {
  const active = tiers
    .filter((tier) => tier.is_active && tier.hours > 0)
    .sort((a, b) => b.hours - a.hours || a.sort_order - b.sort_order);

  if (active.length === 0 || totalHours <= 0) {
    return null;
  }

  const memo = new Map<
    number,
    DailyWorkshopConfigWithRelations["pricing_tiers"][number][] | null
  >();

  const dfs = (
    remaining: number,
  ): DailyWorkshopConfigWithRelations["pricing_tiers"][number][] | null => {
    if (remaining === 0) {
      return [];
    }

    if (memo.has(remaining)) {
      return memo.get(remaining) ?? null;
    }

    for (const tier of active) {
      if (tier.hours > remaining) {
        continue;
      }

      const child = dfs(remaining - tier.hours);
      if (child) {
        const result = [tier, ...child];
        memo.set(remaining, result);
        return result;
      }
    }

    memo.set(remaining, null);
    return null;
  };

  return dfs(totalHours);
}

function resolveTierPricingForHours(
  config: DailyWorkshopConfigWithRelations,
  totalHours: number,
): {
  pricePerPerson: number;
  piecesPerPerson: number;
  appliedTiers: DailyWorkshopConfigWithRelations["pricing_tiers"];
} | null {
  if (totalHours <= 0) {
    return null;
  }

  const tierCombination = findTierCombination(config.pricing_tiers, totalHours);
  const appliedTiers =
    tierCombination && tierCombination.length > 0
      ? tierCombination
      : (() => {
          const fallback = findBestTierFallback(
            config.pricing_tiers,
            totalHours,
          );
          return fallback ? [fallback] : [];
        })();

  if (appliedTiers.length === 0) {
    return null;
  }

  return {
    pricePerPerson: appliedTiers.reduce(
      (sum, tier) => sum + tier.price_per_person,
      0,
    ),
    piecesPerPerson: appliedTiers.reduce(
      (sum, tier) => sum + tier.pieces_per_person,
      0,
    ),
    appliedTiers,
  };
}

function formatDateKeyForNotice(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map((value) => Number(value));
  const utcDate = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  return utcDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatDateListForNotice(dateKeys: string[]): string {
  const labels = dateKeys.map(formatDateKeyForNotice);
  if (labels.length <= 1) {
    return labels[0] ?? "";
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

function getBlackoutBaseReason(reason?: string | null): string {
  return reason?.trim() || "Instructor is unavailable due to personal reasons.";
}

function buildBlackoutCancellationReason(
  reasons: string[],
  affectedDateKeys: string[],
  isPartial: boolean,
  affectedSlotCount: number,
): string {
  const uniqueReasons = Array.from(
    new Set(
      reasons
        .map((reason) => reason.trim())
        .filter((reason) => reason.length > 0),
    ),
  );
  const reasonText =
    uniqueReasons.length === 0
      ? getBlackoutBaseReason(null)
      : uniqueReasons.length === 1
        ? uniqueReasons[0]
        : `Multiple scheduling updates affected this booking: ${uniqueReasons.join(" | ")}`;

  if (!isPartial) {
    return reasonText;
  }

  const normalizedAffectedSlotCount = Math.max(1, affectedSlotCount);
  const slotLabel =
    normalizedAffectedSlotCount === 1
      ? "1 booked session was cancelled."
      : `${normalizedAffectedSlotCount} booked sessions were cancelled.`;
  const dateList = formatDateListForNotice(affectedDateKeys);
  if (!dateList) {
    return `${reasonText} ${slotLabel} Remaining booked sessions are still active.`;
  }

  const dateLabel =
    affectedDateKeys.length === 1
      ? `Affected date: ${dateList}.`
      : `Affected dates: ${dateList}.`;

  return `${reasonText} ${slotLabel} ${dateLabel} Remaining booked sessions are still active.`;
}

function getBlackoutImpactForRegistration(
  registration: DailyWorkshopRegistrationWithSlots,
  config: DailyWorkshopConfigWithRelations,
  now: Date,
): {
  affectedSlotIds: number[];
  affectedDateKeys: string[];
  primaryRuleId: string | null;
  reasons: string[];
  reason: string;
  isPartial: boolean;
} | null {
  if (!ACTIVE_REGISTRATION_STATUSES.includes(registration.status)) {
    return null;
  }

  if (!config.auto_cancel_on_blackout) {
    return null;
  }

  const affectedSlotIds: number[] = [];
  const affectedDateKeys = new Set<string>();
  let primaryRuleId: string | null = null;
  const reasonSet = new Set<string>();

  for (const slot of registration.slots) {
    if (slot.slot_end_at <= now) {
      continue;
    }

    const blockingRule = config.blackout_rules.find(
      (rule) =>
        rule.auto_cancel_existing &&
        isBlockedByRule(
          slot.slot_start_at,
          slot.slot_end_at,
          config.timezone,
          rule,
        ),
    );

    if (!blockingRule) {
      continue;
    }

    affectedSlotIds.push(slot.id);
    affectedDateKeys.add(
      getDateKeyInTimeZone(slot.slot_start_at, config.timezone),
    );

    if (!primaryRuleId) {
      primaryRuleId = blockingRule.id;
    }
    reasonSet.add(getBlackoutBaseReason(blockingRule.reason));
  }

  if (affectedSlotIds.length === 0) {
    return null;
  }

  const isPartial = affectedSlotIds.length < registration.slots.length;
  const dateKeys = Array.from(affectedDateKeys).sort();

  return {
    affectedSlotIds,
    affectedDateKeys: dateKeys,
    primaryRuleId,
    reasons: Array.from(reasonSet),
    reason: buildBlackoutCancellationReason(
      Array.from(reasonSet),
      dateKeys,
      isPartial,
      affectedSlotIds.length,
    ),
    isPartial,
  };
}

async function getDefaultConfig(
  ctx: Context,
): Promise<DailyWorkshopConfigWithRelations | null> {
  const defaultConfig = await ctx.prisma.dailyWorkshopConfig.findFirst({
    where: {
      key: "default",
      is_active: true,
    },
    include: {
      pricing_tiers: {
        orderBy: [{ sort_order: "asc" }, { hours: "asc" }],
      },
      blackout_rules: {
        where: { is_active: true },
        orderBy: { created_at: "desc" },
      },
    },
  });

  if (defaultConfig) {
    return defaultConfig;
  }

  return ctx.prisma.dailyWorkshopConfig.findFirst({
    where: { is_active: true },
    orderBy: { id: "asc" },
    include: {
      pricing_tiers: {
        orderBy: [{ sort_order: "asc" }, { hours: "asc" }],
      },
      blackout_rules: {
        where: { is_active: true },
        orderBy: { created_at: "desc" },
      },
    },
  });
}

async function getConfigById(
  ctx: Context,
  configId: number,
): Promise<DailyWorkshopConfigWithRelations | null> {
  return ctx.prisma.dailyWorkshopConfig.findUnique({
    where: { id: configId },
    include: {
      pricing_tiers: {
        orderBy: [{ sort_order: "asc" }, { hours: "asc" }],
      },
      blackout_rules: {
        where: { is_active: true },
        orderBy: { created_at: "desc" },
      },
    },
  });
}

async function getPublicConfigs(
  ctx: Context,
): Promise<DailyWorkshopConfigWithRelations[]> {
  return ctx.prisma.dailyWorkshopConfig.findMany({
    where: { is_active: true },
    orderBy: [{ key: "asc" }, { id: "asc" }],
    include: {
      pricing_tiers: {
        orderBy: [{ sort_order: "asc" }, { hours: "asc" }],
      },
      blackout_rules: {
        where: { is_active: true },
        orderBy: { created_at: "desc" },
      },
    },
  });
}

async function getActiveConfigsByIds(
  ctx: Context,
  configIds: number[],
): Promise<Map<number, DailyWorkshopConfigWithRelations>> {
  if (configIds.length === 0) {
    return new Map();
  }

  const configs = await ctx.prisma.dailyWorkshopConfig.findMany({
    where: {
      id: { in: configIds },
      is_active: true,
    },
    include: {
      pricing_tiers: {
        orderBy: [{ sort_order: "asc" }, { hours: "asc" }],
      },
      blackout_rules: {
        where: { is_active: true },
        orderBy: { created_at: "desc" },
      },
    },
  });

  return new Map(configs.map((config) => [config.id, config]));
}

async function reconcileRegistrationsWithActiveBlackouts(
  ctx: Context,
  registrations: DailyWorkshopRegistrationWithSlots[],
): Promise<{
  registrations: DailyWorkshopRegistrationWithSlots[];
  didMutate: boolean;
}> {
  if (registrations.length === 0) {
    return { registrations, didMutate: false };
  }

  const configIds = Array.from(
    new Set(registrations.map((row) => row.config_id)),
  );
  const configById = await getActiveConfigsByIds(ctx, configIds);
  const now = new Date();
  const reconciled = [...registrations];
  let didMutate = false;

  for (let index = 0; index < registrations.length; index += 1) {
    const registration = registrations[index];
    const config = configById.get(registration.config_id);

    if (!config) {
      continue;
    }

    const blackoutImpact = getBlackoutImpactForRegistration(
      registration,
      config,
      now,
    );
    if (!blackoutImpact) {
      continue;
    }

    const cancelledAt = new Date();

    if (!blackoutImpact.isPartial) {
      const updateResult =
        await ctx.prisma.dailyWorkshopRegistration.updateMany({
          where: {
            id: registration.id,
            status: {
              in: ACTIVE_REGISTRATION_STATUSES,
            },
          },
          data: {
            status: PrismaDailyWorkshopRegistrationStatus.CANCELLED,
            cancelled_at: cancelledAt,
            cancelled_reason: blackoutImpact.reason,
            cancelled_by_user_id: null,
            cancelled_by_blackout_rule_id: blackoutImpact.primaryRuleId,
          },
        });

      if (updateResult.count === 0) {
        continue;
      }

      didMutate = true;
      reconciled[index] = {
        ...registration,
        status: PrismaDailyWorkshopRegistrationStatus.CANCELLED,
        cancelled_at: cancelledAt,
        cancelled_reason: blackoutImpact.reason,
        cancelled_by_user_id: null,
        cancelled_by_blackout_rule_id: blackoutImpact.primaryRuleId,
        updated_at: cancelledAt,
      };
      continue;
    }

    const remainingSlots = registration.slots.filter(
      (slot) => !blackoutImpact.affectedSlotIds.includes(slot.id),
    );
    const affectedSlots = registration.slots.filter((slot) =>
      blackoutImpact.affectedSlotIds.includes(slot.id),
    );
    const remainingSlotCount = remainingSlots.length;

    if (remainingSlotCount === 0) {
      continue;
    }

    const totalHours = Math.max(
      1,
      Math.round((remainingSlotCount * config.slot_duration_minutes) / 60),
    );
    const pricing = resolveTierPricingForHours(config, totalHours);

    const pricePerPerson =
      pricing?.pricePerPerson ?? registration.price_per_person;
    const piecesPerPerson =
      pricing?.piecesPerPerson ?? registration.pieces_per_person;
    const baseAmount = pricePerPerson * registration.participants;
    const normalizedDiscount = Math.min(registration.discount, baseAmount);
    const finalAmount = baseAmount - normalizedDiscount;
    const totalPieces = piecesPerPerson * registration.participants;
    const previousRecovery = parseBlackoutRecoveryPayload(
      registration.pricing_snapshot,
    );
    const mergedPendingStarts = Array.from(
      new Set([
        ...(previousRecovery?.pending_slot_start_times ?? []),
        ...affectedSlots.map((slot) =>
          new Date(slot.slot_start_at).toISOString(),
        ),
      ]),
    ).sort();
    const pendingDateKeys = Array.from(
      new Set(
        mergedPendingStarts.map((slotStart) =>
          getDateKeyInTimeZone(new Date(slotStart), config.timezone),
        ),
      ),
    ).sort();
    const cancellationReason = buildBlackoutCancellationReason(
      blackoutImpact.reasons,
      pendingDateKeys,
      true,
      mergedPendingStarts.length,
    );
    const windowStartMinutes = Math.min(
      ...registration.slots.map((slot) =>
        getMinutesOfDayInTimeZone(slot.slot_start_at, config.timezone),
      ),
    );
    const windowEndMinutes = Math.max(
      ...registration.slots.map((slot) =>
        getMinutesOfDayInTimeZone(slot.slot_end_at, config.timezone),
      ),
    );
    const snapshotBase =
      pricing && pricing.appliedTiers.length > 0
        ? {
            hours: totalHours,
            price_per_person: pricePerPerson,
            pieces_per_person: piecesPerPerson,
            applied_tiers: pricing.appliedTiers.map((tier) => ({
              tier_id: tier.id,
              hours: tier.hours,
              price_per_person: tier.price_per_person,
              pieces_per_person: tier.pieces_per_person,
            })),
            slot_duration_minutes: config.slot_duration_minutes,
          }
        : registration.pricing_snapshot;
    const nextSnapshot = mergeBlackoutRecoveryPayload(snapshotBase, {
      pending_slot_start_times: mergedPendingStarts,
      required_slots: mergedPendingStarts.length,
      window_start_minutes: windowStartMinutes,
      window_end_minutes: windowEndMinutes,
    });

    const updatedRegistration =
      await ctx.prisma.dailyWorkshopRegistration.update({
        where: { id: registration.id },
        data: {
          total_hours: totalHours,
          slots_count: remainingSlotCount,
          price_per_person: pricePerPerson,
          pieces_per_person: piecesPerPerson,
          base_amount: baseAmount,
          discount: normalizedDiscount,
          final_amount: finalAmount,
          total_pieces: totalPieces,
          pricing_snapshot: nextSnapshot,
          cancelled_at: cancelledAt,
          cancelled_reason: cancellationReason,
          cancelled_by_user_id: null,
          cancelled_by_blackout_rule_id: blackoutImpact.primaryRuleId,
          slots: {
            deleteMany: {
              id: {
                in: blackoutImpact.affectedSlotIds,
              },
            },
          },
        },
        include: {
          slots: {
            orderBy: { slot_start_at: "asc" },
          },
        },
      });

    didMutate = true;
    reconciled[index] = updatedRegistration;
  }

  return {
    registrations: reconciled,
    didMutate,
  };
}

function getRestoredStatusFromRegistration(
  registration: DailyWorkshopRegistrationWithSlots,
): PrismaDailyWorkshopRegistrationStatus {
  if (registration.confirmed_at) {
    return PrismaDailyWorkshopRegistrationStatus.CONFIRMED;
  }
  if (registration.paid_at) {
    return PrismaDailyWorkshopRegistrationStatus.PAID;
  }
  if (registration.approved_at) {
    return PrismaDailyWorkshopRegistrationStatus.APPROVED;
  }
  return PrismaDailyWorkshopRegistrationStatus.PENDING;
}

@Resolver()
export class DailyWorkshopsResolver {
  @Query(() => [DailyWorkshopConfig])
  async dailyWorkshopPublicConfigs(
    @Ctx() ctx: Context,
  ): Promise<DailyWorkshopConfig[]> {
    return tryCatchAsync(async () => {
      return dailyWorkshopCache.publicConfigs(async () => {
        const configs = await getPublicConfigs(ctx);
        return configs.map((config) => mapConfig(config));
      });
    });
  }

  @Query(() => DailyWorkshopConfig, { nullable: true })
  async dailyWorkshopPublicConfig(
    @Ctx() ctx: Context,
  ): Promise<DailyWorkshopConfig | null> {
    return tryCatchAsync(async () => {
      return dailyWorkshopCache.config(async () => {
        const config = await getDefaultConfig(ctx);

        if (!config || !config.is_active) {
          return null;
        }

        return mapConfig(config);
      });
    });
  }

  @Query(() => DailyWorkshopAvailabilityResponse, { nullable: true })
  async dailyWorkshopAvailability(
    @Ctx() ctx: Context,
    @Arg("filter", () => DailyWorkshopAvailabilityInput, { nullable: true })
    filter?: DailyWorkshopAvailabilityInput,
  ): Promise<DailyWorkshopAvailabilityResponse | null> {
    return tryCatchAsync(async () => {
      const requestedDays = Math.max(1, Math.min(filter?.days ?? 90, 90));
      const requestedConfigId = filter?.config_id ?? null;

      return dailyWorkshopCache.availability(
        {
          startDate:
            filter?.start_date?.toISOString() ?? new Date().toISOString(),
          days: requestedDays,
          configId: requestedConfigId,
        },
        async () => {
          const config = requestedConfigId
            ? await getConfigById(ctx, requestedConfigId)
            : await getDefaultConfig(ctx);
          if (!config || !config.is_active) {
            return null;
          }

          const startDate = filter?.start_date
            ? startOfDayInTimeZone(filter.start_date, config.timezone)
            : startOfDayInTimeZone(new Date(), config.timezone);

          const days = Math.min(requestedDays, config.booking_window_days);
          const rangeStart = new Date(startDate);
          const rangeEnd = addDaysInTimeZone(
            startDate,
            days + 1,
            config.timezone,
          );

          const slotRows =
            await ctx.prisma.dailyWorkshopRegistrationSlot.findMany({
              where: {
                slot_start_at: {
                  gte: rangeStart,
                  lt: rangeEnd,
                },
                registration: {
                  config_id: config.id,
                  status: {
                    in: ACTIVE_REGISTRATION_STATUSES,
                  },
                },
              },
              select: {
                slot_start_at: true,
              },
            });

          const reservedBySlot = new Map<string, number>();
          for (const row of slotRows) {
            const key = row.slot_start_at.toISOString();
            const current = reservedBySlot.get(key) ?? 0;
            reservedBySlot.set(key, current + 1);
          }

          const availabilityDays: DailyWorkshopAvailabilityDay[] = [];
          const slotDurationMs = config.slot_duration_minutes * 60 * 1000;
          const now = new Date();

          for (let offset = 0; offset < days; offset += 1) {
            const day = addDaysInTimeZone(startDate, offset, config.timezone);
            const dayParts = getTimeZoneParts(day, config.timezone);
            const daySlots: DailyWorkshopSlotAvailability[] = [];

            const openMinutes = config.opening_hour * 60;
            const closeMinutes = config.closing_hour * 60;

            for (
              let minute = openMinutes;
              minute + config.slot_duration_minutes <= closeMinutes;
              minute += config.slot_duration_minutes
            ) {
              const slotStart = makeDateInTimeZone(
                dayParts.year,
                dayParts.month,
                dayParts.day,
                Math.floor(minute / 60),
                minute % 60,
                config.timezone,
              );
              const slotEnd = new Date(slotStart.getTime() + slotDurationMs);

              if (slotStart <= now) {
                continue;
              }

              const blockedRule = config.blackout_rules.find((rule) =>
                isBlockedByRule(slotStart, slotEnd, config.timezone, rule),
              );

              const reserved = reservedBySlot.get(slotStart.toISOString()) ?? 0;
              const remaining = reserved > 0 ? 0 : config.slot_capacity;

              const isAvailable = !blockedRule && remaining > 0;

              daySlots.push({
                slot_start_at: slotStart,
                slot_end_at: slotEnd,
                is_available: isAvailable,
                reserved_participants: reserved,
                remaining_capacity: remaining,
                reason: blockedRule
                  ? blockedRule.reason?.trim() ||
                    "Instructor is unavailable due to personal reasons."
                  : remaining <= 0
                    ? "Fully booked"
                    : null,
              });
            }

            availabilityDays.push({
              date_key: getDateKeyInTimeZone(day, config.timezone),
              label: day.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                timeZone: config.timezone,
              }),
              slots: daySlots,
            });
          }

          return {
            config: mapConfig(config),
            days: availabilityDays,
          };
        },
      );
    });
  }

  @Query(() => DailyWorkshopRegistrationsResponse)
  @authRequired()
  async myDailyWorkshopRegistrations(
    @Ctx() ctx: Context,
    @Arg("filter", () => DailyWorkshopRegistrationsFilterInput, {
      nullable: true,
    })
    filter?: DailyWorkshopRegistrationsFilterInput,
  ): Promise<DailyWorkshopRegistrationsResponse> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);
      const page = filter?.page ?? 1;
      const limit = filter?.limit ?? 12;

      const where: Prisma.DailyWorkshopRegistrationWhereInput = {
        user_id: userId,
      };

      if (filter?.search) {
        where.id = {
          contains: filter.search,
          mode: "insensitive",
        };
      }

      if (filter?.status) {
        where.status = filter.status as PrismaDailyWorkshopRegistrationStatus;
      }

      const result = await dailyWorkshopCache.userRegistrations(
        userId,
        "all",
        page,
        limit,
        filter?.search,
        filter?.status,
        async () => {
          const [rawRegistrations, total] = await Promise.all([
            ctx.prisma.dailyWorkshopRegistration.findMany({
              where,
              include: {
                slots: {
                  orderBy: { slot_start_at: "asc" },
                },
              },
              orderBy: { created_at: "desc" },
              skip: (page - 1) * limit,
              take: limit,
            }),
            ctx.prisma.dailyWorkshopRegistration.count({ where }),
          ]);

          const { registrations, didMutate } =
            await reconcileRegistrationsWithActiveBlackouts(
              ctx,
              rawRegistrations,
            );

          if (didMutate) {
            await dailyWorkshopCache.invalidateUserRegistrations(userId);
          }

          return {
            data: registrations.map(mapRegistration),
            total,
            page,
            total_pages: Math.ceil(total / limit),
          };
        },
      );

      return result;
    });
  }

  @Query(() => DailyWorkshopRegistrationsResponse)
  @authRequired()
  async myUpcomingDailyWorkshopRegistrations(
    @Ctx() ctx: Context,
    @Arg("filter", () => DailyWorkshopRegistrationsFilterInput, {
      nullable: true,
    })
    filter?: DailyWorkshopRegistrationsFilterInput,
  ): Promise<DailyWorkshopRegistrationsResponse> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);
      const page = filter?.page ?? 1;
      const limit = filter?.limit ?? 12;
      const now = new Date();

      const where: Prisma.DailyWorkshopRegistrationWhereInput = {
        user_id: userId,
        slots: {
          some: {
            slot_end_at: { gt: now },
          },
        },
      };

      if (filter?.search) {
        where.id = {
          contains: filter.search,
          mode: "insensitive",
        };
      }

      if (filter?.status) {
        where.status = filter.status as PrismaDailyWorkshopRegistrationStatus;
      }

      const result = await dailyWorkshopCache.userRegistrations(
        userId,
        "upcoming",
        page,
        limit,
        filter?.search,
        filter?.status,
        async () => {
          const [rawRegistrations, total] = await Promise.all([
            ctx.prisma.dailyWorkshopRegistration.findMany({
              where,
              include: {
                slots: {
                  orderBy: { slot_start_at: "asc" },
                },
              },
              orderBy: { created_at: "desc" },
              skip: (page - 1) * limit,
              take: limit,
            }),
            ctx.prisma.dailyWorkshopRegistration.count({ where }),
          ]);

          const { registrations, didMutate } =
            await reconcileRegistrationsWithActiveBlackouts(
              ctx,
              rawRegistrations,
            );

          if (didMutate) {
            await dailyWorkshopCache.invalidateUserRegistrations(userId);
          }

          return {
            data: registrations.map(mapRegistration),
            total,
            page,
            total_pages: Math.ceil(total / limit),
          };
        },
      );

      return result;
    });
  }

  @Query(() => DailyWorkshopRegistrationsResponse)
  @authRequired()
  async myCompletedDailyWorkshopRegistrations(
    @Ctx() ctx: Context,
    @Arg("filter", () => DailyWorkshopRegistrationsFilterInput, {
      nullable: true,
    })
    filter?: DailyWorkshopRegistrationsFilterInput,
  ): Promise<DailyWorkshopRegistrationsResponse> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);
      const page = filter?.page ?? 1;
      const limit = filter?.limit ?? 12;
      const now = new Date();

      const where: Prisma.DailyWorkshopRegistrationWhereInput = {
        user_id: userId,
        NOT: {
          slots: {
            some: {
              slot_end_at: { gt: now },
            },
          },
        },
      };

      if (filter?.search) {
        where.id = {
          contains: filter.search,
          mode: "insensitive",
        };
      }

      if (filter?.status) {
        where.status = filter.status as PrismaDailyWorkshopRegistrationStatus;
      }

      const result = await dailyWorkshopCache.userRegistrations(
        userId,
        "completed",
        page,
        limit,
        filter?.search,
        filter?.status,
        async () => {
          const [rawRegistrations, total] = await Promise.all([
            ctx.prisma.dailyWorkshopRegistration.findMany({
              where,
              include: {
                slots: {
                  orderBy: { slot_start_at: "asc" },
                },
              },
              orderBy: { created_at: "desc" },
              skip: (page - 1) * limit,
              take: limit,
            }),
            ctx.prisma.dailyWorkshopRegistration.count({ where }),
          ]);

          const { registrations, didMutate } =
            await reconcileRegistrationsWithActiveBlackouts(
              ctx,
              rawRegistrations,
            );

          if (didMutate) {
            await dailyWorkshopCache.invalidateUserRegistrations(userId);
          }

          return {
            data: registrations.map(mapRegistration),
            total,
            page,
            total_pages: Math.ceil(total / limit),
          };
        },
      );

      return result;
    });
  }

  @Query(() => DailyWorkshopRegistration, { nullable: true })
  @authRequired()
  async dailyWorkshopRegistrationById(
    @Ctx() ctx: Context,
    @Arg("registrationId", () => String) registrationId: string,
  ): Promise<DailyWorkshopRegistration | null> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);

      return dailyWorkshopCache.registrationDetail(
        userId,
        registrationId,
        async () => {
          const registration =
            await ctx.prisma.dailyWorkshopRegistration.findFirst({
              where: {
                id: registrationId,
                user_id: userId,
              },
              include: {
                slots: {
                  orderBy: { slot_start_at: "asc" },
                },
              },
            });

          if (!registration) {
            return null;
          }

          const { registrations, didMutate } =
            await reconcileRegistrationsWithActiveBlackouts(ctx, [
              registration,
            ]);

          if (didMutate) {
            await dailyWorkshopCache.invalidateUserRegistrations(userId);
          }

          return mapRegistration(registrations[0] ?? registration);
        },
      );
    });
  }

  @Mutation(() => CreateDailyWorkshopRegistrationResponse)
  @authRequired()
  async rescheduleDailyWorkshopRegistration(
    @Ctx() ctx: Context,
    @Arg("input", () => RescheduleDailyWorkshopRegistrationInput)
    input: RescheduleDailyWorkshopRegistrationInput,
  ): Promise<CreateDailyWorkshopRegistrationResponse> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);

      const registration = await ctx.prisma.dailyWorkshopRegistration.findFirst(
        {
          where: {
            id: input.registration_id,
            user_id: userId,
          },
          include: {
            slots: {
              orderBy: { slot_start_at: "asc" },
            },
          },
        },
      );

      if (!registration) {
        return {
          success: false,
          registration: null,
          error: "Registration not found",
        };
      }

      const blackoutRecovery = parseBlackoutRecoveryPayload(
        registration.pricing_snapshot,
      );
      const inferredPartialRequiredSlots =
        inferPartialRecoverySlotCountFromReason(registration.cancelled_reason);
      const hasPendingRecoverySlots =
        (blackoutRecovery?.required_slots ?? 0) > 0 ||
        (blackoutRecovery?.pending_slot_start_times.length ?? 0) > 0 ||
        inferredPartialRequiredSlots > 0;
      const isFullyCancelledBySystem =
        registration.status ===
          PrismaDailyWorkshopRegistrationStatus.CANCELLED &&
        registration.cancelled_by_user_id === null;
      const isPartiallyCancelledBySystem =
        registration.status !==
          PrismaDailyWorkshopRegistrationStatus.CANCELLED &&
        hasPendingRecoverySlots;

      if (!isFullyCancelledBySystem && !isPartiallyCancelledBySystem) {
        return {
          success: false,
          registration: null,
          error: "This registration cannot be rescheduled",
        };
      }

      const config = await getConfigById(ctx, registration.config_id);
      if (!config || !config.is_active) {
        return {
          success: false,
          registration: null,
          error: "Daily workshop booking is currently unavailable",
        };
      }

      const requiredSlots = isPartiallyCancelledBySystem
        ? Math.max(
            1,
            blackoutRecovery
              ? Math.max(
                  blackoutRecovery.required_slots,
                  blackoutRecovery.pending_slot_start_times.length,
                  inferredPartialRequiredSlots,
                )
              : inferredPartialRequiredSlots,
          )
        : registration.slots_count;
      if (requiredSlots < 1 || registration.slots.length < 1) {
        return {
          success: false,
          registration: null,
          error: "This registration does not have any slots to reschedule",
        };
      }

      const uniqueSlotStarts = Array.from(
        new Map(
          input.slot_start_times.map((slot) => [
            new Date(slot).toISOString(),
            new Date(slot),
          ]),
        ).values(),
      ).sort((a, b) => a.getTime() - b.getTime());

      if (uniqueSlotStarts.length !== requiredSlots) {
        return {
          success: false,
          registration: null,
          error: `Please select exactly ${requiredSlots} slot${requiredSlots > 1 ? "s" : ""}`,
        };
      }

      const existingSlotStartSet = new Set(
        registration.slots.map((slot) =>
          new Date(slot.slot_start_at).toISOString(),
        ),
      );
      if (
        isPartiallyCancelledBySystem &&
        uniqueSlotStarts.some((slotStart) =>
          existingSlotStartSet.has(slotStart.toISOString()),
        )
      ) {
        return {
          success: false,
          registration: null,
          error: "Selected slot is already part of your booking",
        };
      }

      const now = new Date();
      const slotDurationMs = config.slot_duration_minutes * 60 * 1000;
      const maxBookingDate = addDaysInTimeZone(
        startOfDayInTimeZone(now, config.timezone),
        config.booking_window_days,
        config.timezone,
      );

      const openingMinutes = config.opening_hour * 60;
      const closingMinutes = config.closing_hour * 60;

      for (const slotStart of uniqueSlotStarts) {
        if (slotStart <= now) {
          return {
            success: false,
            registration: null,
            error: "Cannot reschedule to past time slots",
          };
        }

        if (slotStart > maxBookingDate) {
          return {
            success: false,
            registration: null,
            error: "Selected slot is outside the booking window",
          };
        }

        const slotEnd = new Date(slotStart.getTime() + slotDurationMs);
        const startMinutes = getMinutesOfDayInTimeZone(
          slotStart,
          config.timezone,
        );
        const endMinutes = getMinutesOfDayInTimeZone(slotEnd, config.timezone);

        if (startMinutes < openingMinutes || endMinutes > closingMinutes) {
          return {
            success: false,
            registration: null,
            error: "Selected slot is outside workshop operating hours",
          };
        }

        const blocked = config.blackout_rules.find((rule) =>
          isBlockedByRule(slotStart, slotEnd, config.timezone, rule),
        );

        if (blocked) {
          return {
            success: false,
            registration: null,
            error:
              blocked.reason?.trim() ||
              "Instructor is unavailable due to personal reasons.",
          };
        }
      }

      const occupied = await ctx.prisma.dailyWorkshopRegistrationSlot.findMany({
        where: {
          slot_start_at: { in: uniqueSlotStarts },
          registration: {
            status: {
              in: ACTIVE_REGISTRATION_STATUSES,
            },
            ...(isPartiallyCancelledBySystem
              ? {
                  id: {
                    not: registration.id,
                  },
                }
              : {}),
          },
        },
        select: {
          slot_start_at: true,
        },
      });

      if (occupied.length > 0) {
        return {
          success: false,
          registration: null,
          error: "One or more selected slots are no longer available",
        };
      }

      const totalSlotCountAfterReschedule = isPartiallyCancelledBySystem
        ? registration.slots_count + uniqueSlotStarts.length
        : uniqueSlotStarts.length;
      const totalHours = Math.max(
        1,
        Math.round(
          (totalSlotCountAfterReschedule * config.slot_duration_minutes) / 60,
        ),
      );
      const pricing = resolveTierPricingForHours(config, totalHours);
      if (!pricing) {
        return {
          success: false,
          registration: null,
          error: "No active pricing tier found for selected duration",
        };
      }

      const restoredStatus = getRestoredStatusFromRegistration(registration);
      const nextStatus = isPartiallyCancelledBySystem
        ? registration.status
        : restoredStatus;
      const pricePerPerson = pricing.pricePerPerson;
      const piecesPerPerson = pricing.piecesPerPerson;
      const baseAmount = pricePerPerson * registration.participants;
      const normalizedDiscount = Math.min(registration.discount, baseAmount);
      const finalAmount = baseAmount - normalizedDiscount;
      const totalPieces = piecesPerPerson * registration.participants;
      const nowTimestamp = new Date();
      const nextPricingSnapshot = mergeBlackoutRecoveryPayload(
        {
          hours: totalHours,
          price_per_person: pricePerPerson,
          pieces_per_person: piecesPerPerson,
          applied_tiers: pricing.appliedTiers.map((tier) => ({
            tier_id: tier.id,
            hours: tier.hours,
            price_per_person: tier.price_per_person,
            pieces_per_person: tier.pieces_per_person,
          })),
          slot_duration_minutes: config.slot_duration_minutes,
        },
        null,
      );

      const updated = await dailyWorkshopCache.withTransaction(
        ctx.prisma,
        async (tx) => {
          return tx.dailyWorkshopRegistration.update({
            where: { id: registration.id },
            data: {
              status: nextStatus,
              total_hours: totalHours,
              slots_count: totalSlotCountAfterReschedule,
              price_per_person: pricePerPerson,
              pieces_per_person: piecesPerPerson,
              base_amount: baseAmount,
              discount: normalizedDiscount,
              final_amount: finalAmount,
              total_pieces: totalPieces,
              pricing_snapshot: nextPricingSnapshot,
              request_at:
                !isPartiallyCancelledBySystem &&
                restoredStatus === PrismaDailyWorkshopRegistrationStatus.PENDING
                  ? nowTimestamp
                  : registration.request_at,
              cancelled_at: null,
              cancelled_reason: null,
              cancelled_by_user_id: null,
              cancelled_by_blackout_rule_id: null,
              slots: {
                ...(isPartiallyCancelledBySystem ? {} : { deleteMany: {} }),
                create: uniqueSlotStarts.map((slotStart) => ({
                  slot_start_at: slotStart,
                  slot_end_at: new Date(slotStart.getTime() + slotDurationMs),
                })),
              },
            },
            include: {
              slots: {
                orderBy: { slot_start_at: "asc" },
              },
            },
          });
        },
      );

      await dailyWorkshopCache.invalidateUserRegistrations(userId);

      return {
        success: true,
        registration: mapRegistration(updated),
        error: null,
      };
    });
  }

  @Mutation(() => CreateDailyWorkshopRegistrationResponse)
  @authRequired()
  async registerForDailyWorkshop(
    @Ctx() ctx: Context,
    @Arg("input", () => CreateDailyWorkshopRegistrationInput)
    input: CreateDailyWorkshopRegistrationInput,
  ): Promise<CreateDailyWorkshopRegistrationResponse> {
    return tryCatchAsync(async () => {
      const userId = getUserId(ctx);

      const participants = Math.max(1, input.participants ?? 1);
      const discount = Math.max(0, input.discount ?? 0);

      const uniqueSlotStarts = Array.from(
        new Map(
          input.slot_start_times.map((slot) => [
            new Date(slot).toISOString(),
            new Date(slot),
          ]),
        ).values(),
      ).sort((a, b) => a.getTime() - b.getTime());

      if (uniqueSlotStarts.length === 0) {
        return {
          success: false,
          registration: null,
          error: "Please select at least one time slot",
        };
      }

      const requestedConfigId =
        input.config_id && input.config_id > 0 ? input.config_id : null;
      const config = requestedConfigId
        ? await getConfigById(ctx, requestedConfigId)
        : await getDefaultConfig(ctx);
      if (!config || !config.is_active) {
        return {
          success: false,
          registration: null,
          error: "Daily workshop booking is currently unavailable",
        };
      }

      const now = new Date();
      const slotDurationMs = config.slot_duration_minutes * 60 * 1000;
      const maxBookingDate = addDaysInTimeZone(
        startOfDayInTimeZone(now, config.timezone),
        config.booking_window_days,
        config.timezone,
      );

      for (const slotStart of uniqueSlotStarts) {
        if (slotStart < now) {
          return {
            success: false,
            registration: null,
            error: "Cannot book past time slots",
          };
        }

        if (slotStart > maxBookingDate) {
          return {
            success: false,
            registration: null,
            error: "Selected slot is outside the booking window",
          };
        }

        const slotEnd = new Date(slotStart.getTime() + slotDurationMs);
        const startMinutes = getMinutesOfDayInTimeZone(
          slotStart,
          config.timezone,
        );
        const endMinutes = getMinutesOfDayInTimeZone(slotEnd, config.timezone);
        const openingMinutes = config.opening_hour * 60;
        const closingMinutes = config.closing_hour * 60;

        if (startMinutes < openingMinutes || endMinutes > closingMinutes) {
          return {
            success: false,
            registration: null,
            error: "Selected slot is outside workshop operating hours",
          };
        }

        const blocked = config.blackout_rules.find((rule) =>
          isBlockedByRule(slotStart, slotEnd, config.timezone, rule),
        );

        if (blocked) {
          return {
            success: false,
            registration: null,
            error:
              blocked.reason?.trim() ||
              "Instructor is unavailable due to personal reasons.",
          };
        }
      }

      const existingSlots =
        await ctx.prisma.dailyWorkshopRegistrationSlot.findMany({
          where: {
            slot_start_at: {
              in: uniqueSlotStarts,
            },
            registration: {
              config_id: config.id,
              status: {
                in: ACTIVE_REGISTRATION_STATUSES,
              },
            },
          },
          select: {
            slot_start_at: true,
          },
        });

      const occupiedBySlot = new Set<string>();
      for (const row of existingSlots) {
        occupiedBySlot.add(row.slot_start_at.toISOString());
      }

      if (participants > config.slot_capacity) {
        return {
          success: false,
          registration: null,
          error: `Max ${config.slot_capacity} participants allowed per slot`,
        };
      }

      for (const slotStart of uniqueSlotStarts) {
        if (occupiedBySlot.has(slotStart.toISOString())) {
          return {
            success: false,
            registration: null,
            error: "One or more selected slots are no longer available",
          };
        }
      }

      const totalHours = Math.max(
        1,
        Math.round(
          (uniqueSlotStarts.length * config.slot_duration_minutes) / 60,
        ),
      );

      const tierCombination = findTierCombination(
        config.pricing_tiers,
        totalHours,
      );
      const appliedTiers =
        tierCombination && tierCombination.length > 0
          ? tierCombination
          : (() => {
              const fallback = findBestTierFallback(
                config.pricing_tiers,
                totalHours,
              );
              return fallback ? [fallback] : [];
            })();

      if (appliedTiers.length === 0) {
        return {
          success: false,
          registration: null,
          error: "No active pricing tier found for selected duration",
        };
      }

      const pricePerPerson = appliedTiers.reduce(
        (sum, tier) => sum + tier.price_per_person,
        0,
      );
      const piecesPerPerson = appliedTiers.reduce(
        (sum, tier) => sum + tier.pieces_per_person,
        0,
      );

      const baseAmount = pricePerPerson * participants;
      const normalizedDiscount = Math.min(discount, baseAmount);
      const finalAmount = baseAmount - normalizedDiscount;
      const totalPieces = piecesPerPerson * participants;

      const created = await dailyWorkshopCache.withTransaction(
        ctx.prisma,
        async (tx) => {
          const registration = await tx.dailyWorkshopRegistration.create({
            data: {
              config_id: config.id,
              user_id: userId,
              participants,
              total_hours: totalHours,
              slots_count: uniqueSlotStarts.length,
              price_per_person: pricePerPerson,
              pieces_per_person: piecesPerPerson,
              base_amount: baseAmount,
              discount: normalizedDiscount,
              final_amount: finalAmount,
              total_pieces: totalPieces,
              currency: "INR",
              pricing_snapshot: {
                hours: totalHours,
                price_per_person: pricePerPerson,
                pieces_per_person: piecesPerPerson,
                applied_tiers: appliedTiers.map((tier) => ({
                  tier_id: tier.id,
                  hours: tier.hours,
                  price_per_person: tier.price_per_person,
                  pieces_per_person: tier.pieces_per_person,
                })),
                slot_duration_minutes: config.slot_duration_minutes,
              },
              status: PrismaDailyWorkshopRegistrationStatus.PENDING,
              request_at: new Date(),
              slots: {
                create: uniqueSlotStarts.map((slotStart) => ({
                  slot_start_at: slotStart,
                  slot_end_at: new Date(slotStart.getTime() + slotDurationMs),
                })),
              },
            },
            include: {
              slots: {
                orderBy: { slot_start_at: "asc" },
              },
            },
          });

          return registration;
        },
      );

      await dailyWorkshopCache.invalidateUserRegistrations(userId);

      return {
        success: true,
        registration: mapRegistration(created),
        error: null,
      };
    });
  }
}
