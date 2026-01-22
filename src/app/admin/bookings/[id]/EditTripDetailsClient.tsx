"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTripDetails } from "../../../../../actions/admin/bookings"; 
import Button from "@/components/shared/Button/Button";
import styles from "./AdminBookingDetailPage.module.css";

type TripData = {
  pickupAt: string;
  pickupAddress: string;
  dropoffAddress: string;
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const fd = new FormData();
    fd.append("bookingId", bookingId);
    fd.append("pickupAt", formData.pickupAt);
    fd.append("pickupAddress", formData.pickupAddress);
    fd.append("dropoffAddress", formData.dropoffAddress);
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
        {/* <div className={styles.editFormTitle}> */}
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

        <div className={styles.editFormRow}>
          <label className={`${styles.editLabel} emptyTitle`}>
            Pickup Address
            <input
              type='text'
              name='pickupAddress'
              value={formData.pickupAddress}
              onChange={handleChange}
              className='inputBorder'
              required
            />
          </label>
        </div>

        <div className={styles.editFormRow}>
          <label className={`${styles.editLabel} emptyTitle`}>
            Dropoff Address
            <input
              type='text'
              name='dropoffAddress'
              value={formData.dropoffAddress}
              onChange={handleChange}
              className='inputBorder'
              required
            />
          </label>
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
