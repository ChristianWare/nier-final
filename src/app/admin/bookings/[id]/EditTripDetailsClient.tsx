"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  updateTripDetails,
  updateTripDetailsAndPrice,
} from "../../../../../actions/admin/bookings";
import Button from "@/components/shared/Button/Button";
import styles from "./AdminBookingDetailPage.module.css";
import RoutePickerAdmin, {
  RouteData,
} from "@/components/admin/Routepickeradmin/Routepickeradmin";
import toast from "react-hot-toast";
import { useDirtyForm } from "@/components/shared/DirtyFormProvider/DirtyFormProvider";
import { useBookingEdit } from "./BookingEditContext";
import { localToUtcIso } from "@/lib/timezone";
import { toZonedTime, format } from "date-fns-tz";

type PricingStrategy = "POINT_TO_POINT" | "HOURLY" | "FLAT";

export type PricingData = {
  pricingStrategy: PricingStrategy;
  serviceMinFareCents: number;
  serviceBaseFeeCents: number;
  servicePerMileCents: number;
  servicePerMinuteCents: number;
  servicePerHourCents: number;
  vehicleBaseFareCents: number;
  vehiclePerMileCents: number;
  vehiclePerMinuteCents: number;
  vehiclePerHourCents: number;
  vehicleMinHours: number;
  currentTotalCents: number;
  hoursRequested: number | null;
  currency: string;
};

type TripData = {
  pickupAt: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupPlaceId: string | null;
  dropoffPlaceId: string | null;
  pickupLat: number | null;
  pickupLng: number | null;
  dropoffLat: number | null;
  dropoffLng: number | null;
  distanceMiles: number | null;
  durationMinutes: number | null;
  passengers: number;
  luggage: number;
  specialRequests: string | null;
  flightAirline: string | null;
  flightNumber: string | null;
  flightScheduledAt: string | null;
  flightTerminal: string | null;
  flightGate: string | null;
};

function formatMoney(cents: number, currency = "USD") {
  const n = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

function calculateQuote(
  pricing: PricingData,
  distanceMiles: number | null,
  durationMinutes: number | null,
): number {
  const {
    pricingStrategy,
    serviceMinFareCents,
    serviceBaseFeeCents,
    servicePerMileCents,
    servicePerMinuteCents,
    servicePerHourCents,
    vehicleBaseFareCents,
    vehiclePerMileCents,
    vehiclePerMinuteCents,
    vehiclePerHourCents,
    vehicleMinHours,
    hoursRequested,
  } = pricing;

  const minFareCents = serviceMinFareCents;
  const baseFeeCents = serviceBaseFeeCents + vehicleBaseFareCents;
  const perMileCents = servicePerMileCents + vehiclePerMileCents;
  const perMinuteCents = servicePerMinuteCents + vehiclePerMinuteCents;
  const perHourCents = servicePerHourCents + vehiclePerHourCents;

  let baseCharge = 0;
  let distanceCharge = 0;
  let timeCharge = 0;

  switch (pricingStrategy) {
    case "POINT_TO_POINT": {
      baseCharge = baseFeeCents;
      if (distanceMiles != null && distanceMiles > 0) {
        distanceCharge = Math.round(distanceMiles * perMileCents);
      }
      if (durationMinutes != null && durationMinutes > 0) {
        timeCharge = Math.round(durationMinutes * perMinuteCents);
      }
      break;
    }
    case "HOURLY": {
      baseCharge = baseFeeCents;
      const requested = hoursRequested ?? 0;
      const minHours = vehicleMinHours ?? 0;
      const billable = Math.max(Math.ceil(requested), Math.ceil(minHours));
      if (billable > 0) {
        timeCharge = Math.round(billable * perHourCents);
      }
      break;
    }
    case "FLAT": {
      baseCharge = baseFeeCents;
      break;
    }
  }

  let subtotalCents = baseCharge + distanceCharge + timeCharge;
  if (subtotalCents < minFareCents) {
    subtotalCents = minFareCents;
  }
  return subtotalCents;
}

function toLocalInputValue(isoString: string, tz: string): string {
  const zoned = toZonedTime(new Date(isoString), tz);
  return format(zoned, "yyyy-MM-dd'T'HH:mm", { timeZone: tz });
}

export default function EditTripDetailsClient({
  bookingId,
  initialData,
  pricingData,
  companyTimezone,
}: {
  bookingId: string;
  initialData: TripData;
  pricingData?: PricingData;
  companyTimezone: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  /* ── Context sync ── */
  const { setLivePickupAt, setIsEditing: setContextEditing } = useBookingEdit();

  /* ── Lock / Unlock state ── */
  const [isEditing, setIsEditing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<TripData>({
    ...initialData,
    pickupAt: toLocalInputValue(initialData.pickupAt, companyTimezone),
  });
  const [routeData, setRouteData] = useState<RouteData>({
    pickup: {
      address: initialData.pickupAddress,
      placeId: initialData.pickupPlaceId,
      location:
        initialData.pickupLat && initialData.pickupLng
          ? { lat: initialData.pickupLat, lng: initialData.pickupLng }
          : null,
    },
    dropoff: {
      address: initialData.dropoffAddress,
      placeId: initialData.dropoffPlaceId,
      location:
        initialData.dropoffLat && initialData.dropoffLng
          ? { lat: initialData.dropoffLat, lng: initialData.dropoffLng }
          : null,
    },
    distanceMiles: initialData.distanceMiles,
    durationMinutes: initialData.durationMinutes,
  });

  const suggestedPriceCents = useMemo(() => {
    if (!pricingData) return null;
    return calculateQuote(
      pricingData,
      routeData.distanceMiles,
      routeData.durationMinutes,
    );
  }, [pricingData, routeData.distanceMiles, routeData.durationMinutes]);

  const routeChanged = useMemo(() => {
    const milesDiff = Math.abs(
      (routeData.distanceMiles ?? 0) - (initialData.distanceMiles ?? 0),
    );
    const minsDiff = Math.abs(
      (routeData.durationMinutes ?? 0) - (initialData.durationMinutes ?? 0),
    );
    return milesDiff > 0.1 || minsDiff > 1;
  }, [
    initialData.distanceMiles,
    initialData.durationMinutes,
    routeData.distanceMiles,
    routeData.durationMinutes,
  ]);

  const priceChanged = useMemo(() => {
    if (!pricingData || suggestedPriceCents === null) return false;
    return suggestedPriceCents !== pricingData.currentTotalCents;
  }, [pricingData, suggestedPriceCents]);

  const isDirty = useMemo(() => {
    if (!isEditing) return false;
    return (
      formData.pickupAt !== initialData.pickupAt ||
      formData.pickupAddress !== initialData.pickupAddress ||
      formData.dropoffAddress !== initialData.dropoffAddress ||
      formData.passengers !== initialData.passengers ||
      formData.luggage !== initialData.luggage ||
      (formData.specialRequests ?? "") !==
        (initialData.specialRequests ?? "") ||
      (formData.flightAirline ?? "") !== (initialData.flightAirline ?? "") ||
      (formData.flightNumber ?? "") !== (initialData.flightNumber ?? "") ||
      (formData.flightScheduledAt ?? "") !==
        (initialData.flightScheduledAt ?? "") ||
      (formData.flightTerminal ?? "") !== (initialData.flightTerminal ?? "") ||
      (formData.flightGate ?? "") !== (initialData.flightGate ?? "") ||
      routeChanged
    );
  }, [formData, initialData, isEditing, routeChanged]);

  useDirtyForm("trip-details", isDirty, "trip-section");

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "passengers" || name === "luggage" ? Number(value) : value,
    }));

    // Keep boxRight date in sync while editing
    if (name === "pickupAt") {
      setLivePickupAt(value);
    }
  }

  function handleRouteChange(data: RouteData) {
    setRouteData(data);
    setFormData((prev) => ({
      ...prev,
      pickupAddress: data.pickup.address,
      pickupPlaceId: data.pickup.placeId,
      pickupLat: data.pickup.location?.lat ?? null,
      pickupLng: data.pickup.location?.lng ?? null,
      dropoffAddress: data.dropoff.address,
      dropoffPlaceId: data.dropoff.placeId,
      dropoffLat: data.dropoff.location?.lat ?? null,
      dropoffLng: data.dropoff.location?.lng ?? null,
      distanceMiles: data.distanceMiles,
      durationMinutes: data.durationMinutes,
    }));
  }

  function handleCancel() {
    setFormData(initialData);
    setRouteData({
      pickup: {
        address: initialData.pickupAddress,
        placeId: initialData.pickupPlaceId,
        location:
          initialData.pickupLat && initialData.pickupLng
            ? { lat: initialData.pickupLat, lng: initialData.pickupLng }
            : null,
      },
      dropoff: {
        address: initialData.dropoffAddress,
        placeId: initialData.dropoffPlaceId,
        location:
          initialData.dropoffLat && initialData.dropoffLng
            ? { lat: initialData.dropoffLat, lng: initialData.dropoffLng }
            : null,
      },
      distanceMiles: initialData.distanceMiles,
      durationMinutes: initialData.durationMinutes,
    });
    setIsEditing(false);
    setContextEditing(false);
    setLivePickupAt(null);
    setError(null);
  }

  function handleSave(applyNewPrice: boolean = false) {
    setError(null);

    if (!routeData.pickup.address || !routeData.dropoff.address) {
      setError("Please enter both pickup and dropoff addresses.");
      return;
    }

    const fd = new FormData();
    fd.append("bookingId", bookingId);
    // formData.pickupAt is "YYYY-MM-DDTHH:mm" (local company time from the input)
    const [datePart, timePart] = formData.pickupAt.split("T");
    const pickupAtUtc = localToUtcIso(
      datePart,
      timePart.slice(0, 5),
      companyTimezone,
    );
    fd.append("pickupAt", pickupAtUtc);
    fd.append("pickupAddress", routeData.pickup.address);
    fd.append("dropoffAddress", routeData.dropoff.address);
    fd.append("pickupPlaceId", routeData.pickup.placeId || "");
    fd.append("dropoffPlaceId", routeData.dropoff.placeId || "");
    fd.append("pickupLat", routeData.pickup.location?.lat?.toString() || "");
    fd.append("pickupLng", routeData.pickup.location?.lng?.toString() || "");
    fd.append("dropoffLat", routeData.dropoff.location?.lat?.toString() || "");
    fd.append("dropoffLng", routeData.dropoff.location?.lng?.toString() || "");
    fd.append("distanceMiles", routeData.distanceMiles?.toString() || "");
    fd.append("durationMinutes", routeData.durationMinutes?.toString() || "");
    fd.append("passengers", String(formData.passengers));
    fd.append("luggage", String(formData.luggage));
    fd.append("specialRequests", formData.specialRequests || "");
    fd.append("flightAirline", formData.flightAirline || "");
    fd.append("flightNumber", formData.flightNumber || "");
    fd.append("flightScheduledAt", formData.flightScheduledAt || "");
    fd.append("flightTerminal", formData.flightTerminal || "");
    fd.append("flightGate", formData.flightGate || "");

    if (applyNewPrice && suggestedPriceCents !== null) {
      fd.append("newTotalCents", suggestedPriceCents.toString());
    }

    startTransition(async () => {
      const result = applyNewPrice
        ? await updateTripDetailsAndPrice(fd)
        : await updateTripDetails(fd);

      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        setJustSaved(true);
        toast.success(
          applyNewPrice
            ? "Trip details and price updated successfully."
            : "Trip details updated successfully.",
        );
        setTimeout(() => {
          setJustSaved(false);
          setIsEditing(false);
          setContextEditing(false);
          setLivePickupAt(null);
        }, 2000);
        router.refresh();
      }
    });
  }

  const currency = pricingData?.currency ?? "USD";

  /* ── Wrapper class ── */
  const wrapperClass = justSaved
    ? styles.sectionSaved
    : isEditing
      ? styles.sectionEditing
      : "";

  /* ── Section action buttons ── */
  const renderActions = () => {
    if (justSaved) {
      return (
        <div className={styles.sectionActionsRow}>
          <Button text='Saved ✓' btnType='greenReg' type='button' disabled />
        </div>
      );
    }

    if (isEditing) {
      return (
        <div className={styles.sectionActionsRow}>
          <Button
            text={isPending ? "Saving..." : "Save Changes"}
            btnType='blackReg'
            type='button'
            disabled={isPending}
            onClick={() => handleSave(false)}
          />
          {!isPending && (
            <Button
              text='Cancel'
              btnType='redReg'
              type='button'
              onClick={handleCancel}
            />
          )}
        </div>
      );
    }

    return (
      <div className={styles.sectionActionsRow}>
        <Button
          text='Edit Trip Details'
          btnType='blackReg'
          type='button'
          onClick={() => {
            setIsEditing(true);
            setContextEditing(true);
            setLivePickupAt(formData.pickupAt);
          }}
        />
      </div>
    );
  };

  return (
    <div className={wrapperClass} style={{ width: "100%" }}>
      {/* Form fields only visible when editing */}
      {isEditing && (
        <div className={styles.editTripForm}>
          <div className={styles.editFormSection}>
            <div className={styles.editFormRow}>
              <label className={`${styles.editLabel} emptyTitle`}>
                Pickup Date &amp; Time
                <input
                  type='datetime-local'
                  name='pickupAt'
                  value={formData.pickupAt}
                  onChange={handleChange}
                  className='inputBorder'
                  required
                  disabled={isPending}
                />
              </label>
            </div>

            {/* Route Picker with Map */}
            <div className={styles.editFormRow}>
              <RoutePickerAdmin
                pickupAddress={routeData.pickup.address}
                dropoffAddress={routeData.dropoff.address}
                pickupLat={routeData.pickup.location?.lat}
                pickupLng={routeData.pickup.location?.lng}
                dropoffLat={routeData.dropoff.location?.lat}
                dropoffLng={routeData.dropoff.location?.lng}
                pickupPlaceId={routeData.pickup.placeId}
                dropoffPlaceId={routeData.dropoff.placeId}
                distanceMiles={routeData.distanceMiles}
                durationMinutes={routeData.durationMinutes}
                onChange={handleRouteChange}
                disabled={isPending}
              />
            </div>

            {/* Pricing Comparison Section */}
            {pricingData && (
              <div className={styles.pricingComparison}>
                <div className='cardTitle h5' style={{ marginBottom: 12 }}>
                  Pricing
                </div>

                <div className={styles.pricingGrid}>
                  <div className={styles.pricingItem}>
                    <span className={styles.pricingLabel}>Current Price</span>
                    <span className={styles.pricingValue}>
                      {formatMoney(pricingData.currentTotalCents, currency)}
                    </span>
                    <span className={styles.pricingDetail}>
                      {initialData.distanceMiles?.toFixed(1) ?? "—"} mi •{" "}
                      {initialData.durationMinutes ?? "—"} min
                    </span>
                  </div>

                  {routeChanged && suggestedPriceCents !== null && (
                    <div
                      className={`${styles.pricingItem} ${
                        priceChanged ? styles.pricingItemHighlight : ""
                      }`}
                    >
                      <span className={styles.pricingLabel}>
                        Suggested Price
                      </span>
                      <span
                        className={`${styles.pricingValue} ${
                          priceChanged
                            ? suggestedPriceCents >
                              pricingData.currentTotalCents
                              ? styles.priceIncrease
                              : styles.priceDecrease
                            : ""
                        }`}
                      >
                        {formatMoney(suggestedPriceCents, currency)}
                      </span>
                      <span className={styles.pricingDetail}>
                        {routeData.distanceMiles?.toFixed(1) ?? "—"} mi •{" "}
                        {routeData.durationMinutes ?? "—"} min
                      </span>
                      {priceChanged && (
                        <span className={styles.priceDiff}>
                          {suggestedPriceCents > pricingData.currentTotalCents
                            ? "+"
                            : ""}
                          {formatMoney(
                            suggestedPriceCents - pricingData.currentTotalCents,
                            currency,
                          )}
                          {suggestedPriceCents <
                            pricingData.currentTotalCents && (
                            <span className={styles.refundNote}>
                              {" "}
                              (refund may be due)
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {routeChanged && priceChanged && (
                  <div className={styles.pricingActions}>
                    <p className={styles.pricingNote}>
                      {suggestedPriceCents! > pricingData.currentTotalCents
                        ? "The route has increased. Would you like to update the price?"
                        : "The route has decreased. Would you like to update the price? A refund may be due to the customer."}
                    </p>
                    <div className={styles.pricingButtons}>
                      <Button
                        text={`Apply Suggested Price (${formatMoney(suggestedPriceCents!, currency)})`}
                        btnType='greenReg'
                        type='button'
                        onClick={() => handleSave(true)}
                        disabled={isPending}
                      />
                      <span className={styles.pricingOr}>or</span>
                      <span className={styles.pricingHint}>
                        Save changes and adjust price manually in &quot;Approve
                        &amp; price&quot; below
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className={styles.editFormRowDouble}>
              <label className={`${styles.editLabel} emptyTitle`}>
                Passengers
                <input
                  type='number'
                  name='passengers'
                  value={formData.passengers}
                  onChange={handleChange}
                  className='inputBorder'
                  min={1}
                  max={100}
                  required
                  disabled={isPending}
                />
              </label>
              <label className={`${styles.editLabel} emptyTitle`}>
                Luggage
                <input
                  type='number'
                  name='luggage'
                  value={formData.luggage}
                  onChange={handleChange}
                  className='inputBorder'
                  min={0}
                  max={100}
                  disabled={isPending}
                />
              </label>
            </div>

            <div className={styles.editFormRow}>
              <label className={`${styles.editLabel} emptyTitle`}>
                Special Requests
                <textarea
                  name='specialRequests'
                  value={formData.specialRequests || ""}
                  onChange={handleChange}
                  className='inputBorder'
                  rows={2}
                  disabled={isPending}
                />
              </label>
            </div>
          </div>

          <div className={styles.editFormSection}>
            <div className={styles.editFormTitle}>
              Flight Information (Optional)
            </div>

            <div className={styles.editFormRowDouble}>
              <label className={`${styles.editLabel} emptyTitle`}>
                Airline
                <input
                  type='text'
                  name='flightAirline'
                  value={formData.flightAirline || ""}
                  onChange={handleChange}
                  className='inputBorder'
                  placeholder='e.g., American Airlines'
                  disabled={isPending}
                />
              </label>
              <label className={`${styles.editLabel} emptyTitle`}>
                Flight Number
                <input
                  type='text'
                  name='flightNumber'
                  value={formData.flightNumber || ""}
                  onChange={handleChange}
                  className='inputBorder'
                  placeholder='e.g., AA1234'
                  disabled={isPending}
                />
              </label>
            </div>

            <div className={styles.editFormRow}>
              <label className={`${styles.editLabel} emptyTitle`}>
                Scheduled Arrival/Departure
                <input
                  type='datetime-local'
                  name='flightScheduledAt'
                  value={formData.flightScheduledAt || ""}
                  onChange={handleChange}
                  className='inputBorder'
                  disabled={isPending}
                />
              </label>
            </div>

            <div className={styles.editFormRowDouble}>
              <label className={`${styles.editLabel} emptyTitle`}>
                Terminal
                <input
                  type='text'
                  name='flightTerminal'
                  value={formData.flightTerminal || ""}
                  onChange={handleChange}
                  className='inputBorder'
                  placeholder='e.g., Terminal 4'
                  disabled={isPending}
                />
              </label>
              <label className={`${styles.editLabel} emptyTitle`}>
                Gate
                <input
                  type='text'
                  name='flightGate'
                  value={formData.flightGate || ""}
                  onChange={handleChange}
                  className='inputBorder'
                  placeholder='e.g., B12'
                  disabled={isPending}
                />
              </label>
            </div>
          </div>

          {error && <p className={styles.errorText}>{error}</p>}
        </div>
      )}

      {renderActions()}
    </div>
  );
}
