import { Arg, Ctx, Int, Mutation, Query, Resolver } from "type-graphql";

import { adminRequired } from "@/middlewares/auth.middleware";
import {
  Prisma,
  DailyWorkshopBlackoutType as PrismaDailyWorkshopBlackoutType,
  DailyWorkshopRegistrationStatus as PrismaDailyWorkshopRegistrationStatus,
} from "@/prisma/generated/client";
import { dailyWorkshopCache } from "@/resolvers/daily-workshops/daily-workshops.cache";
import {
  DailyWorkshopBlackoutType,
  DailyWorkshopRegistrationStatus,
} from "@/resolvers/daily-workshops/daily-workshops.type";
import { Context } from "@/types/context";
import { tryCatchAsync } from "@/utils/trycatch";

import {
  AdminDailyWorkshopBlackoutRule,
  AdminDailyWorkshopBlackoutRuleMutationResponse,
  AdminDailyWorkshopConfig,
  AdminDailyWorkshopConfigMutationResponse,
  AdminDailyWorkshopMutationResponse,
  AdminDailyWorkshopPricingTier,
  AdminDailyWorkshopPricingTierMutationResponse,
  AdminDailyWorkshopRegistration,
  AdminDailyWorkshopRegistrationMutationResponse,
  AdminUpdateDailyWorkshopRegistrationInput,
  AdminUpdateDailyWorkshopConfigInput,
  AdminUpsertDailyWorkshopBlackoutRuleInput,
  AdminUpsertDailyWorkshopPricingTierInput,
} from "./daily-workshops.type";

type ConfigWithRelations = Prisma.DailyWorkshopConfigGetPayload<{
  include: {
    pricing_tiers: true;
    blackout_rules: true;
  };
}>;

type RegistrationWithRelations = Prisma.DailyWorkshopRegistrationGetPayload<{
  include: {
    slots: true;
    user: {
      select: {
        id: true;
        email: true;
        name: true;
        image: true;
      };
    };
  };
}>;

type TimestampField =
  | "request_at"
  | "approved_at"
  | "paid_at"
  | "confirmed_at"
  | "cancelled_at";

const STATUS_TIMESTAMP_FIELDS: Record<
  PrismaDailyWorkshopRegistrationStatus,
  TimestampField | null
> = {
  [PrismaDailyWorkshopRegistrationStatus.PENDING]: "request_at",
  [PrismaDailyWorkshopRegistrationStatus.APPROVED]: "approved_at",
  [PrismaDailyWorkshopRegistrationStatus.REJECTED]: null,
  [PrismaDailyWorkshopRegistrationStatus.PAID]: "paid_at",
  [PrismaDailyWorkshopRegistrationStatus.CONFIRMED]: "confirmed_at",
  [PrismaDailyWorkshopRegistrationStatus.CANCELLED]: "cancelled_at",
};

const MAIN_FLOW: PrismaDailyWorkshopRegistrationStatus[] = [
  PrismaDailyWorkshopRegistrationStatus.PENDING,
  PrismaDailyWorkshopRegistrationStatus.APPROVED,
  PrismaDailyWorkshopRegistrationStatus.PAID,
  PrismaDailyWorkshopRegistrationStatus.CONFIRMED,
];

const ACTIVE_CANCELLABLE_STATUSES: PrismaDailyWorkshopRegistrationStatus[] = [
  PrismaDailyWorkshopRegistrationStatus.PENDING,
  PrismaDailyWorkshopRegistrationStatus.APPROVED,
  PrismaDailyWorkshopRegistrationStatus.PAID,
  PrismaDailyWorkshopRegistrationStatus.CONFIRMED,
];

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

function getMinutesOfDayInTimeZone(value: Date, timeZone: string): number {
  const parts = getTimeZoneParts(value, timeZone);
  return parts.hour * 60 + parts.minute;
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
  const dateValue = toDateOnlyValueInTimeZone(value, timeZone);
  const startValue =
    start !== undefined && start !== null
      ? toDateOnlyValueInTimeZone(start, timeZone)
      : null;
  const endValue =
    end !== undefined && end !== null
      ? toDateOnlyValueInTimeZone(end, timeZone)
      : null;

  if (startValue !== null && dateValue < startValue) {
    return false;
  }

  if (endValue !== null && dateValue > endValue) {
    return false;
  }

  return true;
}

function isBlockedByRule(
  slotStart: Date,
  slotEnd: Date,
  timeZone: string,
  rule: ConfigWithRelations["blackout_rules"][number],
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

  const slotDateParts = getTimeZoneParts(slotStart, ruleTimeZone);

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

function getDateKeyInTimeZone(value: Date, timeZone: string): string {
  const parts = getTimeZoneParts(value, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function findBestTierFallback(
  tiers: ConfigWithRelations["pricing_tiers"],
  totalHours: number,
): ConfigWithRelations["pricing_tiers"][number] | null {
  const active = tiers
    .filter((tier) => tier.is_active)
    .sort((a, b) => a.hours - b.hours);

  const exact = active.find((tier) => tier.hours === totalHours);
  if (exact) {
    return exact;
  }

  let fallback: ConfigWithRelations["pricing_tiers"][number] | null = null;
  for (const tier of active) {
    if (tier.hours <= totalHours) {
      fallback = tier;
    }
  }

  return fallback;
}

function findTierCombination(
  tiers: ConfigWithRelations["pricing_tiers"],
  totalHours: number,
): ConfigWithRelations["pricing_tiers"][number][] | null {
  const active = tiers
    .filter((tier) => tier.is_active && tier.hours > 0)
    .sort((a, b) => b.hours - a.hours || a.sort_order - b.sort_order);

  if (active.length === 0 || totalHours <= 0) {
    return null;
  }

  const memo = new Map<
    number,
    ConfigWithRelations["pricing_tiers"][number][] | null
  >();

  const dfs = (
    remaining: number,
  ): ConfigWithRelations["pricing_tiers"][number][] | null => {
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
  config: ConfigWithRelations,
  totalHours: number,
): {
  pricePerPerson: number;
  piecesPerPerson: number;
  appliedTiers: ConfigWithRelations["pricing_tiers"];
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

type BlackoutRecoveryPayload = {
  pending_slot_start_times: string[];
  required_slots: number;
  window_start_minutes: number | null;
  window_end_minutes: number | null;
};

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
  const windowStartMinutesRaw = Number(blackoutRecovery["window_start_minutes"]);
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

function mapBlackoutType(
  type: PrismaDailyWorkshopBlackoutType,
): DailyWorkshopBlackoutType {
  return type as DailyWorkshopBlackoutType;
}

function mapRegistrationStatus(
  status: PrismaDailyWorkshopRegistrationStatus,
): DailyWorkshopRegistrationStatus {
  return status as DailyWorkshopRegistrationStatus;
}

function mapConfig(config: ConfigWithRelations): AdminDailyWorkshopConfig {
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
    created_at: config.created_at,
    updated_at: config.updated_at,
  };
}

function mapPricingTier(
  tier: ConfigWithRelations["pricing_tiers"][number],
): AdminDailyWorkshopPricingTier {
  return {
    id: tier.id,
    config_id: tier.config_id,
    hours: tier.hours,
    price_per_person: tier.price_per_person,
    pieces_per_person: tier.pieces_per_person,
    sort_order: tier.sort_order,
    is_active: tier.is_active,
    created_at: tier.created_at,
    updated_at: tier.updated_at,
  };
}

function mapBlackoutRule(
  rule: ConfigWithRelations["blackout_rules"][number],
): AdminDailyWorkshopBlackoutRule {
  return {
    id: rule.id,
    config_id: rule.config_id,
    name: rule.name,
    type: mapBlackoutType(rule.type),
    is_active: rule.is_active,
    timezone: rule.timezone,
    reason: rule.reason,
    auto_cancel_existing: rule.auto_cancel_existing,
    one_time_start_at: rule.one_time_start_at,
    one_time_end_at: rule.one_time_end_at,
    recurrence_start_date: rule.recurrence_start_date,
    recurrence_end_date: rule.recurrence_end_date,
    weekdays: rule.weekdays,
    month_days: rule.month_days,
    range_start_minutes: rule.range_start_minutes,
    range_end_minutes: rule.range_end_minutes,
    created_by_user_id: rule.created_by_user_id,
    created_at: rule.created_at,
    updated_at: rule.updated_at,
  };
}

function mapRegistration(
  registration: RegistrationWithRelations,
): AdminDailyWorkshopRegistration {
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
    created_at: registration.created_at,
    updated_at: registration.updated_at,
    slots: registration.slots.map((slot) => ({
      id: slot.id,
      slot_start_at: slot.slot_start_at,
      slot_end_at: slot.slot_end_at,
    })),
    user: registration.user,
  };
}

async function getDefaultConfig(
  ctx: Context,
): Promise<ConfigWithRelations | null> {
  return ctx.prisma.dailyWorkshopConfig.findFirst({
    where: { key: "default" },
    include: {
      pricing_tiers: {
        orderBy: [{ sort_order: "asc" }, { hours: "asc" }],
      },
      blackout_rules: {
        orderBy: { created_at: "desc" },
      },
    },
  });
}

async function getConfigById(
  ctx: Context,
  id: number,
): Promise<ConfigWithRelations | null> {
  return ctx.prisma.dailyWorkshopConfig.findUnique({
    where: { id },
    include: {
      pricing_tiers: {
        orderBy: [{ sort_order: "asc" }, { hours: "asc" }],
      },
      blackout_rules: {
        orderBy: { created_at: "desc" },
      },
    },
  });
}

async function getConfigByIdOrDefault(
  ctx: Context,
  configId?: number | null,
): Promise<ConfigWithRelations | null> {
  if (configId !== undefined && configId !== null) {
    return getConfigById(ctx, configId);
  }

  return getDefaultConfig(ctx);
}

function getLaterStatuses(
  status: PrismaDailyWorkshopRegistrationStatus,
): PrismaDailyWorkshopRegistrationStatus[] {
  const currentIndex = MAIN_FLOW.indexOf(status);
  if (currentIndex === -1) {
    return [];
  }
  return MAIN_FLOW.slice(currentIndex + 1);
}

function getIntermediateStatuses(
  currentStatus: PrismaDailyWorkshopRegistrationStatus,
  nextStatus: PrismaDailyWorkshopRegistrationStatus,
): PrismaDailyWorkshopRegistrationStatus[] {
  const currentIndex = MAIN_FLOW.indexOf(currentStatus);
  const nextIndex = MAIN_FLOW.indexOf(nextStatus);

  if (currentIndex === -1 || nextIndex === -1 || nextIndex <= currentIndex) {
    return [];
  }

  return MAIN_FLOW.slice(currentIndex + 1, nextIndex + 1);
}

@Resolver()
export class AdminDailyWorkshopsResolver {
  @Query(() => [AdminDailyWorkshopConfig])
  @adminRequired()
  async adminDailyWorkshopConfigs(
    @Ctx() ctx: Context,
  ): Promise<AdminDailyWorkshopConfig[]> {
    return tryCatchAsync(async () => {
      const configs = await ctx.prisma.dailyWorkshopConfig.findMany({
        include: {
          pricing_tiers: {
            orderBy: [{ sort_order: "asc" }, { hours: "asc" }],
          },
          blackout_rules: {
            orderBy: { created_at: "desc" },
          },
        },
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
      });

      return configs.map(mapConfig);
    });
  }

  @Query(() => AdminDailyWorkshopConfig, { nullable: true })
  @adminRequired()
  async adminDailyWorkshopConfig(
    @Ctx() ctx: Context,
  ): Promise<AdminDailyWorkshopConfig | null> {
    return tryCatchAsync(async () => {
      const config = await getDefaultConfig(ctx);
      return config ? mapConfig(config) : null;
    });
  }

  @Query(() => [AdminDailyWorkshopPricingTier])
  @adminRequired()
  async adminDailyWorkshopPricingTiers(
    @Ctx() ctx: Context,
    @Arg("configId", () => Int, { nullable: true }) configId?: number,
  ): Promise<AdminDailyWorkshopPricingTier[]> {
    return tryCatchAsync(async () => {
      const config = await getConfigByIdOrDefault(ctx, configId);
      return config ? config.pricing_tiers.map(mapPricingTier) : [];
    });
  }

  @Query(() => [AdminDailyWorkshopBlackoutRule])
  @adminRequired()
  async adminDailyWorkshopBlackoutRules(
    @Ctx() ctx: Context,
    @Arg("configId", () => Int, { nullable: true }) configId?: number,
  ): Promise<AdminDailyWorkshopBlackoutRule[]> {
    return tryCatchAsync(async () => {
      const config = await getConfigByIdOrDefault(ctx, configId);
      return config ? config.blackout_rules.map(mapBlackoutRule) : [];
    });
  }

  @Query(() => [AdminDailyWorkshopRegistration])
  @adminRequired()
  async adminUserDailyWorkshopRegistrations(
    @Ctx() ctx: Context,
    @Arg("userId", () => Int) userId: number,
  ): Promise<AdminDailyWorkshopRegistration[]> {
    return tryCatchAsync(async () => {
      return dailyWorkshopCache.adminUserRegistrations(userId, async () => {
        const rows = await ctx.prisma.dailyWorkshopRegistration.findMany({
          where: { user_id: userId },
          include: {
            slots: {
              orderBy: { slot_start_at: "asc" },
            },
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: { created_at: "desc" },
        });

        return rows.map(mapRegistration);
      });
    });
  }

  @Mutation(() => AdminDailyWorkshopConfigMutationResponse)
  @adminRequired()
  async adminUpdateDailyWorkshopConfig(
    @Ctx() ctx: Context,
    @Arg("configId", () => Int, { nullable: true })
    configId: number | undefined,
    @Arg("input", () => AdminUpdateDailyWorkshopConfigInput)
    input: AdminUpdateDailyWorkshopConfigInput,
  ): Promise<AdminDailyWorkshopConfigMutationResponse> {
    return tryCatchAsync(async () => {
      const openingHour = input.opening_hour;
      const closingHour = input.closing_hour;
      const slotDurationMinutes = input.slot_duration_minutes;
      const slotCapacity = input.slot_capacity;
      const bookingWindowDays = input.booking_window_days;

      if (!input.name?.trim()) {
        return {
          success: false,
          config: null,
          error: "Workshop name is required",
        };
      }

      if (!input.timezone?.trim()) {
        return {
          success: false,
          config: null,
          error: "Timezone is required",
        };
      }

      if (
        openingHour === undefined ||
        openingHour === null ||
        openingHour < 0 ||
        openingHour > 23
      ) {
        return {
          success: false,
          config: null,
          error: "Opening hour must be between 0 and 23",
        };
      }

      if (
        closingHour === undefined ||
        closingHour === null ||
        closingHour < 1 ||
        closingHour > 24
      ) {
        return {
          success: false,
          config: null,
          error: "Closing hour must be between 1 and 24",
        };
      }

      if (openingHour >= closingHour) {
        return {
          success: false,
          config: null,
          error: "Opening hour must be less than closing hour",
        };
      }

      if (
        slotDurationMinutes === undefined ||
        slotDurationMinutes === null ||
        slotDurationMinutes < 15 ||
        slotDurationMinutes % 15 !== 0
      ) {
        return {
          success: false,
          config: null,
          error:
            "Slot duration must be at least 15 minutes and in 15-minute steps",
        };
      }

      if (
        slotCapacity === undefined ||
        slotCapacity === null ||
        slotCapacity < 1
      ) {
        return {
          success: false,
          config: null,
          error: "Slot capacity must be at least 1",
        };
      }

      if (
        bookingWindowDays === undefined ||
        bookingWindowDays === null ||
        bookingWindowDays < 1 ||
        bookingWindowDays > 90
      ) {
        return {
          success: false,
          config: null,
          error: "Booking window must be between 1 and 90 days",
        };
      }

      const config = await getConfigByIdOrDefault(ctx, configId);
      if (!config) {
        return {
          success: false,
          config: null,
          error: "Daily workshop config not found",
        };
      }

      const updated = await dailyWorkshopCache.withTransaction(
        ctx.prisma,
        async (tx) => {
          return tx.dailyWorkshopConfig.update({
            where: { id: config.id },
            data: {
              name: input.name,
              description: input.description,
              is_active: input.is_active,
              timezone: input.timezone,
              opening_hour: input.opening_hour,
              closing_hour: input.closing_hour,
              slot_duration_minutes: input.slot_duration_minutes,
              slot_capacity: input.slot_capacity,
              booking_window_days: input.booking_window_days,
              auto_cancel_on_blackout: input.auto_cancel_on_blackout,
            },
            include: {
              pricing_tiers: true,
              blackout_rules: true,
            },
          });
        },
      );

      return {
        success: true,
        config: mapConfig(updated),
        error: null,
      };
    });
  }

  @Mutation(() => AdminDailyWorkshopPricingTierMutationResponse)
  @adminRequired()
  async adminUpsertDailyWorkshopPricingTier(
    @Ctx() ctx: Context,
    @Arg("configId", () => Int, { nullable: true })
    configId: number | undefined,
    @Arg("input", () => AdminUpsertDailyWorkshopPricingTierInput)
    input: AdminUpsertDailyWorkshopPricingTierInput,
  ): Promise<AdminDailyWorkshopPricingTierMutationResponse> {
    return tryCatchAsync(async () => {
      if (input.hours < 1) {
        return {
          success: false,
          tier: null,
          error: "Hours must be at least 1",
        };
      }

      if (input.price_per_person < 0 || input.pieces_per_person < 0) {
        return {
          success: false,
          tier: null,
          error: "Pricing values cannot be negative",
        };
      }

      const config = await getConfigByIdOrDefault(ctx, configId);
      if (!config) {
        return {
          success: false,
          tier: null,
          error: "Daily workshop config not found",
        };
      }

      const tier = await dailyWorkshopCache.withTransaction(
        ctx.prisma,
        async (tx) => {
          if (input.id) {
            return tx.dailyWorkshopPricingTier.update({
              where: { id: input.id },
              data: {
                hours: input.hours,
                price_per_person: input.price_per_person,
                pieces_per_person: input.pieces_per_person,
                sort_order: input.sort_order ?? 0,
                is_active: input.is_active ?? true,
              },
            });
          }

          return tx.dailyWorkshopPricingTier.create({
            data: {
              config_id: config.id,
              hours: input.hours,
              price_per_person: input.price_per_person,
              pieces_per_person: input.pieces_per_person,
              sort_order: input.sort_order ?? 0,
              is_active: input.is_active ?? true,
            },
          });
        },
      );

      return {
        success: true,
        tier: {
          id: tier.id,
          config_id: tier.config_id,
          hours: tier.hours,
          price_per_person: tier.price_per_person,
          pieces_per_person: tier.pieces_per_person,
          sort_order: tier.sort_order,
          is_active: tier.is_active,
          created_at: tier.created_at,
          updated_at: tier.updated_at,
        },
        error: null,
      };
    });
  }

  @Mutation(() => AdminDailyWorkshopMutationResponse)
  @adminRequired()
  async adminDeleteDailyWorkshopPricingTier(
    @Ctx() ctx: Context,
    @Arg("id", () => Int) id: number,
  ): Promise<AdminDailyWorkshopMutationResponse> {
    return tryCatchAsync(async () => {
      await dailyWorkshopCache.withTransaction(ctx.prisma, async (tx) => {
        await tx.dailyWorkshopPricingTier.delete({ where: { id } });
        return true;
      });

      return { success: true, error: null };
    });
  }

  @Mutation(() => AdminDailyWorkshopBlackoutRuleMutationResponse)
  @adminRequired()
  async adminUpsertDailyWorkshopBlackoutRule(
    @Ctx() ctx: Context,
    @Arg("configId", () => Int, { nullable: true })
    configId: number | undefined,
    @Arg("input", () => AdminUpsertDailyWorkshopBlackoutRuleInput)
    input: AdminUpsertDailyWorkshopBlackoutRuleInput,
  ): Promise<AdminDailyWorkshopBlackoutRuleMutationResponse> {
    return tryCatchAsync(async () => {
      const config = await getConfigByIdOrDefault(ctx, configId);
      if (!config) {
        return {
          success: false,
          rule: null,
          error: "Daily workshop config not found",
        };
      }

      if (input.range_start_minutes >= input.range_end_minutes) {
        return {
          success: false,
          rule: null,
          error: "Range start must be before range end",
        };
      }

      if (!input.name?.trim()) {
        return {
          success: false,
          rule: null,
          error: "Rule name is required",
        };
      }

      if (!input.timezone?.trim()) {
        return {
          success: false,
          rule: null,
          error: "Timezone is required",
        };
      }

      if (
        input.type === DailyWorkshopBlackoutType.ONE_TIME &&
        (!input.one_time_start_at || !input.one_time_end_at)
      ) {
        return {
          success: false,
          rule: null,
          error: "One-time blackout requires a start and end datetime",
        };
      }

      if (
        input.type !== DailyWorkshopBlackoutType.ONE_TIME &&
        !input.recurrence_start_date
      ) {
        return {
          success: false,
          rule: null,
          error: "Recurring blackout requires a recurrence start date",
        };
      }

      if (input.type === DailyWorkshopBlackoutType.WEEKLY) {
        if (!input.weekdays || input.weekdays.length === 0) {
          return {
            success: false,
            rule: null,
            error: "Weekly blackout requires at least one weekday (0-6)",
          };
        }
        if (input.weekdays.some((value) => value < 0 || value > 6)) {
          return {
            success: false,
            rule: null,
            error: "Weekly blackout weekdays must be between 0 and 6",
          };
        }
      }

      if (input.type === DailyWorkshopBlackoutType.MONTHLY) {
        if (!input.month_days || input.month_days.length === 0) {
          return {
            success: false,
            rule: null,
            error: "Monthly blackout requires at least one month day (1-31)",
          };
        }
        if (input.month_days.some((value) => value < 1 || value > 31)) {
          return {
            success: false,
            rule: null,
            error: "Monthly blackout days must be between 1 and 31",
          };
        }
      }

      const type = input.type as PrismaDailyWorkshopBlackoutType;
      const payload = {
        name: input.name,
        type,
        is_active: input.is_active ?? true,
        timezone: input.timezone ?? config.timezone,
        reason: input.reason,
        auto_cancel_existing: input.auto_cancel_existing ?? true,
        one_time_start_at:
          type === PrismaDailyWorkshopBlackoutType.ONE_TIME
            ? (input.one_time_start_at ?? null)
            : null,
        one_time_end_at:
          type === PrismaDailyWorkshopBlackoutType.ONE_TIME
            ? (input.one_time_end_at ?? null)
            : null,
        recurrence_start_date:
          type === PrismaDailyWorkshopBlackoutType.ONE_TIME
            ? null
            : (input.recurrence_start_date ?? null),
        recurrence_end_date:
          type === PrismaDailyWorkshopBlackoutType.ONE_TIME
            ? null
            : (input.recurrence_end_date ?? null),
        weekdays:
          type === PrismaDailyWorkshopBlackoutType.WEEKLY
            ? (input.weekdays ?? [])
            : [],
        month_days:
          type === PrismaDailyWorkshopBlackoutType.MONTHLY
            ? (input.month_days ?? [])
            : [],
        range_start_minutes: input.range_start_minutes,
        range_end_minutes: input.range_end_minutes,
      };

      const now = new Date();
      const rule = await dailyWorkshopCache.withTransaction(
        ctx.prisma,
        async (tx) => {
          const savedRule = input.id
            ? await tx.dailyWorkshopBlackoutRule.update({
                where: { id: input.id },
                data: payload,
              })
            : await tx.dailyWorkshopBlackoutRule.create({
                data: {
                  ...payload,
                  config_id: config.id,
                  created_by_user_id: ctx.user?.dbUserId,
                },
              });

          if (
            savedRule.is_active &&
            savedRule.auto_cancel_existing &&
            config.auto_cancel_on_blackout
          ) {
            const candidateRegistrations =
              await tx.dailyWorkshopRegistration.findMany({
                where: {
                  config_id: config.id,
                  status: {
                    in: ACTIVE_CANCELLABLE_STATUSES,
                  },
                  slots: {
                    some: {
                      slot_end_at: {
                        gt: now,
                      },
                    },
                  },
                },
                select: {
                  id: true,
                  status: true,
                  participants: true,
                  discount: true,
                  price_per_person: true,
                  pieces_per_person: true,
                  pricing_snapshot: true,
                  slots: {
                    select: {
                      id: true,
                      slot_start_at: true,
                      slot_end_at: true,
                    },
                  },
                },
              });

            for (const registration of candidateRegistrations) {
              const affectedSlots = registration.slots.filter(
                (slot) =>
                  slot.slot_end_at > now &&
                  isBlockedByRule(
                    slot.slot_start_at,
                    slot.slot_end_at,
                    savedRule.timezone,
                    savedRule,
                  ),
              );

              if (affectedSlots.length === 0) {
                continue;
              }

              const affectedDateKeys = Array.from(
                new Set(
                  affectedSlots.map((slot) =>
                    getDateKeyInTimeZone(
                      slot.slot_start_at,
                      savedRule.timezone,
                    ),
                  ),
                ),
              ).sort();

              const isPartial =
                affectedSlots.length < registration.slots.length;
              const blackoutReasons = [getBlackoutBaseReason(savedRule.reason)];
              const cancellationReason = buildBlackoutCancellationReason(
                blackoutReasons,
                affectedDateKeys,
                isPartial,
                affectedSlots.length,
              );

              if (!isPartial) {
                await tx.dailyWorkshopRegistration.updateMany({
                  where: {
                    id: registration.id,
                    status: {
                      in: ACTIVE_CANCELLABLE_STATUSES,
                    },
                  },
                  data: {
                    status: PrismaDailyWorkshopRegistrationStatus.CANCELLED,
                    cancelled_at: now,
                    cancelled_reason: cancellationReason,
                    cancelled_by_user_id: null,
                    cancelled_by_blackout_rule_id: savedRule.id,
                  },
                });
                continue;
              }

              const remainingSlotCount =
                registration.slots.length - affectedSlots.length;
              if (remainingSlotCount < 1) {
                continue;
              }

              const totalHours = Math.max(
                1,
                Math.round(
                  (remainingSlotCount * config.slot_duration_minutes) / 60,
                ),
              );
              const pricing = resolveTierPricingForHours(config, totalHours);

              const pricePerPerson =
                pricing?.pricePerPerson ?? registration.price_per_person;
              const piecesPerPerson =
                pricing?.piecesPerPerson ?? registration.pieces_per_person;
              const baseAmount = pricePerPerson * registration.participants;
              const normalizedDiscount = Math.min(
                registration.discount,
                baseAmount,
              );
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
              const partialCancellationReason = buildBlackoutCancellationReason(
                blackoutReasons,
                pendingDateKeys,
                true,
                mergedPendingStarts.length,
              );
              const windowStartMinutes = Math.min(
                ...registration.slots.map((slot) =>
                  getMinutesOfDayInTimeZone(
                    slot.slot_start_at,
                    config.timezone,
                  ),
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

              await tx.dailyWorkshopRegistration.update({
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
                  cancelled_at: now,
                  cancelled_reason: partialCancellationReason,
                  cancelled_by_user_id: null,
                  cancelled_by_blackout_rule_id: savedRule.id,
                  slots: {
                    deleteMany: {
                      id: {
                        in: affectedSlots.map((slot) => slot.id),
                      },
                    },
                  },
                },
              });
            }
          }

          return savedRule;
        },
      );

      return {
        success: true,
        rule: {
          id: rule.id,
          config_id: rule.config_id,
          name: rule.name,
          type: mapBlackoutType(rule.type),
          is_active: rule.is_active,
          timezone: rule.timezone,
          reason: rule.reason,
          auto_cancel_existing: rule.auto_cancel_existing,
          one_time_start_at: rule.one_time_start_at,
          one_time_end_at: rule.one_time_end_at,
          recurrence_start_date: rule.recurrence_start_date,
          recurrence_end_date: rule.recurrence_end_date,
          weekdays: rule.weekdays,
          month_days: rule.month_days,
          range_start_minutes: rule.range_start_minutes,
          range_end_minutes: rule.range_end_minutes,
          created_by_user_id: rule.created_by_user_id,
          created_at: rule.created_at,
          updated_at: rule.updated_at,
        },
        error: null,
      };
    });
  }

  @Mutation(() => AdminDailyWorkshopMutationResponse)
  @adminRequired()
  async adminDeleteDailyWorkshopBlackoutRule(
    @Ctx() ctx: Context,
    @Arg("id", () => String) id: string,
  ): Promise<AdminDailyWorkshopMutationResponse> {
    return tryCatchAsync(async () => {
      await dailyWorkshopCache.withTransaction(ctx.prisma, async (tx) => {
        await tx.dailyWorkshopBlackoutRule.delete({ where: { id } });
        return true;
      });

      return { success: true, error: null };
    });
  }

  @Mutation(() => AdminDailyWorkshopConfigMutationResponse)
  @adminRequired()
  async adminCreateDailyWorkshopConfig(
    @Ctx() ctx: Context,
  ): Promise<AdminDailyWorkshopConfigMutationResponse> {
    return tryCatchAsync(async () => {
      const config = await dailyWorkshopCache.withTransaction(
        ctx.prisma,
        async (tx) => {
          const count = await tx.dailyWorkshopConfig.count();
          const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

          return tx.dailyWorkshopConfig.create({
            data: {
              key: `config-${uniqueSuffix}`,
              name: `Daily Workshop ${count + 1}`,
            },
            include: {
              pricing_tiers: {
                orderBy: [{ sort_order: "asc" }, { hours: "asc" }],
              },
              blackout_rules: {
                orderBy: { created_at: "desc" },
              },
            },
          });
        },
      );

      return {
        success: true,
        config: mapConfig(config),
        error: null,
      };
    });
  }

  @Mutation(() => AdminDailyWorkshopMutationResponse)
  @adminRequired()
  async adminDeleteDailyWorkshopConfig(
    @Ctx() ctx: Context,
    @Arg("id", () => Int) id: number,
  ): Promise<AdminDailyWorkshopMutationResponse> {
    return tryCatchAsync(async () => {
      const deleted = await dailyWorkshopCache.withTransaction(
        ctx.prisma,
        async (tx) => {
          const config = await tx.dailyWorkshopConfig.findUnique({
            where: { id },
            select: { id: true },
          });

          if (!config) {
            return false;
          }

          await tx.dailyWorkshopPricingTier.deleteMany({
            where: { config_id: id },
          });
          await tx.dailyWorkshopBlackoutRule.deleteMany({
            where: { config_id: id },
          });
          await tx.dailyWorkshopConfig.delete({
            where: { id },
          });

          return true;
        },
      );

      if (!deleted) {
        return { success: false, error: "Daily workshop config not found" };
      }

      return { success: true, error: null };
    });
  }

  @Mutation(() => AdminDailyWorkshopRegistrationMutationResponse)
  @adminRequired()
  async adminUpdateDailyWorkshopRegistrationDetails(
    @Ctx() ctx: Context,
    @Arg("registrationId", () => String) registrationId: string,
    @Arg("input", () => AdminUpdateDailyWorkshopRegistrationInput)
    input: AdminUpdateDailyWorkshopRegistrationInput,
  ): Promise<AdminDailyWorkshopRegistrationMutationResponse> {
    return tryCatchAsync(async () => {
      const registration = await ctx.prisma.dailyWorkshopRegistration.findUnique({
        where: { id: registrationId },
        include: {
          slots: {
            orderBy: { slot_start_at: "asc" },
          },
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
            },
          },
        },
      });

      if (!registration) {
        return {
          success: false,
          registration: null,
          error: "Registration not found",
        };
      }

      const config = await getConfigById(ctx, registration.config_id);
      if (!config) {
        return {
          success: false,
          registration: null,
          error: "Daily workshop config not found",
        };
      }

      const nextParticipants = input.participants ?? registration.participants;
      const nextPricePerPerson =
        input.price_per_person ?? registration.price_per_person;
      const nextPiecesPerPerson =
        input.pieces_per_person ?? registration.pieces_per_person;
      const requestedDiscount = input.discount ?? registration.discount;

      if (!Number.isInteger(nextParticipants) || nextParticipants < 1) {
        return {
          success: false,
          registration: null,
          error: "Participants must be at least 1",
        };
      }

      if (!Number.isInteger(nextPricePerPerson) || nextPricePerPerson < 0) {
        return {
          success: false,
          registration: null,
          error: "Price per person cannot be negative",
        };
      }

      if (!Number.isInteger(nextPiecesPerPerson) || nextPiecesPerPerson < 0) {
        return {
          success: false,
          registration: null,
          error: "Pieces per person cannot be negative",
        };
      }

      if (!Number.isInteger(requestedDiscount) || requestedDiscount < 0) {
        return {
          success: false,
          registration: null,
          error: "Discount cannot be negative",
        };
      }

      const slotStarts =
        input.slot_start_times !== undefined
          ? [...input.slot_start_times]
          : registration.slots.map((slot) => new Date(slot.slot_start_at));

      if (slotStarts.length === 0) {
        return {
          success: false,
          registration: null,
          error: "At least one slot is required",
        };
      }

      if (slotStarts.some((slot) => Number.isNaN(slot.getTime()))) {
        return {
          success: false,
          registration: null,
          error: "One or more slot times are invalid",
        };
      }

      const normalizedSlotStarts = Array.from(
        new Map(
          slotStarts.map((slot) => [new Date(slot).toISOString(), new Date(slot)]),
        ).values(),
      ).sort((a, b) => a.getTime() - b.getTime());

      if (normalizedSlotStarts.length !== slotStarts.length) {
        return {
          success: false,
          registration: null,
          error: "Duplicate slot times are not allowed",
        };
      }

      const conflictingSlot =
        await ctx.prisma.dailyWorkshopRegistrationSlot.findFirst({
          where: {
            slot_start_at: { in: normalizedSlotStarts },
            registration: {
              id: { not: registrationId },
              config_id: registration.config_id,
              status: {
                in: ACTIVE_CANCELLABLE_STATUSES,
              },
            },
          },
          select: {
            slot_start_at: true,
          },
        });

      if (conflictingSlot) {
        const conflictLabel = conflictingSlot.slot_start_at.toLocaleString(
          "en-IN",
        );
        return {
          success: false,
          registration: null,
          error: `Selected slot ${conflictLabel} is already booked`,
        };
      }

      const slotsCount = normalizedSlotStarts.length;
      const slotDurationMs = config.slot_duration_minutes * 60 * 1000;
      const totalHours = Math.max(
        1,
        Math.round((slotsCount * config.slot_duration_minutes) / 60),
      );
      const baseAmount = nextParticipants * nextPricePerPerson;
      const normalizedDiscount = Math.min(
        Math.max(0, requestedDiscount),
        baseAmount,
      );
      const finalAmount = Math.max(0, baseAmount - normalizedDiscount);
      const totalPieces = nextParticipants * nextPiecesPerPerson;
      const nextSnapshot =
        typeof registration.pricing_snapshot === "object" &&
        registration.pricing_snapshot !== null
          ? {
              ...(registration.pricing_snapshot as Record<string, unknown>),
              hours: totalHours,
              price_per_person: nextPricePerPerson,
              pieces_per_person: nextPiecesPerPerson,
              slot_duration_minutes: config.slot_duration_minutes,
            }
          : {
              hours: totalHours,
              price_per_person: nextPricePerPerson,
              pieces_per_person: nextPiecesPerPerson,
              slot_duration_minutes: config.slot_duration_minutes,
            };

      const updatedRegistration = await dailyWorkshopCache.withTransaction(
        ctx.prisma,
        async (tx) => {
          return tx.dailyWorkshopRegistration.update({
            where: { id: registrationId },
            data: {
              participants: nextParticipants,
              total_hours: totalHours,
              slots_count: slotsCount,
              price_per_person: nextPricePerPerson,
              pieces_per_person: nextPiecesPerPerson,
              base_amount: baseAmount,
              discount: normalizedDiscount,
              final_amount: finalAmount,
              total_pieces: totalPieces,
              pricing_snapshot: nextSnapshot,
              ...(input.slot_start_times !== undefined
                ? {
                    slots: {
                      deleteMany: {},
                      create: normalizedSlotStarts.map((slotStart) => ({
                        slot_start_at: slotStart,
                        slot_end_at: new Date(slotStart.getTime() + slotDurationMs),
                      })),
                    },
                  }
                : {}),
            },
            include: {
              slots: {
                orderBy: { slot_start_at: "asc" },
              },
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  image: true,
                },
              },
            },
          });
        },
      );

      await dailyWorkshopCache.invalidateUserRegistrations(registration.user_id);

      return {
        success: true,
        registration: mapRegistration(updatedRegistration),
        error: null,
      };
    });
  }

  @Mutation(() => AdminDailyWorkshopMutationResponse)
  @adminRequired()
  async adminUpdateDailyWorkshopRegistrationStatus(
    @Ctx() ctx: Context,
    @Arg("registrationId", () => String) registrationId: string,
    @Arg("status", () => String) statusStr: string,
  ): Promise<AdminDailyWorkshopMutationResponse> {
    return tryCatchAsync(async () => {
      const nextStatus = statusStr as PrismaDailyWorkshopRegistrationStatus;

      const registration =
        await ctx.prisma.dailyWorkshopRegistration.findUnique({
          where: { id: registrationId },
          select: {
            id: true,
            user_id: true,
            status: true,
            request_at: true,
            approved_at: true,
            paid_at: true,
            confirmed_at: true,
            cancelled_at: true,
          },
        });

      if (!registration) {
        return { success: false, error: "Registration not found" };
      }

      if (registration.status === nextStatus) {
        return { success: true, error: null };
      }

      const now = new Date();
      const updateData: {
        status: PrismaDailyWorkshopRegistrationStatus;
        request_at?: Date | null;
        approved_at?: Date | null;
        paid_at?: Date | null;
        confirmed_at?: Date | null;
        cancelled_at?: Date | null;
      } = {
        status: nextStatus,
      };

      const currentMainIndex = MAIN_FLOW.indexOf(registration.status);
      const nextMainIndex = MAIN_FLOW.indexOf(nextStatus);

      if (nextMainIndex > currentMainIndex && currentMainIndex !== -1) {
        const intermediate = getIntermediateStatuses(
          registration.status,
          nextStatus,
        );
        for (const status of intermediate) {
          const field = STATUS_TIMESTAMP_FIELDS[status];
          if (field) {
            updateData[field] = now;
          }
        }
      }

      const timestampField = STATUS_TIMESTAMP_FIELDS[nextStatus];
      if (timestampField && !updateData[timestampField]) {
        updateData[timestampField] = now;
      }

      if (
        nextMainIndex !== -1 &&
        currentMainIndex !== -1 &&
        nextMainIndex < currentMainIndex
      ) {
        const later = getLaterStatuses(nextStatus);
        for (const status of later) {
          const field = STATUS_TIMESTAMP_FIELDS[status];
          if (field) {
            updateData[field] = null;
          }
        }
      }

      if (nextStatus !== PrismaDailyWorkshopRegistrationStatus.CANCELLED) {
        updateData.cancelled_at = null;
      }

      await dailyWorkshopCache.withTransaction(ctx.prisma, async (tx) => {
        await tx.dailyWorkshopRegistration.update({
          where: { id: registrationId },
          data: updateData,
        });
        return true;
      });

      await dailyWorkshopCache.invalidateUserRegistrations(
        registration.user_id,
      );

      return { success: true, error: null };
    });
  }
}
