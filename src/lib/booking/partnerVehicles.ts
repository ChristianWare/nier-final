// src/lib/booking/partnerVehicles.ts
//
// Vehicles that belong to a partner's own booking tool (We-Ko-Pa Golf Club,
// Denu Hotel & Spa). They're booked only on those partner pages, so the
// general booking tools never list them.

export const WEKOPA_VEHICLE_NAMES = [
  "WeKoPa SUV",
  "WeKoPa Van",
  "WeKoPa Mesa SUV",
  "WeKoPa Mesa Van",
];

export const DENU_VEHICLE_NAMES = [
  "Denu SUV",
  "Denu Van",
  "Denu Mesa SUV",
  "Denu Mesa Van",
];

export const PARTNER_VEHICLE_NAMES = [
  ...WEKOPA_VEHICLE_NAMES,
  ...DENU_VEHICLE_NAMES,
];

export type PartnerTool = "wekopa" | "denu";

/** Which partner's booking tool a vehicle belongs to, or null for public. */
export function partnerToolForVehicleName(
  name: string | null | undefined,
): PartnerTool | null {
  if (!name) return null;
  if (WEKOPA_VEHICLE_NAMES.includes(name)) return "wekopa";
  if (DENU_VEHICLE_NAMES.includes(name)) return "denu";
  return null;
}

/**
 * Can this vehicle be booked from this tool? Partner vehicles only from their
 * own partner's tool (they're often marked inactive on purpose so the public
 * tools never list them); every other vehicle must be active and is never
 * bookable from a partner tool.
 */
export function vehicleAllowedForTool(
  vehicle: { name: string; active: boolean } | null | undefined,
  tool: PartnerTool | null | undefined,
): boolean {
  if (!vehicle) return false;
  const owner = partnerToolForVehicleName(vehicle.name);
  if (owner) return tool === owner;
  return vehicle.active && !tool;
}

/** Prisma filter for the general booking tools: active, not a partner's. */
export const PUBLIC_VEHICLE_WHERE = {
  active: true,
  name: { notIn: PARTNER_VEHICLE_NAMES },
};
