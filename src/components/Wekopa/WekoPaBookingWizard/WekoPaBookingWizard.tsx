/* eslint-disable react-hooks/incompatible-library */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import styles from "./WekoPaBookingWizard.module.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { createBookingRequest } from "../../../../actions/bookings/createBookingRequest";
import {
  createTripGroupBooking,
  type CreateTripGroupInput,
} from "../../../../actions/bookings/createTripGroupBooking";
import { localToUtcIso, isPickupTooSoon } from "@/lib/timezone";
import { useDirtyForm } from "@/components/shared/DirtyFormProvider/DirtyFormProvider";
import BookingDateTimeWithBlackouts from "@/components/BookingPage/BookingDateTimeWithBlackouts/BookingDateTimeWithBlackouts";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import Modal from "@/components/shared/Modal/Modal";
import BookingWizardChecklist, {
  type ChecklistItem,
} from "@/components/BookingPage/BookingWizardChecklist/BookingWizardChecklist";
import Stepper from "@/components/BookingPage/Stepper/Stepper";
import FlightLookupInput from "@/components/BookingPage/FlightLookupInput/FlightLookupInput";
import Button from "@/components/shared/Button/Button";

// ─── Fixed Locations ──────────────────────────────────────────────────────────
const SKY_HARBOR = {
  address:
    "Phoenix Sky Harbor International Airport, 3400 E Sky Harbor Blvd, Phoenix, AZ 85034",
  placeId: "ChIJZdhEDEkIK4cRNzclNAHbFOg" as string | null,
  lat: 33.4373,
  lng: -112.0078,
};

const WEKOPA = {
  address:
    "We-Ko-Pa Golf Club, 18200 E Toh Vee Circle, Fort McDowell, AZ 85264",
  placeId: null as string | null,
  lat: 33.6219,
  lng: -111.7187,
};

const ROUTE_DISTANCE_MILES = 38;
const ROUTE_DURATION_MINUTES = 50;
const MAX_PASSENGERS_ONLINE = 14;
// ─── Types ────────────────────────────────────────────────────────────────────
type Direction = "to_wekopa" | "from_wekopa";

export type WekoPaVehicleDTO = {
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
  callForPricing: boolean;
  callForPricingMessage: string | null;
};

export type WekoPaServiceTypeDTO = {
  id: string;
  name: string;
  slug: string;
  pricingStrategy: string;
  minFareCents: number;
  baseFeeCents: number;
  perMileCents: number;
  perMinuteCents: number;
  perHourCents: number;
  minHours: number;
  active: boolean;
  sortOrder: number;
  airportLeg: string;
  airports: any[];
  fees: { id: string; label: string; amountCents: number }[];
};

type FormValues = {
  pickupAtDate: string;
  pickupAtTime: string;
  passengers: number;
  luggage: number;
  flightNumber: string;
  flightAirline: string;
  flightScheduledAtDate: string;
  flightScheduledAtTime: string;
  flightTerminal: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  contactPhone: string;
  specialRequests: string;
};

/** A completed leg stored before group submission */
type SavedLeg = {
  id: string;
  direction: Direction;
  pickupAt: string;
  pickupAtDate: string;
  pickupAtTime: string;
  passengers: number;
  luggage: number;
  vehicleConfigLabel: string;
  vehicleId: string;
  estimateCents: number;
  specialRequests: string | null;
  flightAirline: string | null;
  flightNumber: string | null;
  flightScheduledAt: string | null;
  flightTerminal: string | null;
};

// ─── Vehicle config calculator ────────────────────────────────────────────────
type VehicleConfig = {
  suvs: number;
  vans: number;
  totalCents: number;
  totalCapacity: number;
  primaryVehicleId: string;
  label: string;
  savings?: string;
  isMultiVehicle: boolean;
};

function calcVehicleConfig(
  passengers: number,
  suvVehicle: WekoPaVehicleDTO,
  vanVehicle: WekoPaVehicleDTO,
  suvPriceCents: number,
  vanPriceCents: number,
): VehicleConfig | null {
  if (passengers <= 0) return null;

  const suvCap = suvVehicle.capacity;
  const vanCap = vanVehicle.capacity;
  let bestCost = Infinity;
  let bestSuvs = 0;
  let bestVans = 0;

  const maxVans = Math.ceil(passengers / vanCap);
  for (let v = 0; v <= maxVans; v++) {
    const remaining = Math.max(0, passengers - v * vanCap);
    const s = Math.ceil(remaining / suvCap);
    const capacity = v * vanCap + s * suvCap;
    const cost = v * vanPriceCents + s * suvPriceCents;
    if (capacity >= passengers && cost < bestCost) {
      bestCost = cost;
      bestSuvs = s;
      bestVans = v;
    }
  }

  const parts: string[] = [];
  if (bestVans > 0)
    parts.push(`${bestVans} × ${vanVehicle.name}${bestVans > 1 ? "s" : ""}`);
  if (bestSuvs > 0)
    parts.push(`${bestSuvs} × ${suvVehicle.name}${bestSuvs > 1 ? "s" : ""}`);

  let savings: string | undefined;
  if (bestVans > 0 && passengers > suvCap) {
    const suvOnlyCost = Math.ceil(passengers / suvCap) * suvPriceCents;
    if (suvOnlyCost > bestCost) {
      const altCount = Math.ceil(passengers / suvCap);
      savings = `Saves $${((suvOnlyCost - bestCost) / 100).toFixed(0)} vs ${altCount} SUV${altCount !== 1 ? "s" : ""}`;
    }
  }

  return {
    suvs: bestSuvs,
    vans: bestVans,
    totalCents: bestCost,
    totalCapacity: bestVans * vanCap + bestSuvs * suvCap,
    primaryVehicleId: bestVans > 0 ? vanVehicle.id : suvVehicle.id,
    label: parts.join(" + "),
    savings,
    isMultiVehicle: bestSuvs + bestVans > 1,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isValidPhone(raw: string | null | undefined): boolean | string {
  if (!raw) return "Please enter a phone number.";
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 10) return "Phone number must be 10 digits.";
  if (digits.slice(3, 6) === "555") return "Please enter a real phone number.";
  if (/^(\d)\1{9}$/.test(digits)) return "Please enter a real phone number.";
  if (digits === "1234567890") return "Please enter a real phone number.";
  return true;
}

function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10)
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return raw;
}

function directionLabel(d: Direction) {
  return d === "to_wekopa" ? "Sky Harbor → We-Ko-Pa" : "We-Ko-Pa → Sky Harbor";
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function WekoPaBookingWizard({
  serviceType,
  suvVehicle,
  vanVehicle,
  userPhone,
  companyTimezone,
  companyTimezoneLabel,
}: {
  serviceType: WekoPaServiceTypeDTO;
  suvVehicle: WekoPaVehicleDTO;
  vanVehicle: WekoPaVehicleDTO;
  userPhone?: string | null;
  companyTimezone: string;
  companyTimezoneLabel: string;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const isAuthed = Boolean(session?.user);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [direction, setDirection] = useState<Direction | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [savedLegs, setSavedLegs] = useState<SavedLeg[]>([]);
  const [removeLegId, setRemoveLegId] = useState<string | null>(null);

  const wizardTopRef = useRef<HTMLDivElement | null>(null);
  // const didMountRef = useRef(false);
  const phoneWasPrefilled = useRef(Boolean(userPhone?.trim()));

  const suvPriceCents = suvVehicle.baseFareCents;
  const vanPriceCents = vanVehicle.baseFareCents;

  const {
    register,
    watch,
    setValue,
    trigger,
    clearErrors,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    mode: "onTouched",
    defaultValues: {
      pickupAtDate: "",
      pickupAtTime: "",
      passengers: 0,
      luggage: 0,
      flightNumber: "",
      flightAirline: "",
      flightScheduledAtDate: "",
      flightScheduledAtTime: "",
      flightTerminal: "",
      guestName: "",
      guestEmail: "",
      guestPhone: "",
      contactPhone: userPhone ?? "",
      specialRequests: "",
    },
  });

  const pickupAtDate = watch("pickupAtDate");
  const pickupAtTime = watch("pickupAtTime");
  const passengers = watch("passengers");
  const luggage = watch("luggage");
  const guestName = watch("guestName");
  const guestEmail = watch("guestEmail");
  const guestPhone = watch("guestPhone");
  const contactPhone = watch("contactPhone");
  const flightNumber = watch("flightNumber");
  const flightAirline = watch("flightAirline");
  const flightScheduledAtDate = watch("flightScheduledAtDate");
  const flightScheduledAtTime = watch("flightScheduledAtTime");
  const flightTerminal = watch("flightTerminal");

  // ─── Mobile detection ─────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 1068);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ─── Dirty form guard ─────────────────────────────────────────────────────
  const wizardHasInput = Boolean(
    direction ||
    pickupAtDate ||
    pickupAtTime ||
    passengers > 0 ||
    savedLegs.length > 0,
  );
  useDirtyForm("wekopa-booking-wizard", wizardHasInput && !submitted);

  // ─── Too-soon check ───────────────────────────────────────────────────────
  const pickupTooSoon = useMemo(() => {
    if (!pickupAtDate || !pickupAtTime) return false;
    return isPickupTooSoon(
      pickupAtDate,
      pickupAtTime,
      companyTimezone,
      36 * 60,
    );
  }, [pickupAtDate, pickupAtTime, companyTimezone]);

  // ─── Vehicle config ───────────────────────────────────────────────────────
  const vehicleConfig = useMemo(
    () =>
      passengers > 0
        ? calcVehicleConfig(
            passengers,
            suvVehicle,
            vanVehicle,
            suvPriceCents,
            vanPriceCents,
          )
        : null,
    [passengers, suvVehicle, vanVehicle, suvPriceCents, vanPriceCents],
  );

  const isAirportPickup = direction === "to_wekopa";
  const pickupLocation = isAirportPickup ? SKY_HARBOR : WEKOPA;
  const dropoffLocation = isAirportPickup ? WEKOPA : SKY_HARBOR;
  const hasFlightInfo =
    flightAirline || flightNumber || flightScheduledAtDate || flightTerminal;

  // ─── Multi-leg helpers ────────────────────────────────────────────────────
  const isMultiLeg = savedLegs.length > 0;
  const savedLegsTotal = savedLegs.reduce((sum, l) => sum + l.estimateCents, 0);
  const groupEstimateTotal = savedLegsTotal + (vehicleConfig?.totalCents ?? 0);

  // ─── Register fields ──────────────────────────────────────────────────────
  useEffect(() => {
    register("pickupAtDate", { required: "Please choose a pickup date." });
    register("pickupAtTime", { required: "Please choose a pickup time." });
    register("passengers", {
      valueAsNumber: true,
      required: "Please select the number of passengers.",
      min: { value: 1, message: "At least 1 passenger is required." },
    });
    register("luggage", {
      valueAsNumber: true,
      min: { value: 0, message: "Luggage cannot be negative." },
    });
    register("guestName", {
      validate: (v) =>
        isAuthed ? true : v.trim() ? true : "Please enter your name.",
    });
    register("guestEmail", {
      validate: (v) => {
        if (isAuthed) return true;
        const e = v.trim().toLowerCase();
        if (!e) return "Please enter your email address.";
        if (!isValidEmail(e)) return "Please enter a valid email address.";
        return true;
      },
    });
    register("guestPhone", {
      validate: (v) => (isAuthed ? true : isValidPhone(v)),
    });
    register("contactPhone", {
      validate: (v) => (isAuthed ? isValidPhone(v) : true),
    });
  }, [register, isAuthed]);

  // ─── Scroll to top on step change ─────────────────────────────────────────
  const prevStepRef = useRef<1 | 2 | 3 | null>(null);

  useEffect(() => {
    if (prevStepRef.current === null) {
      // First mount — just record the initial step, never scroll
      prevStepRef.current = step;
      return;
    }
    if (prevStepRef.current !== step) {
      wizardTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      prevStepRef.current = step;
    }
  }, [step]);

  // ─── Navigation ───────────────────────────────────────────────────────────
  async function goStep2() {
    if (!direction) {
      toast.error("Please select a direction.");
      return;
    }
    if (pickupTooSoon) {
      toast.error("Bookings must be made at least 36 hours in advance.");
      return;
    }
    const ok = await trigger(["pickupAtDate", "pickupAtTime", "passengers"], {
      shouldFocus: false,
    });
    if (!ok) {
      toast.error("Please complete all required fields.");
      return;
    }
    if (!vehicleConfig) {
      toast.error("Please select the number of passengers.");
      return;
    }
    setStep(2);
  }

  function goStep3() {
    setStep(3);
  }

  // ─── Build flight ISO ─────────────────────────────────────────────────────
  function buildFlightIso(date: string, time: string): string | null {
    if (date && time) return localToUtcIso(date, time, companyTimezone);
    if (date) return localToUtcIso(date, "00:00", companyTimezone);
    return null;
  }

  // ─── Add another ride ─────────────────────────────────────────────────────
  async function addAnotherRide() {
    if (!direction) {
      toast.error("Please select a direction.");
      return;
    }
    if (pickupTooSoon) {
      toast.error("Bookings must be made at least 36 hours in advance.");
      return;
    }
    const ok = await trigger(["pickupAtDate", "pickupAtTime", "passengers"], {
      shouldFocus: false,
    });
    if (!ok) {
      toast.error("Please complete all required fields.");
      return;
    }
    if (!vehicleConfig) {
      toast.error("Please select the number of passengers.");
      return;
    }

    const v = getValues();
    const pickupAtIso = localToUtcIso(
      v.pickupAtDate,
      v.pickupAtTime,
      companyTimezone,
    );

    const multiVehicleNote = vehicleConfig.isMultiVehicle
      ? `⚠️ MULTI-VEHICLE: ${vehicleConfig.label} required for ${v.passengers} passengers. Total: $${(vehicleConfig.totalCents / 100).toFixed(2)}. Dispatch must coordinate all vehicles.`
      : "";
    const combinedRequests = [multiVehicleNote, v.specialRequests?.trim()]
      .filter(Boolean)
      .join("\n\n");

    const newLeg: SavedLeg = {
      id: `leg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      direction: direction as Direction,
      pickupAt: pickupAtIso,
      pickupAtDate: v.pickupAtDate,
      pickupAtTime: v.pickupAtTime,
      passengers: v.passengers,
      luggage: v.luggage,
      vehicleConfigLabel: vehicleConfig.label,
      vehicleId: vehicleConfig.primaryVehicleId,
      estimateCents: vehicleConfig.totalCents,
      specialRequests: combinedRequests || null,
      flightAirline: v.flightAirline || null,
      flightNumber: v.flightNumber || null,
      flightScheduledAt: buildFlightIso(
        v.flightScheduledAtDate,
        v.flightScheduledAtTime,
      ),
      flightTerminal: v.flightTerminal || null,
    };

    setSavedLegs((prev) => [...prev, newLeg]);

    // Reset form for next leg (keep contact info)
    setValue("pickupAtDate", "", { shouldDirty: false });
    setValue("pickupAtTime", "", { shouldDirty: false });
    setValue("passengers", 0, { shouldDirty: false });
    setValue("luggage", 0, { shouldDirty: false });
    setValue("flightAirline", "", { shouldDirty: false });
    setValue("flightNumber", "", { shouldDirty: false });
    setValue("flightScheduledAtDate", "", { shouldDirty: false });
    setValue("flightScheduledAtTime", "", { shouldDirty: false });
    setValue("flightTerminal", "", { shouldDirty: false });
    setValue("specialRequests", "", { shouldDirty: false });
    setDirection("");
    clearErrors();

    toast.success(`Ride ${savedLegs.length + 1} added to your trip!`);
    setStep(1);
  }

  // ─── Remove leg ───────────────────────────────────────────────────────────
  function confirmRemoveLeg() {
    if (!removeLegId) return;
    setSavedLegs((prev) => prev.filter((l) => l.id !== removeLegId));
    setRemoveLegId(null);
    toast.success("Ride removed from trip.");
  }

  // ─── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (submitting || submitted) return;

    const contactFields: (keyof FormValues)[] = isAuthed
      ? ["contactPhone"]
      : ["guestName", "guestEmail", "guestPhone"];
    const ok = await trigger(contactFields, { shouldFocus: false });
    if (!ok) {
      toast.error("Please complete your contact information.");
      return;
    }

    const v = getValues();
    if (!vehicleConfig) {
      toast.error("Vehicle configuration error. Please start over.");
      return;
    }

    const pickupAtIso = localToUtcIso(
      v.pickupAtDate,
      v.pickupAtTime,
      companyTimezone,
    );
    const flightScheduledAtIso = buildFlightIso(
      v.flightScheduledAtDate,
      v.flightScheduledAtTime,
    );

    const multiVehicleNote = vehicleConfig.isMultiVehicle
      ? `⚠️ MULTI-VEHICLE: ${vehicleConfig.label} required for ${v.passengers} passengers. Total: $${(vehicleConfig.totalCents / 100).toFixed(2)}. Dispatch must coordinate all vehicles.`
      : "";
    const combinedRequests = [multiVehicleNote, v.specialRequests?.trim()]
      .filter(Boolean)
      .join("\n\n");

    const currentLegPickup = isAirportPickup ? SKY_HARBOR : WEKOPA;
    const currentLegDropoff = isAirportPickup ? WEKOPA : SKY_HARBOR;

    setSubmitting(true);

    try {
      // ── Multi-leg: submit as trip group ────────────────────────────────
      if (savedLegs.length > 0) {
        const currentLeg = {
          serviceTypeId: serviceType.id,
          vehicleId: vehicleConfig.primaryVehicleId,
          pickupAt: pickupAtIso,
          passengers: v.passengers,
          luggage: v.luggage || 0,
          pickupAddress: currentLegPickup.address,
          pickupPlaceId: currentLegPickup.placeId,
          pickupLat: currentLegPickup.lat,
          pickupLng: currentLegPickup.lng,
          dropoffAddress: currentLegDropoff.address,
          dropoffPlaceId: currentLegDropoff.placeId,
          dropoffLat: currentLegDropoff.lat,
          dropoffLng: currentLegDropoff.lng,
          stops: [],
          distanceMiles: ROUTE_DISTANCE_MILES,
          durationMinutes: ROUTE_DURATION_MINUTES,
          hoursRequested: null,
          specialRequests: combinedRequests || null,
          flightAirline: v.flightAirline || null,
          flightNumber: v.flightNumber || null,
          flightScheduledAt: flightScheduledAtIso,
          flightTerminal: v.flightTerminal || null,
          flightGate: null,
          eventType: "Golf Transfer — We-Ko-Pa",
        };

        const allLegs = [
          ...savedLegs.map((sl) => {
            const slIsAirportPickup = sl.direction === "to_wekopa";
            const slPickup = slIsAirportPickup ? SKY_HARBOR : WEKOPA;
            const slDropoff = slIsAirportPickup ? WEKOPA : SKY_HARBOR;
            return {
              serviceTypeId: serviceType.id,
              vehicleId: sl.vehicleId,
              pickupAt: sl.pickupAt,
              passengers: sl.passengers,
              luggage: sl.luggage,
              pickupAddress: slPickup.address,
              pickupPlaceId: slPickup.placeId,
              pickupLat: slPickup.lat,
              pickupLng: slPickup.lng,
              dropoffAddress: slDropoff.address,
              dropoffPlaceId: slDropoff.placeId,
              dropoffLat: slDropoff.lat,
              dropoffLng: slDropoff.lng,
              stops: [],
              distanceMiles: ROUTE_DISTANCE_MILES,
              durationMinutes: ROUTE_DURATION_MINUTES,
              hoursRequested: null,
              specialRequests: sl.specialRequests,
              flightAirline: sl.flightAirline,
              flightNumber: sl.flightNumber,
              flightScheduledAt: sl.flightScheduledAt,
              flightTerminal: sl.flightTerminal,
              flightGate: null,
              eventType: "Golf Transfer — We-Ko-Pa",
            };
          }),
          currentLeg,
        ];

        const groupInput: CreateTripGroupInput = {
          legs: allLegs,
          guestName: isAuthed ? null : v.guestName.trim(),
          guestEmail: isAuthed ? null : v.guestEmail.trim().toLowerCase(),
          guestPhone: isAuthed ? null : v.guestPhone.trim(),
          contactPhone: isAuthed ? v.contactPhone?.trim() : null,
          skipVehicleActiveCheck: true,
        };

        const groupRes = (await createTripGroupBooking(groupInput)) as any;
        if (groupRes?.error) {
          toast.error(groupRes.error);
          setSubmitting(false);
          return;
        }
        setSubmitted(true);
        toast.success(`Trip submitted! (${allLegs.length} rides)`);
        const firstId = groupRes?.firstBookingId ?? null;
        const claimToken = groupRes?.claimToken ?? null;
        const href = firstId
          ? claimToken
            ? `/book/success?id=${encodeURIComponent(String(firstId))}&t=${encodeURIComponent(String(claimToken))}`
            : `/book/success?id=${encodeURIComponent(String(firstId))}`
          : "/book/success";
        router.push(href);
        return;
      }

      // ── Single ride ────────────────────────────────────────────────────
      const res = (await createBookingRequest({
        serviceTypeId: serviceType.id,
        vehicleId: vehicleConfig.primaryVehicleId,
        pickupAt: pickupAtIso,
        passengers: v.passengers,
        luggage: v.luggage || 0,
        pickupAddress: currentLegPickup.address,
        pickupPlaceId: currentLegPickup.placeId,
        pickupLat: currentLegPickup.lat,
        pickupLng: currentLegPickup.lng,
        dropoffAddress: currentLegDropoff.address,
        dropoffPlaceId: currentLegDropoff.placeId,
        dropoffLat: currentLegDropoff.lat,
        dropoffLng: currentLegDropoff.lng,
        contactPhone: isAuthed ? v.contactPhone?.trim() || null : null,
        stops: [],
        distanceMiles: ROUTE_DISTANCE_MILES,
        durationMinutes: ROUTE_DURATION_MINUTES,
        hoursRequested: null,
        specialRequests: combinedRequests || null,
        flightAirline: v.flightAirline || null,
        flightNumber: v.flightNumber || null,
        flightScheduledAt: flightScheduledAtIso,
        flightTerminal: v.flightTerminal || null,
        flightGate: null,
        guestName: isAuthed ? null : v.guestName.trim(),
        guestEmail: isAuthed ? null : v.guestEmail.trim().toLowerCase(),
        guestPhone: isAuthed ? null : v.guestPhone.trim(),
        eventType: "Golf Transfer — We-Ko-Pa",
        skipVehicleActiveCheck: true,
      })) as any;

      if (res?.error) {
        toast.error(res.error);
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
      toast.success("Request submitted!");
      const bookingId = res?.bookingId ?? null;
      const claimToken = res?.claimToken ?? null;
      const href = bookingId
        ? claimToken
          ? `/book/success?id=${encodeURIComponent(String(bookingId))}&t=${encodeURIComponent(String(claimToken))}`
          : `/book/success?id=${encodeURIComponent(String(bookingId))}`
        : "/book/success";
      router.push(href);
    } catch (e: any) {
      toast.error(e?.message ?? "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  // ─── Label helper ─────────────────────────────────────────────────────────
  function labelCx(hasError: boolean) {
    return `cardTitle h5${hasError ? " redBorder" : ""}`;
  }

  // ─── Checklist derived values ─────────────────────────────────────────────
  const currentDirectionLabel =
    direction === "to_wekopa"
      ? "Sky Harbor → We-Ko-Pa"
      : direction === "from_wekopa"
        ? "We-Ko-Pa → Sky Harbor"
        : null;

  const checklistDateTimeLabel = useMemo(() => {
    if (!pickupAtDate || !pickupAtTime) return null;
    try {
      const [, m, d] = pickupAtDate.split("-");
      const [hStr, mStr] = pickupAtTime.split(":");
      let h = parseInt(hStr, 10);
      const ampm = h >= 12 ? "PM" : "AM";
      if (h === 0) h = 12;
      else if (h > 12) h -= 12;
      return `${m}/${d} @ ${h}:${mStr}${ampm}`;
    } catch {
      return `${pickupAtDate} ${pickupAtTime}`;
    }
  }, [pickupAtDate, pickupAtTime]);

  const hasContactInfo = isAuthed
    ? Boolean(contactPhone?.trim())
    : Boolean(guestName.trim() && guestEmail.trim() && guestPhone.trim());

  const contactLabel = useMemo(() => {
    if (isAuthed) {
      const phone = contactPhone?.trim();
      return phone ? formatPhone(phone) : null;
    }
    return guestName.trim() || null;
  }, [isAuthed, contactPhone, guestName]);

  // ─── Checklist items ──────────────────────────────────────────────────────
  const checklistItems = useMemo<ChecklistItem[]>(
    () => [
      {
        key: "direction",
        label: "Direction",
        description: "Where are you headed?",
        isComplete: Boolean(direction),
        value: currentDirectionLabel,
        step: 1,
        priority: "critical",
        sectionId: "wekopa-field-direction",
      },
      {
        key: "datetime",
        label: "Date & Time",
        description: "Select your pickup date and time",
        isComplete: Boolean(pickupAtDate && pickupAtTime),
        value: checklistDateTimeLabel,
        step: 1,
        priority: "critical",
        sectionId: "wekopa-field-datetime",
      },
      {
        key: "passengers",
        label: "Passengers & Bags",
        description: "How many in your group?",
        isComplete: passengers > 0,
        value:
          passengers > 0
            ? `${passengers} passenger${passengers !== 1 ? "s" : ""}, ${luggage} bag${luggage !== 1 ? "s" : ""}`
            : null,
        step: 1,
        priority: "critical",
        sectionId: "wekopa-field-passengers",
      },
      {
        key: "vehicle",
        label: "Vehicle",
        description: "Auto-selected based on party size",
        isComplete: vehicleConfig !== null,
        value: vehicleConfig
          ? `${vehicleConfig.label} · $${(vehicleConfig.totalCents / 100).toFixed(0)} flat`
          : null,
        step: 2,
        priority: "critical",
        sectionId: "wekopa-field-vehicle",
      },
      {
        key: "contact",
        label: "Contact Info",
        description: "Name, email, and phone",
        isComplete: hasContactInfo,
        value: contactLabel,
        step: 3,
        priority: "important",
        sectionId: "wekopa-field-contact",
      },
    ],
    [
      direction,
      currentDirectionLabel,
      pickupAtDate,
      pickupAtTime,
      checklistDateTimeLabel,
      passengers,
      luggage,
      vehicleConfig,
      hasContactInfo,
      contactLabel,
    ],
  );

  const checklistStepLabels: Record<number, string> = {
    1: "Trip Details",
    2: "Vehicle & Flight",
    3: "Confirm",
  };

  const checklistNode = (
    <BookingWizardChecklist
      currentStep={step}
      onGoToStep={(s) => {
        if (s < step) setStep(s as 1 | 2 | 3);
      }}
      hasService={false}
      serviceName={null}
      hasDateTime={false}
      dateTimeLabel={null}
      hasPickup={false}
      pickupLabel={null}
      hasDropoff={false}
      dropoffLabel={null}
      hasPassengersLuggage={false}
      passengersLuggageLabel={null}
      hasVehicle={false}
      vehicleName={null}
      estimateLabel={null}
      hasContactInfo={false}
      contactLabel={null}
      customItems={checklistItems}
      customStepLabels={checklistStepLabels}
    />
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <section id='wekopa-booking' className={styles.container}>
      <LayoutWrapper>
        <div ref={wizardTopRef} className={styles.wizardTop} />

        <div className={styles.content}>
          {/* ── LEFT: sticky checklist (desktop only) ─────────────────── */}
          {!isMobile && (
            <div className={styles.checklistContainer}>{checklistNode}</div>
          )}

          {/* ── RIGHT: wizard steps ───────────────────────────────────── */}
          <div className={styles.right}>
            {isMobile && (
              <div className={styles.checklistMobile}>
                <Stepper step={step} />
              </div>
            )}

            <div className={styles.wizard}>
              {/* ───────────────────────────────────────────────────────
                  STEP 1 — Trip Details
              ─────────────────────────────────────────────────────── */}
              {step === 1 && (
                <div className={`${styles.contentBox} ${styles.stepPane}`}>
                  <h2 className='underline'>1. Trip details</h2>
                  <p className='subheading'>
                    {isMultiLeg
                      ? `Adding ride ${savedLegs.length + 1} to your trip`
                      : "Date, time, and party size"}
                  </p>

                  {/* Saved legs banner */}
                  {isMultiLeg && (
                    <div className={styles.savedLegsBanner}>
                      <strong>
                        🗓️ {savedLegs.length} ride
                        {savedLegs.length > 1 ? "s" : ""} added
                      </strong>
                      <span style={{ opacity: 0.7, marginLeft: 8 }}>
                        (${(savedLegsTotal / 100).toFixed(0)} so far)
                      </span>
                    </div>
                  )}

                  {/* Direction */}
                  <div
                    id='wekopa-field-direction'
                    className={styles.sectionBox}
                  >
                    <label className={labelCx(false)}>Direction</label>
                    <select
                      value={direction}
                      onChange={(e) =>
                        setDirection(e.target.value as Direction | "")
                      }
                      className='selectBorder emptySmall'
                    >
                      <option value=''>Select a direction...</option>
                      <option value='to_wekopa'>
                        Sky Harbor Airport → We-Ko-Pa Golf Club
                      </option>
                      <option value='from_wekopa'>
                        We-Ko-Pa Golf Club → Sky Harbor Airport
                      </option>
                    </select>
                    {direction && (
                      <p className='miniNote'>
                        {direction === "to_wekopa"
                          ? "Pickup at Sky Harbor — drop-off at the club."
                          : "Pickup at the club — drop-off at Sky Harbor."}
                      </p>
                    )}
                  </div>

                  {/* Date & time */}
                  <div id='wekopa-field-datetime' className={styles.sectionBox}>
                    <label
                      className={labelCx(
                        Boolean(errors.pickupAtDate || errors.pickupAtTime),
                      )}
                    >
                      Pickup date &amp; time
                    </label>
                    <BookingDateTimeWithBlackouts
                      date={pickupAtDate}
                      time={pickupAtTime}
                      onChangeDate={(d) => {
                        setValue("pickupAtDate", d, {
                          shouldDirty: true,
                          shouldValidate: false,
                        });
                        clearErrors("pickupAtDate");
                      }}
                      onChangeTime={(t) => {
                        setValue("pickupAtTime", t, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                        clearErrors("pickupAtTime");
                      }}
                      timeZone={companyTimezone}
                    />
                    <p className='miniNote'>
                      🕐 All times are in {companyTimezoneLabel}
                    </p>
                    {pickupTooSoon && (
                      <p
                        className='miniNote'
                        style={{
                          color: "rgba(180,0,0,0.85)",
                          fontWeight: 700,
                          fontSize: 16,
                          letterSpacing: "normal",
                          lineHeight: 1.2,
                        }}
                      >
                        Bookings must be made at least 36 hours in advance.
                        Please choose a later date or time.
                      </p>
                    )}
                  </div>

                  {/* Passengers & Luggage */}
                  <div
                    id='wekopa-field-passengers'
                    className={styles.sectionBox}
                  >
                    <div className={styles.fieldRow}>
                      <div style={{ display: "grid", gap: 10 }}>
                        <label className={labelCx(Boolean(errors.passengers))}>
                          Passengers
                        </label>
                        <select
                          value={passengers}
                          onChange={(e) => {
                            setValue("passengers", Number(e.target.value), {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                            clearErrors("passengers");
                          }}
                          className='selectBorder emptySmall'
                        >
                          <option value={0}>Select...</option>
                          {Array.from(
                            { length: MAX_PASSENGERS_ONLINE },
                            (_, i) => i + 1,
                          ).map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                        <p className='miniNote'>
                          Groups over {MAX_PASSENGERS_ONLINE}?{" "}
                          <a
                            href='tel:+14803004885'
                            className={styles.inlineLink}
                          >
                            Call us
                          </a>{" "}
                          for a custom quote.
                        </p>
                      </div>

                      <div style={{ display: "grid", gap: 10 }}>
                        <label className='cardTitle h5'>
                          Luggage &amp; golf bags
                        </label>
                        <select
                          value={luggage}
                          onChange={(e) =>
                            setValue("luggage", Number(e.target.value), {
                              shouldDirty: true,
                            })
                          }
                          className='selectBorder emptySmall'
                        >
                          {Array.from({ length: 15 }, (_, i) => i).map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                        <p className='miniNote'>
                          Include golf bags in your count
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Vehicle preview */}
                  {vehicleConfig && (
                    <div className={styles.vehiclePreview}>
                      <div className={styles.vehiclePreviewTop}>
                        <span className={styles.vehiclePreviewLabel}>
                          Recommended for {passengers} passenger
                          {passengers !== 1 ? "s" : ""}
                        </span>
                        <span className={styles.vehiclePreviewPrice}>
                          ${(vehicleConfig.totalCents / 100).toFixed(0)}{" "}
                          <span className={styles.vehiclePreviewUnit}>
                            flat rate
                          </span>
                        </span>
                      </div>
                      <p className={styles.vehiclePreviewConfig}>
                        {vehicleConfig.label}
                      </p>
                      {vehicleConfig.savings && (
                        <p className={styles.vehiclePreviewSavings}>
                          ✓ {vehicleConfig.savings}
                        </p>
                      )}
                      {vehicleConfig.isMultiVehicle && (
                        <p className={styles.vehiclePreviewMulti}>
                          ✦ Multiple vehicles dispatched and coordinated to
                          arrive together.
                        </p>
                      )}
                    </div>
                  )}

                  <div className={styles.btnContainer}>
                    {/* <button
                      type='button'
                      onClick={goStep2}
                      className='primaryBtn'
                    >
                      Next
                    </button> */}
                    <Button
                      type='button'
                      text='Next: Vehicle & Flight →'
                      btnType='greenReg'
                      onClick={goStep2}
                    />
                  </div>
                </div>
              )}

              {/* ───────────────────────────────────────────────────────
                  STEP 2 — Vehicle & Flight
              ─────────────────────────────────────────────────────── */}
              {step === 2 && vehicleConfig && (
                <div className={`${styles.contentBox} ${styles.stepPane}`}>
                  <h2 className='underline'>2. Vehicle &amp; Flight</h2>
                  <p className='subheading'>
                    Confirm your vehicle and add optional flight details
                  </p>

                  {/* Vehicle confirmation card */}
                  <div id='wekopa-field-vehicle' className={styles.vehicleCard}>
                    <div className={styles.vehicleCardTop}>
                      <div>
                        <span className={styles.vehicleCardEyebrow}>
                          Your vehicle{vehicleConfig.isMultiVehicle ? "s" : ""}
                        </span>
                        <h4 className={styles.vehicleCardName}>
                          {vehicleConfig.label}
                        </h4>
                        <p className={styles.vehicleCardCapacity}>
                          Total capacity: {vehicleConfig.totalCapacity}{" "}
                          passengers
                        </p>
                      </div>
                      <div className={styles.vehicleCardPriceBlock}>
                        <span className={styles.vehicleCardPrice}>
                          ${(vehicleConfig.totalCents / 100).toFixed(0)}
                        </span>
                        <span className={styles.vehicleCardPriceSub}>
                          flat rate
                        </span>
                      </div>
                    </div>

                    {vehicleConfig.savings && (
                      <p className={styles.vehicleCardSavings}>
                        ✓ {vehicleConfig.savings}
                      </p>
                    )}

                    {vehicleConfig.isMultiVehicle && (
                      <>
                        <div className={styles.vehicleBreakdown}>
                          {vehicleConfig.vans > 0 && (
                            <div className={styles.breakdownRow}>
                              <span>
                                {vehicleConfig.vans} × {vanVehicle.name}
                              </span>
                              <span>
                                $
                                {(
                                  (vehicleConfig.vans * vanPriceCents) /
                                  100
                                ).toFixed(0)}
                              </span>
                            </div>
                          )}
                          {vehicleConfig.suvs > 0 && (
                            <div className={styles.breakdownRow}>
                              <span>
                                {vehicleConfig.suvs} × {suvVehicle.name}
                              </span>
                              <span>
                                $
                                {(
                                  (vehicleConfig.suvs * suvPriceCents) /
                                  100
                                ).toFixed(0)}
                              </span>
                            </div>
                          )}
                          <div
                            className={`${styles.breakdownRow} ${styles.breakdownTotal}`}
                          >
                            <span>Total</span>
                            <span>
                              ${(vehicleConfig.totalCents / 100).toFixed(0)}
                            </span>
                          </div>
                        </div>
                        <p className={styles.vehicleCardMultiNote}>
                          ✦ All vehicles dispatched together and arrive at the
                          same time.
                        </p>
                      </>
                    )}

                    <button
                      type='button'
                      className={styles.vehicleCardEditBtn}
                      onClick={() => setStep(1)}
                    >
                      ← Change passenger count
                    </button>
                  </div>

                  {/* Flight information */}
                  <div className={styles.flightInfoSection}>
                    <div
                      className={styles.flightInfoFields}
                      style={{ padding: "1.25rem" }}
                    >
                      <div
                        className='cardTitle h5'
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span>✈️</span> Flight Information{" "}
                        <span style={{ fontWeight: 400, opacity: 0.7 }}>
                          (optional)
                        </span>
                      </div>
                      <p className='miniNote' style={{ marginBottom: 4 }}>
                        {isAirportPickup
                          ? "Give us your flight details and we'll monitor for delays — adjusting your pickup automatically at no charge."
                          : "Providing your departure flight helps your driver drop you at the right terminal."}
                      </p>

                      <FlightLookupInput
                        flightNumber={flightNumber}
                        flightDate={pickupAtDate}
                        airportLeg={isAirportPickup ? "PICKUP" : "DROPOFF"}
                        onFlightNumberChange={(val) =>
                          setValue("flightNumber", val, { shouldDirty: true })
                        }
                        onFlightFound={(data) => {
                          if (data.airline)
                            setValue("flightAirline", data.airline, {
                              shouldDirty: true,
                            });
                          if (data.terminal)
                            setValue("flightTerminal", data.terminal, {
                              shouldDirty: true,
                            });
                          if (data.scheduledDate)
                            setValue(
                              "flightScheduledAtDate",
                              data.scheduledDate,
                              { shouldDirty: true },
                            );
                          if (data.scheduledTime)
                            setValue(
                              "flightScheduledAtTime",
                              data.scheduledTime,
                              { shouldDirty: true },
                            );
                        }}
                      />

                      <div className={styles.fieldRow}>
                        <div style={{ display: "grid", gap: 8 }}>
                          <label className='cardTitle h5'>
                            {isAirportPickup
                              ? "Arrival date"
                              : "Departure date"}
                          </label>
                          <input
                            type='date'
                            value={flightScheduledAtDate}
                            onChange={(e) =>
                              setValue(
                                "flightScheduledAtDate",
                                e.target.value,
                                { shouldDirty: true },
                              )
                            }
                            className='input emptySmall'
                          />
                        </div>
                        <div style={{ display: "grid", gap: 8 }}>
                          <label className='cardTitle h5'>
                            {isAirportPickup
                              ? "Arrival time"
                              : "Departure time"}
                          </label>
                          <input
                            type='time'
                            value={flightScheduledAtTime}
                            onChange={(e) =>
                              setValue(
                                "flightScheduledAtTime",
                                e.target.value,
                                { shouldDirty: true },
                              )
                            }
                            className='input emptySmall'
                          />
                        </div>
                      </div>

                      <div style={{ display: "grid", gap: 8 }}>
                        <label className='cardTitle h5'>
                          Terminal (optional)
                        </label>
                        <input
                          value={flightTerminal}
                          onChange={(e) =>
                            setValue("flightTerminal", e.target.value, {
                              shouldDirty: true,
                            })
                          }
                          className='input emptySmall'
                          placeholder='e.g. Terminal 4'
                        />
                      </div>
                    </div>
                  </div>

                  <div
                 
                    className={styles.bottomBtnContainer}
                  >
                   
                    <Button
                      type='button'
                      text='← Back: Trip Details'
                      btnType='blackReg'
                      onClick={() => setStep(1)}
                    />
                  
                    <Button
                      type='button'
                      text='Next: Confirm →'
                      btnType='greenReg'
                      onClick={() => setStep(3)}
                    />
                  </div>
                </div>
              )}

              {/* ───────────────────────────────────────────────────────
                  STEP 3 — Contact & Confirm
              ─────────────────────────────────────────────────────── */}
              {step === 3 && (
                <div
                  className={styles.stepPane}
                  style={{ display: "grid", gap: 30 }}
                >
                  <h2 className='underline'>3. Confirm</h2>
                  <p className='subheading'>Review your trip and submit</p>

                  {/* Booking summary */}
                  <div className='box'>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryKey}>Route</span>
                      <span className={styles.summaryVal}>
                        {direction === "to_wekopa"
                          ? "Sky Harbor → We-Ko-Pa"
                          : "We-Ko-Pa → Sky Harbor"}
                      </span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryKey}>Pickup time</span>
                      <span className={styles.summaryVal}>
                        {pickupAtDate && pickupAtTime
                          ? `${pickupAtDate} @ ${pickupAtTime} (${companyTimezoneLabel})`
                          : "—"}
                      </span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryKey}>Passengers</span>
                      <span className={styles.summaryVal}>{passengers}</span>
                    </div>
                    {luggage > 0 && (
                      <div className={styles.summaryRow}>
                        <span className={styles.summaryKey}>Bags</span>
                        <span className={styles.summaryVal}>{luggage}</span>
                      </div>
                    )}
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryKey}>Phone</span>
                      <span className={styles.summaryVal}>
                        {isAuthed
                          ? formatPhone(contactPhone) || "—"
                          : formatPhone(guestPhone) || "—"}
                      </span>
                    </div>
                    {vehicleConfig && (
                      <div className={styles.summaryRow}>
                        <span className={styles.summaryKey}>
                          Vehicle{vehicleConfig.isMultiVehicle ? "s" : ""}
                        </span>
                        <span className={styles.summaryVal}>
                          {vehicleConfig.label}
                        </span>
                      </div>
                    )}
                    {hasFlightInfo && (
                      <>
                        <div
                          style={{
                            borderTop: "1px solid rgba(0,0,0,0.1)",
                            marginTop: 12,
                            paddingTop: 12,
                          }}
                        >
                          <div
                            className='cardTitle h6'
                            style={{ marginBottom: 8, opacity: 0.7 }}
                          >
                            ✈️ Flight Information
                          </div>
                        </div>
                        {flightAirline && (
                          <div className={styles.summaryRow}>
                            <span className={styles.summaryKey}>Airline</span>
                            <span className={styles.summaryVal}>
                              {flightAirline}
                            </span>
                          </div>
                        )}
                        {flightNumber && (
                          <div className={styles.summaryRow}>
                            <span className={styles.summaryKey}>Flight #</span>
                            <span className={styles.summaryVal}>
                              {flightNumber}
                            </span>
                          </div>
                        )}
                        {flightScheduledAtDate && (
                          <div className={styles.summaryRow}>
                            <span className={styles.summaryKey}>
                              {isAirportPickup ? "Arrival" : "Departure"}
                            </span>
                            <span className={styles.summaryVal}>
                              {flightScheduledAtDate}
                              {flightScheduledAtTime
                                ? ` @ ${flightScheduledAtTime}`
                                : ""}
                            </span>
                          </div>
                        )}
                        {flightTerminal && (
                          <div className={styles.summaryRow}>
                            <span className={styles.summaryKey}>Terminal</span>
                            <span className={styles.summaryVal}>
                              {flightTerminal}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                    <div
                      style={{
                        borderTop: "1px solid rgba(0,0,0,0.1)",
                        marginTop: 12,
                        paddingTop: 12,
                      }}
                    />
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryKey}>Flat-rate total</span>
                      <span
                        style={{
                          fontWeight: 900,
                          fontSize: "2.4rem",
                          letterSpacing: "-1px",
                          color: "var(--accent)",
                        }}
                      >
                        $
                        {vehicleConfig
                          ? (vehicleConfig.totalCents / 100).toFixed(0)
                          : "—"}
                      </span>
                    </div>
                    <p className='miniNote' style={{ marginTop: 6 }}>
                      This is a flat-rate transfer. No surge pricing, no hidden
                      fees. Dispatch may confirm details within 24 hours.
                    </p>
                  </div>

                  {/* Multi-leg trip summary */}
                  {savedLegs.length > 0 && (
                    <div
                      className='box'
                      style={{ background: "rgba(0,0,0,0.02)" }}
                    >
                      <div
                        className='cardTitle h5'
                        style={{ marginBottom: 12 }}
                      >
                        <span style={{ marginRight: 10 }}>🗓️</span> Your trip (
                        {savedLegs.length + 1} rides)
                      </div>
                      {savedLegs.map((leg, idx) => (
                        <div key={leg.id} className={styles.savedLegRow}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{ fontWeight: 600, fontSize: "1.4rem" }}
                            >
                              Ride {idx + 1}: {directionLabel(leg.direction)}
                            </div>
                            <div
                              style={{
                                fontSize: "1.3rem",
                                opacity: 0.7,
                                marginTop: 2,
                              }}
                            >
                              {leg.pickupAtDate} @ {leg.pickupAtTime} ·{" "}
                              {leg.vehicleConfigLabel}
                            </div>
                          </div>
                          <div className={styles.savedLegRight}>
                            <span
                              style={{ fontWeight: 700, fontSize: "1.4rem" }}
                            >
                              ${(leg.estimateCents / 100).toFixed(0)}
                            </span>
                            <button
                              type='button'
                              onClick={() => setRemoveLegId(leg.id)}
                              title='Remove this ride'
                              className={styles.removeLegBtn}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                      {/* Current ride row */}
                      <div className={styles.savedLegRow}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: "1.4rem" }}>
                            Ride {savedLegs.length + 1}:{" "}
                            {direction
                              ? directionLabel(direction as Direction)
                              : "—"}{" "}
                            <span style={{ fontWeight: 400, opacity: 0.7 }}>
                              (this ride)
                            </span>
                          </div>
                        </div>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: "1.4rem",
                            flexShrink: 0,
                          }}
                        >
                          $
                          {vehicleConfig
                            ? (vehicleConfig.totalCents / 100).toFixed(0)
                            : "—"}
                        </span>
                      </div>
                      {/* Trip total */}
                      <div className={styles.tripTotal}>
                        <span>Trip total estimate</span>
                        <span>${(groupEstimateTotal / 100).toFixed(0)}</span>
                      </div>
                    </div>
                  )}

                  {/* Contact fields */}
                  {!isAuthed ? (
                    <div
                      id='wekopa-field-contact'
                      className={styles.sectionBox}
                    >
                      <div style={{ display: "grid", gap: 10 }}>
                        <label className={labelCx(Boolean(errors.guestName))}>
                          Full name
                        </label>
                        <input
                          value={guestName}
                          onChange={(e) => {
                            setValue("guestName", e.target.value, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                            clearErrors("guestName");
                          }}
                          className='input subheading'
                          placeholder='Your name'
                        />
                      </div>
                      <div className={styles.fieldRow}>
                        <div style={{ display: "grid", gap: 10 }}>
                          <label
                            className={labelCx(Boolean(errors.guestEmail))}
                          >
                            Email
                          </label>
                          <input
                            value={guestEmail}
                            onChange={(e) => {
                              setValue("guestEmail", e.target.value, {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                              clearErrors("guestEmail");
                            }}
                            className='input subheading'
                            placeholder='you@email.com'
                            inputMode='email'
                          />
                        </div>
                        <div style={{ display: "grid", gap: 10 }}>
                          <label
                            className={labelCx(Boolean(errors.guestPhone))}
                          >
                            Phone
                          </label>
                          <input
                            value={formatPhone(guestPhone) || ""}
                            onChange={(e) => {
                              const digits = e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 10);
                              setValue("guestPhone", digits, {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                              clearErrors("guestPhone");
                            }}
                            className='input subheading'
                            placeholder='(602) 555-1234'
                            inputMode='tel'
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      id='wekopa-field-contact'
                      className={styles.sectionBox}
                    >
                      <div style={{ display: "grid", gap: 8 }}>
                        <label
                          className={labelCx(Boolean(errors.contactPhone))}
                        >
                          Phone number for this trip
                        </label>
                        <input
                          value={formatPhone(contactPhone) || ""}
                          onChange={(e) => {
                            const digits = e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 10);
                            setValue("contactPhone", digits, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                            clearErrors("contactPhone");
                          }}
                          className='input subheading'
                          placeholder='(602) 555-1234'
                          inputMode='tel'
                        />
                        <p className='miniNote'>
                          Your driver will use this number to contact you.
                          {phoneWasPrefilled.current &&
                            contactPhone?.trim() && (
                              <span style={{ marginLeft: 6, fontWeight: 600 }}>
                                (already on file)
                              </span>
                            )}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Special requests */}
                  <div style={{ display: "grid", gap: 8 }}>
                    <div className='cardTitle h5'>
                      Special requests{" "}
                      <span style={{ fontWeight: 400, opacity: 0.7 }}>
                        (optional)
                      </span>
                    </div>
                    <textarea
                      value={watch("specialRequests")}
                      onChange={(e) =>
                        setValue("specialRequests", e.target.value, {
                          shouldDirty: true,
                        })
                      }
                      className='input subheading'
                      style={{ minHeight: 90 }}
                      placeholder='Child seat, accessibility needs, meet & greet, early arrival...'
                    />
                  </div>

                  {/* Add another ride */}
                  {/* <button
                    type='button'
                    onClick={addAnotherRide}
                    className='secondaryBtn'
                    disabled={submitting || submitted}
                    style={{ width: "100%", textAlign: "center" }}
                  >
                    ➕ Add another ride to this trip
                  </button> */}
                  <Button
                    type='button'
                    text='Add another ride to this trip'
                    btnType='greenii'
                    onClick={() => setStep(1)}
                    plus
                  />
                  {savedLegs.length === 0 && (
                    <div
                      className='miniNote'
                      style={{ textAlign: "center", marginTop: -4 }}
                    >
                      Need rides on multiple days? Add them all here and submit
                      as one trip.
                    </div>
                  )}

                  <div
                 
                    className={styles.bottomBtnContainer}
                  >
                   
                    <Button
                      type='button'
                      text='← Back: Vehicle & Flight'
                      btnType='blackReg'
                      onClick={() => setStep(2)}
                    />
                    
                    <Button
                      type='button'
                      text={
                        submitted
                          ? "Submitted"
                          : submitting
                            ? "Submitting..."
                            : isMultiLeg
                              ? `Submit ${savedLegs.length + 1} rides`
                              : "Submit request →"
                      }
                      btnType='greenReg'
                      onClick={() => setStep(2)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </LayoutWrapper>

      {/* Remove ride confirmation modal */}
      <Modal isOpen={removeLegId !== null} onClose={() => setRemoveLegId(null)}>
        <div className={styles.modalContent}>
          <div className='cardTitle h5'>Remove this ride?</div>
          <p className='paragraph'>
            Are you sure you want to remove this ride from your trip?
            <br />
            <span className={styles.modalSubnote}>
              You can always add it back later.
            </span>
          </p>
          <div className={styles.modalActions}>
            <button
              type='button'
              className='secondaryBtn'
              onClick={() => setRemoveLegId(null)}
            >
              Cancel
            </button>
            <button
              type='button'
              className='primaryBtn'
              style={{ background: "rgba(180,0,0,0.85)" }}
              onClick={confirmRemoveLeg}
            >
              Yes, remove ride
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
