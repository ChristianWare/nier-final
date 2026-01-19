/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import styles from "./AdminNewBookingWizard.module.css";
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import RoutePicker, {
  RoutePickerPlace,
  RoutePickerValue,
} from "@/components/BookingPage/RoutePicker/RoutePicker";
import BookingDateTimePicker from "@/components/BookingPage/BookingDateTimePicker/BookingDateTimePicker";
import Stepper from "@/components/BookingPage/Stepper/Stepper";
import Grid2 from "@/components/BookingPage/Grid2/Grid2";
import SummaryRow from "@/components/BookingPage/SummaryRow/SummaryRow";
import { adminCreateBooking } from "../../../../actions/bookings/adminCreateBooking";
import { adminSearchUsers} from '../../../../actions/admin/users/adminSearchUsers'

type PricingStrategy = "POINT_TO_POINT" | "HOURLY" | "FLAT";
type AirportLeg = "NONE" | "PICKUP" | "DROPOFF";

type AirportDTO = {
  id: string;
  name: string;
  iata: string;
  address: string;
  placeId: string | null;
  lat: any | null;
  lng: any | null;
};

type ServiceTypeDTO = {
  id: string;
  name: string;
  slug: string;
  pricingStrategy: PricingStrategy;
  minFareCents: number;
  baseFeeCents: number;
  perMileCents: number;
  perMinuteCents: number;
  perHourCents: number;
  active: boolean;
  sortOrder: number;
  airportLeg: AirportLeg;
  airports: AirportDTO[];
};

type VehicleDTO = {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  luggageCapacity: number;
  imageUrl: string | null;
  minHours: number;
  baseFareCents: number;
  perMileCents: number;
  perMinuteCents: number;
  perHourCents: number;
  active: boolean;
  sortOrder: number;
};

type AdminBookingStatus = "PENDING_REVIEW" | "PENDING_PAYMENT" | "CONFIRMED";

type UserLite = {
  id: string;
  name: string | null;
  email: string;
  emailVerified: boolean;
};

function centsToUsd(cents: number) {
  return (cents / 100).toFixed(2);
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function toNumber(v: any): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function estimateTotalCents(args: {
  service: ServiceTypeDTO;
  vehicle: VehicleDTO | null;
  distanceMiles: number;
  durationMinutes: number;
  hoursRequested: number;
}) {
  const { service, vehicle, distanceMiles, durationMinutes, hoursRequested } =
    args;

  const base =
    vehicle && vehicle.baseFareCents > 0
      ? vehicle.baseFareCents
      : service.baseFeeCents;

  const perMile =
    vehicle && vehicle.perMileCents > 0
      ? vehicle.perMileCents
      : service.perMileCents;

  const perMinute =
    vehicle && vehicle.perMinuteCents > 0
      ? vehicle.perMinuteCents
      : service.perMinuteCents;

  const perHour =
    vehicle && vehicle.perHourCents > 0
      ? vehicle.perHourCents
      : service.perHourCents;

  if (service.pricingStrategy === "HOURLY") {
    const minHours = vehicle?.minHours ?? 0;
    const billedHours = Math.max(
      Math.ceil(hoursRequested || 0),
      Math.ceil(minHours || 0),
    );
    const raw = base + billedHours * perHour;
    return Math.max(service.minFareCents, raw);
  }

  const raw =
    base +
    Math.round(distanceMiles * perMile) +
    Math.round(durationMinutes * perMinute);

  return Math.max(service.minFareCents, raw);
}

export default function AdminNewBookingWizard({
  serviceTypes,
  vehicles,
  blackoutsByYmd,
}: {
  serviceTypes: ServiceTypeDTO[];
  vehicles: VehicleDTO[];
  blackoutsByYmd: Record<string, boolean>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [customerKind, setCustomerKind] = useState<"account" | "guest">(
    "account",
  );

  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<UserLite[]>([]);
  const [userSearching, setUserSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserLite | null>(null);

  const [serviceTypeId, setServiceTypeId] = useState<string>("");
  const [pickupAtDate, setPickupAtDate] = useState<string>("");
  const [pickupAtTime, setPickupAtTime] = useState<string>("");
  const [passengers, setPassengers] = useState<number>(1);
  const [luggage, setLuggage] = useState<number>(0);
  const [hoursRequested, setHoursRequested] = useState<number>(2);

  const [route, setRoute] = useState<RoutePickerValue | null>(null);
  const pickupInputRef = useRef<HTMLInputElement | null>(null);
  const dropoffInputRef = useRef<HTMLInputElement | null>(null);

  const [vehicleId, setVehicleId] = useState<string>("");
  const [specialRequests, setSpecialRequests] = useState<string>("");

  const [pickupAirportId, setPickupAirportId] = useState<string>("");
  const [dropoffAirportId, setDropoffAirportId] = useState<string>("");

  const [bookingStatus, setBookingStatus] =
    useState<AdminBookingStatus>("PENDING_REVIEW");

  const selectedService = useMemo(() => {
    if (!serviceTypeId) return null;
    return serviceTypes.find((s) => s.id === serviceTypeId) ?? null;
  }, [serviceTypes, serviceTypeId]);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === vehicleId) ?? null,
    [vehicles, vehicleId],
  );

  const serviceAirports = selectedService?.airports ?? [];
  const usesPickupAirport = selectedService?.airportLeg === "PICKUP";
  const usesDropoffAirport = selectedService?.airportLeg === "DROPOFF";

  useEffect(() => {
    if (customerKind === "guest") {
      setSelectedUser(null);
      setUserQuery("");
      setUserResults([]);
      setUserSearching(false);
      return;
    }

    if (customerKind === "account") {
      setCustomerPhone("");
      if (selectedUser) {
        setCustomerEmail(selectedUser.email);
        setCustomerName((selectedUser.name ?? "").trim());
      }
    }
  }, [customerKind, selectedUser]);

  useEffect(() => {
    if (customerKind !== "account") return;
    if (selectedUser) return;

    const q = userQuery.trim();
    if (q.length < 2) {
      setUserResults([]);
      setUserSearching(false);
      return;
    }

    let alive = true;
    setUserSearching(true);

    const t = setTimeout(async () => {
      try {
        const res = await adminSearchUsers({ query: q });
        if (!alive) return;
        setUserResults((res?.users ?? []) as UserLite[]);
      } catch (e: any) {
        if (!alive) return;
        setUserResults([]);
      } finally {
        if (!alive) return;
        setUserSearching(false);
      }
    }, 250);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [customerKind, userQuery, selectedUser]);

  function applyAirportToRoute(side: "pickup" | "dropoff", airportId: string) {
    const a = serviceAirports.find((x) => x.id === airportId) ?? null;

    if (!a) {
      setRoute((prev) => {
        const prevPickup = prev?.pickup ?? null;
        const prevDropoff = prev?.dropoff ?? null;

        const next: RoutePickerValue = {
          pickup: side === "pickup" ? null : prevPickup,
          dropoff: side === "dropoff" ? null : prevDropoff,
          miles: null,
          minutes: null,
          distanceMiles: null,
          durationMinutes: null,
        };

        if (!next.pickup && !next.dropoff) return null;
        return next;
      });
      return;
    }

    const lat = toNumber(a.lat);
    const lng = toNumber(a.lng);

    if (lat == null || lng == null) {
      toast.error(
        "That airport is missing coordinates. Edit the airport and choose an address suggestion so we can save its location.",
      );
      return;
    }

    const place: RoutePickerPlace = {
      address: a.address,
      placeId: a.placeId ?? a.id,
      location: { lat, lng },
    };

    setRoute((prev) => {
      const prevPickup = prev?.pickup ?? null;
      const prevDropoff = prev?.dropoff ?? null;

      const next: RoutePickerValue = {
        pickup: side === "pickup" ? place : prevPickup,
        dropoff: side === "dropoff" ? place : prevDropoff,
        miles: null,
        minutes: null,
        distanceMiles: null,
        durationMinutes: null,
      };

      return next;
    });
  }

  const minHours =
    selectedService?.pricingStrategy === "HOURLY"
      ? (selectedVehicle?.minHours ?? 0)
      : 0;

  const billableHours =
    selectedService?.pricingStrategy === "HOURLY"
      ? Math.max(Math.ceil(hoursRequested || 0), Math.ceil(minHours || 0))
      : null;

  const distanceMiles = Number(route?.miles ?? 0);
  const durationMinutes = Number(route?.minutes ?? 0);

  const estimateCents = useMemo(() => {
    if (!selectedService) return 0;
    return estimateTotalCents({
      service: selectedService,
      vehicle: selectedVehicle,
      distanceMiles,
      durationMinutes,
      hoursRequested,
    });
  }, [
    selectedService,
    selectedVehicle,
    distanceMiles,
    durationMinutes,
    hoursRequested,
  ]);

  function pickDate(val: string) {
    if (val && blackoutsByYmd[val]) {
      toast.error("That date is blacked out. Please choose another day.");
      return;
    }
    setPickupAtDate(val);
  }

  function selectUser(u: UserLite) {
    setSelectedUser(u);
    setUserResults([]);
    setUserQuery("");
    setCustomerEmail(u.email);
    setCustomerName((u.name ?? "").trim());
  }

  function clearSelectedUser() {
    setSelectedUser(null);
    setCustomerEmail("");
    setCustomerName("");
    setUserQuery("");
    setUserResults([]);
  }

  function canGoStep2() {
    if (!selectedService) return false;
    if (!pickupAtDate || !pickupAtTime) return false;
    if (blackoutsByYmd[pickupAtDate]) return false;

    if (selectedService.airportLeg !== "NONE" && serviceAirports.length === 0) {
      return false;
    }

    if (usesPickupAirport && !pickupAirportId) return false;
    if (usesDropoffAirport && !dropoffAirportId) return false;

    if (!route?.pickup || !route?.dropoff) return false;

    if (customerKind === "account") {
      if (!selectedUser) return false;
      return true;
    }

    const email = customerEmail.trim().toLowerCase();
    if (!email || !isValidEmail(email)) return false;
    if (!customerName.trim()) return false;
    if (!customerPhone.trim()) return false;

    return true;
  }

  function canGoStep3() {
    if (!selectedService) return false;
    if (!vehicleId) return false;
    return true;
  }

  async function handleSubmit() {
    if (!selectedService) return toast.error("Please select a service.");
    if (!vehicleId) return toast.error("Please choose a vehicle category.");
    if (!pickupAtDate || !pickupAtTime)
      return toast.error("Please choose date and time.");
    if (blackoutsByYmd[pickupAtDate])
      return toast.error("That date is blacked out.");
    if (!route?.pickup || !route?.dropoff)
      return toast.error("Please select pickup and dropoff.");

    let customerUserId: string | null = null;
    let email = "";

    if (customerKind === "account") {
      if (!selectedUser) return toast.error("Please select an existing user.");
      customerUserId = selectedUser.id;
      email = selectedUser.email.trim().toLowerCase();
    } else {
      email = customerEmail.trim().toLowerCase();
      if (!email || !isValidEmail(email))
        return toast.error("Enter a valid customer email.");
      if (!customerName.trim()) return toast.error("Enter the guest name.");
      if (!customerPhone.trim()) return toast.error("Enter the guest phone.");
    }

    const pickupAtIso = new Date(
      `${pickupAtDate}T${pickupAtTime}:00`,
    ).toISOString();

    startTransition(async () => {
      if (!route?.pickup || !route?.dropoff) {
        toast.error("Please select pickup and dropoff.");
        return;
      }

      const pickup = route.pickup;
      const dropoff = route.dropoff;

      const res = await adminCreateBooking({
        serviceTypeId,
        vehicleId,
        pickupAt: pickupAtIso,
        passengers,
        luggage,

        pickupAddress: pickup.address,
        pickupPlaceId: pickup.placeId ?? null,
        pickupLat: pickup.location?.lat ?? null,
        pickupLng: pickup.location?.lng ?? null,

        dropoffAddress: dropoff.address,
        dropoffPlaceId: dropoff.placeId ?? null,
        dropoffLat: dropoff.location?.lat ?? null,
        dropoffLng: dropoff.location?.lng ?? null,

        distanceMiles: route.miles ?? null,
        durationMinutes: route.minutes ?? null,

        hoursRequested:
          selectedService?.pricingStrategy === "HOURLY" ? hoursRequested : null,
        specialRequests: specialRequests || null,

        status: bookingStatus,

        customerKind,
        customerUserId,
        customerEmail: email,
        customerName: customerKind === "guest" ? customerName.trim() : null,
        customerPhone: customerKind === "guest" ? customerPhone.trim() : null,
      });

      if ((res as any)?.error) {
        toast.error((res as any).error);
        return;
      }

      toast.success("Booking created.");
      router.push(`/admin/bookings/${(res as any).bookingId}`);
    });
  }

  const inputsKey = `${step}-${serviceTypeId || "none"}-${customerKind}-${usesPickupAirport ? "P" : ""}${usesDropoffAirport ? "D" : ""}`;

  return (
    <section className={styles.container}>
      <div className={styles.content}>
        <div className={styles.left}>
          <Stepper step={step} />
          <div className={styles.routePickerContainer}>
            <RoutePicker
              value={route}
              onChange={setRoute}
              pickupInputRef={pickupInputRef}
              dropoffInputRef={dropoffInputRef}
              inputsKey={inputsKey}
            />
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.wizard}>
            {step === 1 ? (
              <div className={styles.contentBox}>
                <h2 className='underline'>Trip details</h2>
                <p className='subheading'>Customer, date/time, and route.</p>

                <div style={{ display: "grid", gap: 10 }}>
                  <label className='cardTitle h5'>Customer type</label>
                  <select
                    className='input emptySmall'
                    value={customerKind}
                    onChange={(e) => setCustomerKind(e.target.value as any)}
                  >
                    <option value='account'>Account (existing user)</option>
                    <option value='guest'>Guest (no account)</option>
                  </select>
                </div>

                {customerKind === "account" ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <label className='cardTitle h5'>Attach to user</label>

                    {selectedUser ? (
                      <div
                        style={{
                          border: "1px solid rgba(0,0,0,0.12)",
                          borderRadius: 10,
                          padding: 12,
                          background: "white",
                          display: "grid",
                          gap: 6,
                        }}
                      >
                        <div className='emptyTitle'>
                          {(selectedUser.name ?? "").trim() || "Unnamed user"}
                        </div>
                        <div className='miniNote'>{selectedUser.email}</div>
                        <div
                          style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                        >
                          <span
                            className={`badge badge_${selectedUser.emailVerified ? "good" : "warn"}`}
                          >
                            {selectedUser.emailVerified
                              ? "Verified"
                              : "Not verified"}
                          </span>
                          <button
                            type='button'
                            className='secondaryBtn'
                            onClick={clearSelectedUser}
                          >
                            Change user
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: 8 }}>
                        <input
                          className='input emptySmall'
                          value={userQuery}
                          onChange={(e) => setUserQuery(e.target.value)}
                          placeholder='Search by email or name…'
                          autoComplete='off'
                        />

                        {userSearching ? (
                          <div className='miniNote'>Searching…</div>
                        ) : null}

                        {userQuery.trim().length >= 2 &&
                        !userSearching &&
                        userResults.length === 0 ? (
                          <div className='miniNote'>No users found.</div>
                        ) : null}

                        {userResults.length > 0 ? (
                          <div
                            style={{
                              border: "1px solid rgba(0,0,0,0.12)",
                              borderRadius: 10,
                              overflow: "hidden",
                              background: "white",
                            }}
                          >
                            {userResults.map((u) => (
                              <button
                                key={u.id}
                                type='button'
                                onClick={() => selectUser(u)}
                                style={{
                                  width: "100%",
                                  textAlign: "left",
                                  padding: 12,
                                  display: "grid",
                                  gap: 4,
                                  border: "none",
                                  background: "white",
                                  cursor: "pointer",
                                  borderBottom: "1px solid rgba(0,0,0,0.08)",
                                }}
                              >
                                <div className='emptyTitle'>
                                  {(u.name ?? "").trim() || "Unnamed user"}
                                </div>
                                <div className='miniNote'>{u.email}</div>
                                <div
                                  style={{
                                    display: "flex",
                                    gap: 8,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <span
                                    className={`badge badge_${u.emailVerified ? "good" : "warn"}`}
                                  >
                                    {u.emailVerified
                                      ? "Verified"
                                      : "Not verified"}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <Grid2>
                      <div style={{ display: "grid", gap: 8 }}>
                        <label className='cardTitle h5'>Customer email</label>
                        <input
                          className='input emptySmall'
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder='customer@email.com'
                          inputMode='email'
                        />
                      </div>

                      <div style={{ display: "grid", gap: 8 }}>
                        <label className='cardTitle h5'>Customer name</label>
                        <input
                          className='input emptySmall'
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder='Required for guest'
                        />
                      </div>
                    </Grid2>

                    <div style={{ display: "grid", gap: 8 }}>
                      <label className='cardTitle h5'>Customer phone</label>
                      <input
                        className='input emptySmall'
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder='(602) 555-1234'
                        inputMode='tel'
                      />
                    </div>
                  </>
                )}

                <div style={{ display: "grid", gap: 8 }}>
                  <label className='cardTitle h5'>Service</label>
                  <select
                    value={serviceTypeId}
                    onChange={(e) => {
                      const next = e.target.value;

                      setPickupAirportId("");
                      setDropoffAirportId("");
                      setRoute(null);
                      setVehicleId("");

                      setServiceTypeId(next);

                      const svc = serviceTypes.find((s) => s.id === next);
                      if (svc?.pricingStrategy === "HOURLY") {
                        setHoursRequested((prev) => Math.max(prev || 2, 2));
                      }
                    }}
                    className='input emptySmall'
                  >
                    <option value=''>Select a service...</option>
                    {serviceTypes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <label className='cardTitle h5'>Status</label>
                  <select
                    value={bookingStatus}
                    onChange={(e) =>
                      setBookingStatus(e.target.value as AdminBookingStatus)
                    }
                    className='input emptySmall'
                  >
                    <option value='PENDING_REVIEW'>Pending review</option>
                    <option value='PENDING_PAYMENT'>Pending payment</option>
                    <option value='CONFIRMED'>Confirmed</option>
                  </select>
                </div>

                {selectedService &&
                selectedService.airportLeg !== "NONE" &&
                serviceAirports.length === 0 ? (
                  <div
                    className='miniNote'
                    style={{ color: "rgba(180,0,0,0.8)" }}
                  >
                    This airport service isn’t configured yet (no airports
                    assigned).
                  </div>
                ) : null}

                <BookingDateTimePicker
                  date={pickupAtDate}
                  time={pickupAtTime}
                  onChangeDate={pickDate}
                  onChangeTime={setPickupAtTime}
                />

                <Grid2>
                  <div style={{ display: "grid", gap: 8 }}>
                    <label className='cardTitle h5'>Passengers</label>
                    <input
                      type='number'
                      min={1}
                      value={passengers}
                      onChange={(e) => setPassengers(Number(e.target.value))}
                      className='input emptySmall'
                    />
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    <label className='cardTitle h5'>Luggage</label>
                    <input
                      type='number'
                      min={0}
                      value={luggage}
                      onChange={(e) => setLuggage(Number(e.target.value))}
                      className='input emptySmall'
                    />
                  </div>
                </Grid2>

                <div className={styles.pickupDropoffContainer}>
                  <div style={{ display: "grid", gap: 8 }}>
                    <label className='cardTitle h5'>
                      {usesPickupAirport ? "Pickup airport" : "Pickup"}
                    </label>

                    {usesPickupAirport ? (
                      <select
                        value={pickupAirportId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setPickupAirportId(id);
                          applyAirportToRoute("pickup", id);
                        }}
                        className='input emptySmall'
                      >
                        <option value=''>Select an airport...</option>
                        {serviceAirports.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.iata})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        ref={pickupInputRef}
                        placeholder='Enter pickup address'
                        autoComplete='off'
                        className='input emptySmall'
                      />
                    )}
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    <label className='cardTitle h5'>
                      {usesDropoffAirport ? "Dropoff airport" : "Dropoff"}
                    </label>

                    {usesDropoffAirport ? (
                      <select
                        value={dropoffAirportId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setDropoffAirportId(id);
                          applyAirportToRoute("dropoff", id);
                        }}
                        className='input emptySmall'
                      >
                        <option value=''>Select an airport...</option>
                        {serviceAirports.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.iata})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        ref={dropoffInputRef}
                        placeholder='Enter dropoff address'
                        autoComplete='off'
                        className='input emptySmall'
                      />
                    )}
                  </div>
                </div>

                {selectedService?.pricingStrategy === "HOURLY" ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <label className='cardTitle h5'>Hours</label>
                    <input
                      type='number'
                      min={1}
                      step={1}
                      value={hoursRequested}
                      onChange={(e) =>
                        setHoursRequested(Number(e.target.value))
                      }
                      className='input emptySmall'
                    />
                  </div>
                ) : null}

                <div className={styles.btnRow}>
                  <button
                    type='button'
                    className='primaryBtn'
                    disabled={isPending}
                    onClick={() => {
                      if (!canGoStep2()) {
                        toast.error(
                          "Please complete customer, service, date/time, and route.",
                        );
                        return;
                      }
                      setStep(2);
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div style={{ display: "grid", gap: 14 }}>
                <h2 className='underline'>Choose a vehicle</h2>
                <p className='subheading'>Choose a vehicle category</p>

                <div style={{ display: "grid", gap: 10 }}>
                  {vehicles.map((v) => {
                    const isSelected = v.id === vehicleId;

                    const rowEstimateCents = selectedService
                      ? estimateTotalCents({
                          service: selectedService,
                          vehicle: v,
                          distanceMiles,
                          durationMinutes,
                          hoursRequested,
                        })
                      : 0;

                    const rowMinHours =
                      selectedService?.pricingStrategy === "HOURLY"
                        ? v.minHours
                        : null;

                    const rowBillable =
                      selectedService?.pricingStrategy === "HOURLY"
                        ? Math.max(
                            Math.ceil(hoursRequested || 0),
                            Math.ceil(v.minHours || 0),
                          )
                        : null;

                    return (
                      <button
                        key={v.id}
                        type='button'
                        onClick={() => {
                          setVehicleId(v.id);
                          if (selectedService?.pricingStrategy === "HOURLY") {
                            setHoursRequested((prev) =>
                              Math.max(prev || 1, v.minHours || 0),
                            );
                          }
                        }}
                        className={styles.vehicleCard}
                        style={{
                          border: isSelected
                            ? "2px solid rgba(0,0,0,0.6)"
                            : "1px solid rgba(0,0,0,0.25)",
                        }}
                      >
                        <div className={styles.vehicleTop}>
                          <div className='emptyTitle'>{v.name}</div>
                          <div className='emptyTitleSmall'>
                            ${centsToUsd(rowEstimateCents)}
                          </div>
                        </div>

                        <div className='val'>
                          Capacity: {v.capacity} • Luggage: {v.luggageCapacity}
                          {rowMinHours !== null
                            ? ` • Min hours: ${rowMinHours}`
                            : ""}
                          {rowBillable !== null
                            ? ` • Billable hours: ${rowBillable}`
                            : ""}
                        </div>

                        {v.description ? (
                          <div style={{ fontSize: 12, opacity: 0.75 }}>
                            {v.description}
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                <div className={styles.actionsBetween}>
                  <button
                    type='button'
                    className='secondaryBtn'
                    onClick={() => setStep(1)}
                  >
                    Back
                  </button>

                  <button
                    type='button'
                    className='primaryBtn'
                    onClick={() => {
                      if (!canGoStep3()) {
                        toast.error("Please choose a vehicle category.");
                        return;
                      }
                      setStep(3);
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div style={{ display: "grid", gap: 30 }}>
                <h2 className='underline'>Confirm</h2>
                <p className='subheading'>Overview</p>

                <div className='box'>
                  <SummaryRow label='Customer type' value={customerKind} />

                  {customerKind === "account" ? (
                    <>
                      <SummaryRow
                        label='User'
                        value={
                          selectedUser
                            ? `${(selectedUser.name ?? "").trim() || "Unnamed"} • ${selectedUser.email}`
                            : "—"
                        }
                      />
                      <SummaryRow
                        label='Email verification'
                        value={
                          selectedUser?.emailVerified
                            ? "Verified"
                            : "Not verified"
                        }
                      />
                    </>
                  ) : (
                    <>
                      <SummaryRow
                        label='Customer email'
                        value={customerEmail || "—"}
                      />
                      <SummaryRow
                        label='Customer name'
                        value={customerName || "—"}
                      />
                      <SummaryRow
                        label='Customer phone'
                        value={customerPhone || "—"}
                      />
                    </>
                  )}

                  <SummaryRow
                    label='Service'
                    value={selectedService?.name ?? "—"}
                  />
                  <SummaryRow
                    label='Pickup time'
                    value={
                      pickupAtDate && pickupAtTime
                        ? `${pickupAtDate} @ ${pickupAtTime}`
                        : "—"
                    }
                  />
                  <SummaryRow label='Passengers' value={String(passengers)} />
                  <SummaryRow label='Luggage' value={String(luggage)} />
                  <SummaryRow
                    label='Pickup'
                    value={route?.pickup?.address ?? "—"}
                  />
                  <SummaryRow
                    label='Dropoff'
                    value={route?.dropoff?.address ?? "—"}
                  />

                  {selectedService?.pricingStrategy === "HOURLY" ? (
                    <>
                      <SummaryRow
                        label='Hours requested'
                        value={String(hoursRequested)}
                      />
                      <SummaryRow
                        label='Billable hours (min applied)'
                        value={String(billableHours ?? hoursRequested)}
                      />
                    </>
                  ) : null}

                  <SummaryRow
                    label='Estimate'
                    value={`$${centsToUsd(estimateCents)}`}
                    strong
                  />

                  {blackoutsByYmd[pickupAtDate] ? (
                    <div
                      className='miniNote'
                      style={{ color: "rgba(180,0,0,0.85)" }}
                    >
                      This date is blacked out. Please go back and choose
                      another day.
                    </div>
                  ) : null}
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <div className='cardTitle h5'>
                    Special requests (optional)
                  </div>
                  <textarea
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    className='input subheading'
                    style={{ minHeight: 90 }}
                    placeholder='Child seat, wheelchair needs, extra stops, meet & greet...'
                  />
                </div>

                <div className={styles.actionsBetween}>
                  <button
                    type='button'
                    className='secondaryBtn'
                    onClick={() => setStep(2)}
                    disabled={isPending}
                  >
                    Back
                  </button>

                  <button
                    type='button'
                    className='primaryBtn'
                    onClick={handleSubmit}
                    disabled={isPending}
                  >
                    {isPending ? "Creating..." : "Create booking"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
