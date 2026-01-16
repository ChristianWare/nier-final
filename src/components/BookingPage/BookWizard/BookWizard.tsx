/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import styles from "./BookingWizard.module.css";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import RoutePicker, {
  RoutePickerValue,
} from "@/components/BookingPage/RoutePicker/RoutePicker";
import { createBookingRequest } from "../../../../actions/bookings/createBookingRequest";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import Grid2 from "../Grid2/Grid2";
import Stepper from "../Stepper/Stepper";
import SummaryRow from "../SummaryRow/SummaryRow";
import BookingDateTimePicker from "@/components/BookingPage/BookingDateTimePicker/BookingDateTimePicker";
import { useSession } from "next-auth/react";

type PricingStrategy = "POINT_TO_POINT" | "HOURLY" | "FLAT";
type AirportLeg = "NONE" | "PICKUP" | "DROPOFF";

type AirportDTO = {
  id: string;
  name: string;
  iata: string;
  address: string;
  placeId: string | null;
  lat: any | null; // Prisma Decimal at runtime
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

function centsToUsd(cents: number) {
  return (cents / 100).toFixed(2);
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
      Math.ceil(minHours || 0)
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

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function decimalToNumber(v: any) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function BookingWizard({
  serviceTypes,
  vehicles,
}: {
  serviceTypes: ServiceTypeDTO[];
  vehicles: VehicleDTO[];
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const isAuthed = Boolean(session?.user);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const services = useMemo<ServiceTypeDTO[]>(
    () => serviceTypes ?? [],
    [serviceTypes]
  );

  const vehicleOptions = useMemo<VehicleDTO[]>(
    () => vehicles ?? [],
    [vehicles]
  );

  const [serviceTypeId, setServiceTypeId] = useState<string>(
    services[0]?.id ?? ""
  );

  const [pickupAtDate, setPickupAtDate] = useState<string>("");
  const [pickupAtTime, setPickupAtTime] = useState<string>("");
  const [passengers, setPassengers] = useState<number>(1);
  const [luggage, setLuggage] = useState<number>(0);

  const [route, setRoute] = useState<RoutePickerValue | null>(null);

  const pickupInputRef = useRef<HTMLInputElement | null>(null);
  const dropoffInputRef = useRef<HTMLInputElement | null>(null);

  const [hoursRequested, setHoursRequested] = useState<number>(2);
  const [vehicleId, setVehicleId] = useState<string>("");
  const [specialRequests, setSpecialRequests] = useState<string>("");

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  // ✅ airport selections
  const [pickupAirportId, setPickupAirportId] = useState<string>("");
  const [dropoffAirportId, setDropoffAirportId] = useState<string>("");

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceTypeId) ?? null,
    [services, serviceTypeId]
  );

  const selectedVehicle = useMemo(
    () => vehicleOptions.find((v) => v.id === vehicleId) ?? null,
    [vehicleOptions, vehicleId]
  );

  const serviceAirports = selectedService?.airports ?? [];
  const usesPickupAirport = selectedService?.airportLeg === "PICKUP";
  const usesDropoffAirport = selectedService?.airportLeg === "DROPOFF";

  // Reset airport picks when service changes
  // useEffect(() => {
  //   setPickupAirportId("");
  //   setDropoffAirportId("");
  // }, [serviceTypeId]);

  function applyAirportToRoute(side: "pickup" | "dropoff", airportId: string) {
    const a = serviceAirports.find((x) => x.id === airportId) ?? null;

    setRoute((prev) => {
      const next: any = { ...(prev ?? {}) };

      if (!a) {
        delete next[side];
        next.miles = null;
        next.minutes = null;
        return Object.keys(next).length ? next : null;
      }

      const lat = decimalToNumber(a.lat);
      const lng = decimalToNumber(a.lng);

      next[side] = {
        address: a.address,
        placeId: a.placeId ?? null,
        location: lat != null && lng != null ? { lat, lng } : (null as any),
      };

      // force recalculation downstream (RoutePicker usually recomputes)
      next.miles = null;
      next.minutes = null;

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

  function canGoStep2() {
    if (!selectedService) return false;
    if (!pickupAtDate || !pickupAtTime) return false;

    // ✅ Option 4: airport service must have airports configured
    if (selectedService.airportLeg !== "NONE" && serviceAirports.length === 0) {
      return false;
    }

    // Require airport selection if needed
    if (usesPickupAirport && !pickupAirportId) return false;
    if (usesDropoffAirport && !dropoffAirportId) return false;

    if (!route?.pickup || !route?.dropoff) return false;

    return true;
  }

  function canGoStep3() {
    if (!selectedService) return false;
    if (!vehicleId) return false;
    return true;
  }

  async function handleSubmit() {
    if (submitting || submitted) return;

    if (!selectedService) {
      toast.error("Please select a service.");
      return;
    }

    if (selectedService.airportLeg !== "NONE" && serviceAirports.length === 0) {
      toast.error(
        "This airport service is not configured yet. Please choose a different service or contact support."
      );
      return;
    }

    if (usesPickupAirport && !pickupAirportId) {
      toast.error("Please choose a pickup airport.");
      return;
    }
    if (usesDropoffAirport && !dropoffAirportId) {
      toast.error("Please choose a dropoff airport.");
      return;
    }

    if (!route?.pickup || !route?.dropoff) {
      toast.error("Please select pickup and dropoff.");
      return;
    }
    if (!pickupAtDate || !pickupAtTime) {
      toast.error("Please choose date and time.");
      return;
    }
    if (!vehicleId) {
      toast.error("Please choose a vehicle category.");
      return;
    }

    if (!isAuthed) {
      const n = guestName.trim();
      const e = guestEmail.trim().toLowerCase();
      const p = guestPhone.trim();

      if (!n) return toast.error("Please enter your name.");
      if (!e || !isValidEmail(e))
        return toast.error("Please enter a valid email address.");
      if (!p) return toast.error("Please enter your phone number.");
    }

    const pickupAtIso = new Date(
      `${pickupAtDate}T${pickupAtTime}:00`
    ).toISOString();

    setSubmitting(true);

    try {
      const pickup = route.pickup;
      const dropoff = route.dropoff;

      const res = await createBookingRequest({
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
          selectedService.pricingStrategy === "HOURLY" ? hoursRequested : null,
        specialRequests: specialRequests || null,
        guestName: isAuthed ? null : guestName.trim(),
        guestEmail: isAuthed ? null : guestEmail.trim().toLowerCase(),
        guestPhone: isAuthed ? null : guestPhone.trim(),
      });

      const data = res as any;

      if (data?.error) {
        toast.error(data.error);
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
      toast.success("Request submitted.");

      const bookingId = data?.bookingId ?? null;
      const claimToken = data?.claimToken ?? null;

      const href = bookingId
        ? claimToken
          ? `/book/success?id=${encodeURIComponent(
              String(bookingId)
            )}&t=${encodeURIComponent(String(claimToken))}`
          : `/book/success?id=${encodeURIComponent(String(bookingId))}`
        : "/book/success";

      router.replace(href);
    } catch (e: any) {
      toast.error(e?.message ?? "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            <Stepper step={step} />
            <div className={styles.routePickerContainer}>
              <RoutePicker
                value={route}
                onChange={setRoute}
                pickupInputRef={pickupInputRef}
                dropoffInputRef={dropoffInputRef}
                inputsKey={step}
              />
            </div>
          </div>

          <div className={styles.right}>
            <div className={styles.wizard}>
              {step === 1 ? (
                <div className={styles.contentBox}>
                  <h2 className='underline'>Trip details</h2>
                  <p className='subheading'>
                    Please provide the details for your trip below
                  </p>

                  <div style={{ display: "grid", gap: 8 }}>
                    <label className='cardTitle h5'>Service</label>
                    <select
                      value={serviceTypeId}
                      onChange={(e) => {
                        const next = e.target.value;

                        // ✅ reset airport picks here (no effect)
                        setPickupAirportId("");
                        setDropoffAirportId("");

                        // ✅ reset route to avoid stale endpoints
                        setRoute(null);

                        setServiceTypeId(next);

                        const svc = services.find((s) => s.id === next);
                        if (svc?.pricingStrategy === "HOURLY") {
                          setHoursRequested((prev) =>
                            Math.max(
                              prev || 2,
                              selectedVehicle?.minHours ?? 0,
                              2
                            )
                          );
                        }
                      }}
                      className='input emptySmall'
                    >
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Option 4 fallback notice */}
                  {selectedService?.airportLeg !== "NONE" &&
                  serviceAirports.length === 0 ? (
                    <div
                      className='miniNote'
                      style={{ color: "rgba(180,0,0,0.8)" }}
                    >
                      This airport service isn’t configured yet (no airports
                      assigned). Please choose another service or contact
                      support.
                    </div>
                  ) : null}

                  <BookingDateTimePicker
                    date={pickupAtDate}
                    time={pickupAtTime}
                    onChangeDate={setPickupAtDate}
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
                    {/* PICKUP */}
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

                      {/* keep ref mounted for RoutePicker even when dropdown is used */}
                      {usesPickupAirport ? (
                        <input
                          ref={pickupInputRef}
                          style={{
                            position: "absolute",
                            width: 1,
                            height: 1,
                            opacity: 0,
                            pointerEvents: "none",
                          }}
                          tabIndex={-1}
                          aria-hidden='true'
                        />
                      ) : null}
                    </div>

                    {/* DROPOFF */}
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

                      {usesDropoffAirport ? (
                        <input
                          ref={dropoffInputRef}
                          style={{
                            position: "absolute",
                            width: 1,
                            height: 1,
                            opacity: 0,
                            pointerEvents: "none",
                          }}
                          tabIndex={-1}
                          aria-hidden='true'
                        />
                      ) : null}
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
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        Vehicle minimum applies after you choose a vehicle
                        category.
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <div className={styles.btnContainer}>
                      <button
                        type='button'
                        onClick={() => {
                          if (!canGoStep2()) {
                            toast.error(
                              selectedService?.airportLeg !== "NONE" &&
                                serviceAirports.length === 0
                                ? "This airport service isn’t configured yet."
                                : "Please complete service, date/time, and route."
                            );
                            return;
                          }
                          setStep(2);
                        }}
                        className='primaryBtn'
                        disabled={
                          selectedService?.airportLeg !== "NONE" &&
                          serviceAirports.length === 0
                        }
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* steps 2 + 3 unchanged from your version */}
              {/* ... keep your existing Step 2 and Step 3 code exactly as-is ... */}

              {step === 2 ? (
                <div style={{ display: "grid", gap: 14 }}>
                  <h2 className='underline'>Choose a vehicle</h2>
                  <p className='subheading'>Choose a vehicle category</p>

                  <div style={{ display: "grid", gap: 10 }}>
                    {vehicleOptions.map((v) => {
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
                              Math.ceil(v.minHours || 0)
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
                                Math.max(prev || 1, v.minHours || 0)
                              );
                            }
                          }}
                          style={{
                            textAlign: "left",
                            padding: 14,
                            borderRadius: 7,
                            border: isSelected
                              ? "2px solid rgba(0,0,0,0.6)"
                              : "1px solid rgba(0,0,0,0.25)",
                            background: "white",
                            cursor: "pointer",
                            display: "grid",
                            gap: 6,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                            }}
                          >
                            <div className='emptyTitle'>{v.name}</div>
                            <div className='emptyTitleSmall'>
                              ${centsToUsd(rowEstimateCents)}
                            </div>
                          </div>

                          <div className='val'>
                            Capacity: {v.capacity} • Luggage:{" "}
                            {v.luggageCapacity}
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

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <button
                      type='button'
                      onClick={() => setStep(1)}
                      className='secondaryBtn'
                    >
                      Back
                    </button>

                    <button
                      type='button'
                      onClick={() => {
                        if (!canGoStep3()) {
                          toast.error("Please choose a vehicle category.");
                          return;
                        }
                        setStep(3);
                      }}
                      className='primaryBtn'
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
                    <div className='miniNote'>
                      This is an estimate. Dispatch may adjust for special
                      dates, late night, extra stops, etc.
                    </div>
                  </div>

                  {!isAuthed ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={{ display: "grid", gap: 20 }}>
                        <div className='cardTitle h5'>Full name</div>
                        <input
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          className='input subheading'
                          placeholder='Your name'
                        />
                      </div>

                      <Grid2>
                        <div style={{ display: "grid", gap: 10 }}>
                          <div className='cardTitle h5'>Email</div>
                          <input
                            value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                            className='input subheading'
                            placeholder='you@email.com'
                            inputMode='email'
                          />
                        </div>

                        <div style={{ display: "grid", gap: 6 }}>
                          <div className='cardTitle h5'>Phone</div>
                          <input
                            value={guestPhone}
                            onChange={(e) => setGuestPhone(e.target.value)}
                            className='input subheading'
                            placeholder='(602) 555-1234'
                            inputMode='tel'
                          />
                        </div>
                      </Grid2>

                      <div
                        className='emptyTitleSmall'
                        style={{ color: "rgba(0, 0, 0, 0.7)" }}
                      >
                        We’ll use this email to send updates and your payment
                        link after approval.
                      </div>
                    </div>
                  ) : null}

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

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <button
                      type='button'
                      onClick={() => setStep(2)}
                      className='secondaryBtn'
                      disabled={submitting || submitted}
                    >
                      Back
                    </button>

                    <button
                      type='button'
                      onClick={handleSubmit}
                      className='primaryBtn'
                      disabled={submitting || submitted}
                    >
                      {submitted
                        ? "Submitted"
                        : submitting
                          ? "Submitting..."
                          : "Submit request"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
