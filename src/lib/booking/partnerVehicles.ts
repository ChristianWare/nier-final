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

/** Prisma filter for the general booking tools: active, not a partner's. */
export const PUBLIC_VEHICLE_WHERE = {
  active: true,
  name: { notIn: PARTNER_VEHICLE_NAMES },
};
