/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import styles from "./BookingWizard.module.css";
import React, { useMemo, useRef, useState } from "react";
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

type PricingStrategy = "POINT_TO_POINT" | "HOURLY" | "FLAT";

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

export default function BookingWizard({
  serviceTypes,
  vehicles,
}: {
  serviceTypes: ServiceTypeDTO[];
  vehicles: VehicleDTO[];
}) {
  const router = useRouter();
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

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceTypeId) ?? null,
    [services, serviceTypeId]
  );

  const selectedVehicle = useMemo(
    () => vehicleOptions.find((v) => v.id === vehicleId) ?? null,
    [vehicleOptions, vehicleId]
  );

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
      });

      const data = res as any;

      if (data?.error) {
        toast.error(data.error);
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
      toast.success("Request submitted.");

      const bookingId =
        data?.bookingId ?? data?.id ?? data?.booking?.id ?? null;

      const href = bookingId
        ? `/book/success?id=${encodeURIComponent(String(bookingId))}`
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
                    <div style={{ display: "grid", gap: 8 }}>
                      <label className='cardTitle h5'>Pickup</label>
                      <input
                        ref={pickupInputRef}
                        placeholder='Enter pickup address'
                        autoComplete='off'
                        className='input emptySmall'
                      />
                    </div>

                    <div style={{ display: "grid", gap: 8 }}>
                      <label className='cardTitle h5'>Dropoff</label>
                      <input
                        ref={dropoffInputRef}
                        placeholder='Enter dropoff address'
                        autoComplete='off'
                        className='input emptySmall'
                      />
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
                              "Please complete service, date/time, and route."
                            );
                            return;
                          }
                          setStep(2);
                        }}
                        className='primaryBtn'
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

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
                <div style={{ display: "grid", gap: 14 }}>
                  <h2 className='underline'>Confirm</h2>
                  <p className='subheading'>Overview</p>

                  <div style={summaryCardStyle}>
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

                  <div style={{ display: "grid", gap: 8 }}>
                    <label className='label'>Special requests (optional)</label>
                    <textarea
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      className='input emptySmall'
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

const summaryCardStyle: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.12)",
  borderRadius: 14,
  padding: 14,
  display: "grid",
  gap: 8,
  background: "white",
};
