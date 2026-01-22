"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTripDetails } from "../../../../../actions/admin/bookings";
import Button from "@/components/shared/Button/Button";
import styles from "./AdminBookingDetailPage.module.css";
import RoutePickerAdmin, {
  RouteData,
} from "@/components/admin/Routepickeradmin/Routepickeradmin";

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

export default function EditTripDetailsClient({
  bookingId,
  initialData,
}: {
  bookingId: string;
  initialData: TripData;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<TripData>(initialData);

  // Track route data separately for the RoutePickerAdmin
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

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "passengers" || name === "luggage" ? Number(value) : value,
    }));
  }

  function handleRouteChange(data: RouteData) {
    setRouteData(data);
    // Update formData with new route info
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validate route data
    if (!routeData.pickup.address || !routeData.dropoff.address) {
      setError("Please enter both pickup and dropoff addresses.");
      return;
    }

    const fd = new FormData();
    fd.append("bookingId", bookingId);
    fd.append("pickupAt", formData.pickupAt);
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

    startTransition(async () => {
      const result = await updateTripDetails(fd);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setIsEditing(false);
        router.refresh();
      }
    });
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
    setError(null);
  }

  if (!isEditing) {
    return (
      <div className={styles.editTripToggle}>
        <Button
          text='Edit Trip Details'
          btnType='black'
          onClick={() => setIsEditing(true)}
          arrow
        />
        {success && <span className={styles.successText}>✓ Changes saved</span>}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.editTripForm}>
      <div className={styles.editFormSection}>
        <div className='cardTitle h4'>Edit Trip Details</div>
        <br />

        <div className={styles.editFormRow}>
          <label className={`${styles.editLabel} emptyTitle`}>
            Pickup Date & Time
            <input
              type='datetime-local'
              name='pickupAt'
              value={formData.pickupAt}
              onChange={handleChange}
              className='inputBorder'
              required
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
            />
          </label>
        </div>
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      <div className={styles.editFormActions}>
        <Button
          text={isPending ? "Saving..." : "Save Changes"}
          btnType='green'
          type='submit'
          disabled={isPending}
          checkIcon
        />
        <Button
          text='Cancel'
          btnType='gray'
          onClick={handleCancel}
          disabled={isPending}
          closeIcon
        />
      </div>
    </form>
  );
}
