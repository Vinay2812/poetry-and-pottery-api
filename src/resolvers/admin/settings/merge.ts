// poetry-and-pottery-api/src/resolvers/admin/settings/merge.ts

// Deep-merge `partial` over `defaults` so missing keys fall back to defaults.
// Arrays are replaced wholesale (not merged element-by-element).
export function deepMergeDefaults<T>(defaults: T, partial: unknown): T {
  if (partial === null || partial === undefined) return defaults;
  if (Array.isArray(defaults)) {
    return Array.isArray(partial) ? (partial as T) : defaults;
  }
  if (typeof defaults !== "object") {
    return typeof partial === typeof defaults ? (partial as T) : defaults;
  }
  if (typeof partial !== "object") return defaults;

  const out: Record<string, unknown> = {
    ...(defaults as Record<string, unknown>),
  };
  for (const key of Object.keys(partial as object)) {
    const dv = (defaults as Record<string, unknown>)[key];
    const pv = (partial as Record<string, unknown>)[key];
    out[key] =
      dv !== undefined &&
      typeof dv === "object" &&
      dv !== null &&
      !Array.isArray(dv)
        ? deepMergeDefaults(dv, pv)
        : (pv ?? dv);
  }
  return out as T;
}
