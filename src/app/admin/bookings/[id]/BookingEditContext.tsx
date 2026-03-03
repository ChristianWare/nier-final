// src/app/admin/bookings/[id]/BookingEditContext.tsx
"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type BookingEditState = {
  /** The live pickupAt value while editing (datetime-local string), null when not editing */
  livePickupAt: string | null;
  setLivePickupAt: (v: string | null) => void;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
};

const BookingEditContext = createContext<BookingEditState>({
  livePickupAt: null,
  setLivePickupAt: () => {},
  isEditing: false,
  setIsEditing: () => {},
});

export function BookingEditProvider({ children }: { children: ReactNode }) {
  const [livePickupAt, setLivePickupAt] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <BookingEditContext.Provider
      value={{ livePickupAt, setLivePickupAt, isEditing, setIsEditing }}
    >
      {children}
    </BookingEditContext.Provider>
  );
}

export function useBookingEdit() {
  return useContext(BookingEditContext);
}
