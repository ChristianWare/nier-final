/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/incompatible-library */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import styles from "./BookingWizard.module.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import RoutePicker, {
  RoutePickerPlace,
  RoutePickerValue,
} from "@/components/BookingPage/RoutePicker/RoutePicker";
import { createBookingRequest } from "../../../../actions/bookings/createBookingRequest";
import {
  createTripGroupBooking,
  type CreateTripGroupInput,
} from "../../../../actions/bookings/createTripGroupBooking";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import Grid2 from "../Grid2/Grid2";
import BookingWizardChecklist from "../BookingWizardChecklist/BookingWizardChecklist";
import SummaryRow from "../SummaryRow/SummaryRow";
import BookingDateTimeWithBlackouts from "@/components/BookingPage/BookingDateTimeWithBlackouts/BookingDateTimeWithBlackouts";
import { useSession } from "next-auth/react";
import { Controller, useForm } from "react-hook-form";
import {
  calcQuoteCents,
  EXTRA_STOP_FEE_CENTS,
  STOP_WAIT_TIME_MINUTES,
} from "@/lib/pricing/calcQuote";
import { ServicePricingStrategy } from "@prisma/client";
import FlightLookupInput from "../FlightLookupInput/FlightLookupInput";
import AirlineSelect from "@/components/BookingPage/AirlineSelect/AirlineSelect";
import { extractIataFromFlightNumber } from "@/lib/flight/airlineList";
import Stepper from "../Stepper/Stepper";
import Modal from "@/components/shared/Modal/Modal";
import { localToUtcIso, isPickupTooSoon } from "@/lib/timezone";
import { useDirtyForm } from "@/components/shared/DirtyFormProvider/DirtyFormProvider";

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
  minHours: number;
  active: boolean;
  sortOrder: number;
  airportLeg: AirportLeg;
  airports: AirportDTO[];
  fees: {
    id: string;
    label: string;
    amountCents: number;
  }[];
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
  callForPricing: boolean;
  callForPricingMessage: string | null;
};

type FormValues = {
  serviceTypeId: string;
  pickupAtDate: string;
  pickupAtTime: string;
  passengers: number;
  luggage: number;
  pickupAirportId: string;
  dropoffAirportId: string;
  hoursRequested: number;
  route: RoutePickerValue | null;
  vehicleId: string;
  specialRequests: string;
  flightAirline: string;
  flightNumber: string;
  flightScheduledAtDate: string;
  flightScheduledAtTime: string;
  flightTerminal: string;
  flightGate: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  contactPhone: string;
  eventType: string;
};

/** A completed leg stored in state before group submission */
type SavedLeg = {
  id: string;
  serviceTypeId: string;
  serviceName: string;
  vehicleId: string;
  vehicleName: string;
  pickupAt: string;
  pickupAtDate: string;
  pickupAtTime: string;
  passengers: number;
  luggage: number;
  pickupAddress: string;
  pickupPlaceId: string | null;
  pickupLat: number | null;
  pickupLng: number | null;
  dropoffAddress: string;
  dropoffPlaceId: string | null;
  dropoffLat: number | null;
  dropoffLng: number | null;
  stops: StopInput[];
  distanceMiles: number | null;
  durationMinutes: number | null;
  hoursRequested: number | null;
  specialRequests: string | null;
  flightAirline: string | null;
  flightNumber: string | null;
  flightScheduledAt: string | null;
  flightTerminal: string | null;
  flightGate: string | null;
  eventType: string | null;
  estimateCents: number;
  callForPricing: boolean;
  contactPhone: string | null;
};

type StopInput = {
  address: string;
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
};

function centsToUsd(cents: number) {
  return (cents / 100).toFixed(2);
}

/** Format a phone string as (XXX) XXX-XXXX if 10 digits */
function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return raw;
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function toNumber(v: any): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function normPlace(p: RoutePickerPlace | null | undefined) {
  if (!p) return null;
  return {
    address: String(p.address ?? ""),
    placeId: p.placeId ? String(p.placeId) : null,
    lat: toNumber(p.location?.lat ?? null),
    lng: toNumber(p.location?.lng ?? null),
  };
}

function routeEquals(a: RoutePickerValue | null, b: RoutePickerValue | null) {
  if (a === b) return true;
  if (!a && !b) return true;
  if (!a || !b) return false;
  const ap = normPlace(a.pickup);
  const ad = normPlace(a.dropoff);
  const bp = normPlace(b.pickup);
  const bd = normPlace(b.dropoff);
  const milesA = toNumber(a.miles ?? a.distanceMiles ?? null);
  const minsA = toNumber(a.minutes ?? a.durationMinutes ?? null);
  const milesB = toNumber(b.miles ?? b.distanceMiles ?? null);
  const minsB = toNumber(b.minutes ?? b.durationMinutes ?? null);
  return (
    JSON.stringify(ap) === JSON.stringify(bp) &&
    JSON.stringify(ad) === JSON.stringify(bd) &&
    milesA === milesB &&
    minsA === minsB
  );
}

function toStrategy(s: PricingStrategy): ServicePricingStrategy {
  if (s === "POINT_TO_POINT") return ServicePricingStrategy.POINT_TO_POINT;
  if (s === "HOURLY") return ServicePricingStrategy.HOURLY;
  return ServicePricingStrategy.FLAT;
}

function routeMiles(v: RoutePickerValue | null): number {
  return Math.max(0, toNumber(v?.miles ?? v?.distanceMiles ?? null) ?? 0);
}

function routeMinutes(v: RoutePickerValue | null): number {
  return Math.max(0, toNumber(v?.minutes ?? v?.durationMinutes ?? null) ?? 0);
}

/** Truncate an address for display in the checklist */
function shortAddress(addr: string | null | undefined, maxLen = 35): string {
  if (!addr) return "";
  return addr.length > maxLen ? addr.slice(0, maxLen) + "…" : addr;
}

/** Validate a US phone number — must be 10 digits, not obviously fake */
function isValidPhone(raw: string | null | undefined): boolean | string {
  if (!raw) return "Please enter a phone number.";
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return "Phone number must be 10 digits.";
  if (digits.length > 10) return "Phone number must be 10 digits.";
  // Block 555 numbers
  if (digits.slice(3, 6) === "555") return "Please enter a real phone number.";
  // Block all same digit (e.g. 0000000000, 1111111111)
  if (/^(\d)\1{9}$/.test(digits)) return "Please enter a real phone number.";
  // Block sequential (1234567890)
  if (digits === "1234567890") return "Please enter a real phone number.";
  return true;
}

export default function BookingWizard({
  serviceTypes,
  vehicles,
  userPhone,
  companyTimezone,
  companyTimezoneLabel,
}: {
  serviceTypes: ServiceTypeDTO[];
  vehicles: VehicleDTO[];
  userPhone?: string | null;
  companyTimezone: string;
  companyTimezoneLabel: string;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const isAuthed = Boolean(session?.user);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [savedLegs, setSavedLegs] = useState<SavedLeg[]>([]);
  const [removeLegId, setRemoveLegId] = useState<string | null>(null);

  const services = useMemo<ServiceTypeDTO[]>(
    () => serviceTypes ?? [],
    [serviceTypes],
  );
  const vehicleOptions = useMemo<VehicleDTO[]>(
    () => vehicles ?? [],
    [vehicles],
  );
  const hasNoServices = services.length === 0;

  const pickupInputRef = useRef<HTMLInputElement | null>(null);
  const dropoffInputRef = useRef<HTMLInputElement | null>(null);
  const phoneWasPrefilled = useRef(Boolean(userPhone?.trim()));

  const {
    control,
    register,
    watch,
    setValue,
    getValues,
    getFieldState,
    clearErrors,
    trigger,
    formState: { errors },
  } = useForm<FormValues>({
    mode: "onTouched",
    defaultValues: {
      serviceTypeId: "",
      pickupAtDate: "",
      pickupAtTime: "",
      passengers: 0,
      luggage: 0,
      pickupAirportId: "",
      dropoffAirportId: "",
      hoursRequested: 2,
      route: null,
      vehicleId: "",
      eventType: "",
      specialRequests: "",
      flightAirline: "",
      flightNumber: "",
      flightScheduledAtDate: "",
      flightScheduledAtTime: "",
      flightTerminal: "",
      flightGate: "",
      guestName: "",
      guestEmail: "",
      guestPhone: "",
      contactPhone: userPhone ?? "",
    },
  });

  const serviceTypeId = watch("serviceTypeId");
  const pickupAtDate = watch("pickupAtDate");
  const pickupAtTime = watch("pickupAtTime");

  const pickupTooSoon = useMemo(() => {
    if (!pickupAtDate || !pickupAtTime) return false;
    return isPickupTooSoon(
      pickupAtDate,
      pickupAtTime,
      companyTimezone,
      36 * 60,
    );
  }, [pickupAtDate, pickupAtTime, companyTimezone]);

  const passengers = watch("passengers");
  const luggage = watch("luggage");
  const hoursRequested = watch("hoursRequested");
  const route = watch("route");
  const vehicleId = watch("vehicleId");
  const guestName = watch("guestName");
  const guestEmail = watch("guestEmail");
  const guestPhone = watch("guestPhone");
  const pickupAirportId = watch("pickupAirportId");
  const dropoffAirportId = watch("dropoffAirportId");
  const flightAirline = watch("flightAirline");
  const flightNumber = watch("flightNumber");
  const flightScheduledAtDate = watch("flightScheduledAtDate");
  const flightScheduledAtTime = watch("flightScheduledAtTime");
  const flightTerminal = watch("flightTerminal");
  const flightGate = watch("flightGate");

  // ─── Dirty form tracking (navigation guard) ───
  const wizardHasInput = Boolean(
    serviceTypeId ||
    pickupAtDate ||
    pickupAtTime ||
    vehicleId ||
    route?.pickup ||
    route?.dropoff ||
    savedLegs.length > 0,
  );
  useDirtyForm("booking-wizard", wizardHasInput && !submitted);

  const selectedService = useMemo(() => {
    if (!serviceTypeId) return null;
    return services.find((s) => s.id === serviceTypeId) ?? null;
  }, [services, serviceTypeId]);

  const selectedVehicle = useMemo(
    () => vehicleOptions.find((v) => v.id === vehicleId) ?? null,
    [vehicleOptions, vehicleId],
  );

  const filteredVehicles = useMemo(() => {
    if (passengers <= 0) return vehicleOptions;
    return vehicleOptions.filter((v) => v.capacity >= passengers);
  }, [vehicleOptions, passengers]);

  useEffect(() => {
    if (!vehicleId) return;
    const selected = vehicleOptions.find((v) => v.id === vehicleId);
    if (selected && passengers > 0 && selected.capacity < passengers) {
      setValue("vehicleId", "", { shouldDirty: true });
    }
  }, [passengers, vehicleId, vehicleOptions, setValue]);

  const serviceAirports = selectedService?.airports ?? [];
  const usesPickupAirport = selectedService?.airportLeg === "PICKUP";
  const usesDropoffAirport = selectedService?.airportLeg === "DROPOFF";
  const isAirportService = usesPickupAirport || usesDropoffAirport;

  useEffect(() => {
    register("serviceTypeId", { required: "Please select a service." });
    register("pickupAtDate", { required: "Please choose a pickup date." });
    register("pickupAtTime", { required: "Please choose a pickup time." });
    register("passengers", {
      valueAsNumber: true,
      required: "Passengers is required.",
      min: { value: 1, message: "Passengers must be at least 1." },
    });
    register("luggage", {
      valueAsNumber: true,
      required: "Luggage is required.",
      min: { value: 0, message: "Luggage cannot be negative." },
    });
    register("pickupAirportId", {
      validate: (v) =>
        usesPickupAirport
          ? v
            ? true
            : "Please choose a pickup airport."
          : true,
    });
    register("dropoffAirportId", {
      validate: (v) =>
        usesDropoffAirport
          ? v
            ? true
            : "Please choose a dropoff airport."
          : true,
    });
    register("hoursRequested", {
      valueAsNumber: true,
      validate: (v) => {
        if (selectedService?.pricingStrategy !== "HOURLY") return true;
        if (!Number.isFinite(v)) return "Please enter hours.";
        if (v < 1) return "Hours must be at least 1.";
        return true;
      },
    });
    register("vehicleId", { required: "Please choose a vehicle category." });
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
      validate: (v) => {
        if (isAuthed) return true;
        return isValidPhone(v);
      },
    });
    register("contactPhone", {
      validate: (v) => {
        if (!isAuthed) return true;
        return isValidPhone(v);
      },
    });
    register("flightAirline");
    register("flightNumber");
    register("flightScheduledAtDate");
    register("flightScheduledAtTime");
    register("flightTerminal");
    register("flightGate");
  }, [
    register,
    usesPickupAirport,
    usesDropoffAirport,
    selectedService?.pricingStrategy,
    isAuthed,
  ]);

  const pickupLabelRed =
    Boolean(errors.route) && !route?.pickup && !usesPickupAirport;
  const dropoffLabelRed =
    Boolean(errors.route) && !route?.dropoff && !usesDropoffAirport;
  const minHours =
    selectedService?.pricingStrategy === "HOURLY"
      ? (selectedVehicle?.minHours ?? 0)
      : 0;
  const billableHours =
    selectedService?.pricingStrategy === "HOURLY"
      ? Math.max(Math.ceil(hoursRequested || 0), Math.ceil(minHours || 0))
      : null;
  const distanceMiles = routeMiles(route);
  const durationMinutes = routeMinutes(route);

  const estimateCents = useMemo(() => {
    if (!selectedService) return 0;

    const stopCount = route?.stops?.length ?? 0;

    const feesForQuote = (selectedService.fees ?? []).map((f) => ({
      label: f.label,
      amountCents: f.amountCents,
    }));

    const quote = calcQuoteCents({
      pricingStrategy: toStrategy(selectedService.pricingStrategy),
      distanceMiles:
        selectedService.pricingStrategy === "POINT_TO_POINT"
          ? distanceMiles
          : null,
      durationMinutes:
        selectedService.pricingStrategy === "POINT_TO_POINT"
          ? durationMinutes
          : null,
      hoursRequested:
        selectedService.pricingStrategy === "HOURLY" ? hoursRequested : null,
      stopCount,
      fees: feesForQuote,
      vehicleMinHours: selectedVehicle?.minHours ?? 0,
      serviceMinHours: selectedService.minHours ?? 0,
      serviceMinFareCents: selectedService.minFareCents,
      serviceBaseFeeCents: selectedService.baseFeeCents,
      servicePerMileCents: selectedService.perMileCents,
      servicePerMinuteCents: selectedService.perMinuteCents,
      servicePerHourCents: selectedService.perHourCents,
      vehicleBaseFareCents: selectedVehicle?.baseFareCents ?? 0,
      vehiclePerMileCents: selectedVehicle?.perMileCents ?? 0,
      vehiclePerMinuteCents: selectedVehicle?.perMinuteCents ?? 0,
      vehiclePerHourCents: selectedVehicle?.perHourCents ?? 0,
    });
    return quote.totalCents;
  }, [
    selectedService,
    selectedVehicle,
    distanceMiles,
    durationMinutes,
    hoursRequested,
    route?.stops?.length,
  ]);

  // ─── Multi-leg helpers ───
  const isMultiLeg = savedLegs.length > 0;
  const savedLegsTotal = savedLegs.reduce((sum, l) => sum + l.estimateCents, 0);
  const groupEstimateTotal = savedLegsTotal + estimateCents;

  const wizardTopRef = useRef<HTMLDivElement | null>(null);
  const didMountRef = useRef(false);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    wizardTopRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [step]);

  function labelCx(hasError: boolean) {
    return `cardTitle h5${hasError ? " redBorder" : ""}`;
  }

  function firstErrorMessage(): string {
    const order: (keyof FormValues)[] = [
      "serviceTypeId",
      "pickupAtDate",
      "pickupAtTime",
      "pickupAirportId",
      "dropoffAirportId",
      "route",
      "passengers",
      "luggage",
      "hoursRequested",
      "vehicleId",
      "guestName",
      "guestEmail",
      "guestPhone",
      "contactPhone",
    ];
    for (const k of order) {
      const err = (errors as any)?.[k];
      if (err?.message) return String(err.message);
    }
    return "Please fix the highlighted fields.";
  }

  function firstErrorMessageFrom(fields: (keyof FormValues)[]) {
    for (const k of fields) {
      const st = getFieldState(k as any);
      if (st.error?.message) return String(st.error.message);
    }
    return "Please complete the highlighted fields.";
  }

  function applyAirportToRoute(side: "pickup" | "dropoff", airportId: string) {
    const a = serviceAirports.find((x) => x.id === airportId) ?? null;
    if (!a) {
      const prev = getValues("route");
      const prevPickup = prev?.pickup ?? null;
      const prevDropoff = prev?.dropoff ?? null;
      const next: RoutePickerValue = {
        pickup: side === "pickup" ? null : prevPickup,
        dropoff: side === "dropoff" ? null : prevDropoff,
        stops: [],
        miles: null,
        minutes: null,
        distanceMiles: null,
        durationMinutes: null,
      };
      setValue("route", next.pickup || next.dropoff ? next : null, {
        shouldDirty: true,
        shouldValidate: true,
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
    const prev = getValues("route");
    const prevPickup = prev?.pickup ?? null;
    const prevDropoff = prev?.dropoff ?? null;
    const next: RoutePickerValue = {
      pickup: side === "pickup" ? place : prevPickup,
      dropoff: side === "dropoff" ? place : prevDropoff,
      stops: [],
      miles: null,
      minutes: null,
      distanceMiles: null,
      durationMinutes: null,
    };
    setValue("route", next, { shouldDirty: true, shouldValidate: true });
  }

  async function goStep2() {
    if (pickupTooSoon) {
      toast.error("Bookings must be made at least 36 hours in advance.");
      return;
    }
    if (
      selectedService &&
      selectedService.airportLeg !== "NONE" &&
      serviceAirports.length === 0
    ) {
      toast.error(
        "This airport service isn't configured yet (no airports assigned).",
      );
      return;
    }
    const fields: (keyof FormValues)[] = [
      "serviceTypeId",
      "pickupAtDate",
      "pickupAtTime",
      "passengers",
      "luggage",
      "route",
    ];
    if (usesPickupAirport) fields.push("pickupAirportId");
    if (usesDropoffAirport) fields.push("dropoffAirportId");
    if (selectedService?.pricingStrategy === "HOURLY")
      fields.push("hoursRequested");
    const ok = await trigger(fields, { shouldFocus: false });
    if (!ok) {
      toast.error(firstErrorMessageFrom(fields));
      return;
    }
    setStep(2);
  }

  async function goStep3() {
    const ok = await trigger(["vehicleId"], { shouldFocus: false });
    if (!ok) {
      toast.error(firstErrorMessage());
      return;
    }
    setStep(3);
  }

  /** Save current leg to the savedLegs array and reset wizard to step 1 */
  async function addAnotherRide() {
    const fields: (keyof FormValues)[] = [
      "serviceTypeId",
      "pickupAtDate",
      "pickupAtTime",
      "passengers",
      "luggage",
      "route",
      "vehicleId",
    ];
    if (usesPickupAirport) fields.push("pickupAirportId");
    if (usesDropoffAirport) fields.push("dropoffAirportId");
    if (selectedService?.pricingStrategy === "HOURLY")
      fields.push("hoursRequested");

    const ok = await trigger(fields, { shouldFocus: false });
    if (!ok) {
      toast.error(firstErrorMessage());
      return;
    }

    const v = getValues();
    if (!selectedService || !v.route?.pickup || !v.route?.dropoff) {
      toast.error("Please complete pickup and dropoff.");
      return;
    }

    if (selectedService.pricingStrategy === "POINT_TO_POINT") {
      const miles = routeMiles(v.route);
      if (!miles || miles <= 0) {
        toast.error("Route estimate missing. Please re-check the route.");
        return;
      }
    }

    const pickupAtIso = localToUtcIso(
      v.pickupAtDate,
      v.pickupAtTime,
      companyTimezone,
    );

    let flightScheduledAtIso: string | null = null;
    if (v.flightScheduledAtDate && v.flightScheduledAtTime) {
      flightScheduledAtIso = localToUtcIso(
        v.flightScheduledAtDate,
        v.flightScheduledAtTime,
        companyTimezone,
      );
    } else if (v.flightScheduledAtDate) {
      flightScheduledAtIso = localToUtcIso(
        v.flightScheduledAtDate,
        "00:00",
        companyTimezone,
      );
    }

    const newLeg: SavedLeg = {
      id: `leg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      serviceTypeId: selectedService.id,
      serviceName: selectedService.name,
      vehicleId: v.vehicleId,
      vehicleName: selectedVehicle?.name ?? "Standard",
      pickupAt: pickupAtIso,
      pickupAtDate: v.pickupAtDate,
      pickupAtTime: v.pickupAtTime,
      passengers: v.passengers,
      luggage: v.luggage,
      pickupAddress: v.route.pickup.address,
      pickupPlaceId: v.route.pickup.placeId ?? null,
      pickupLat: v.route.pickup.location?.lat ?? null,
      pickupLng: v.route.pickup.location?.lng ?? null,
      dropoffAddress: v.route.dropoff.address,
      dropoffPlaceId: v.route.dropoff.placeId ?? null,
      dropoffLat: v.route.dropoff.location?.lat ?? null,
      dropoffLng: v.route.dropoff.location?.lng ?? null,
      stops: (v.route.stops ?? []).map((s) => ({
        address: s.address,
        placeId: s.placeId ?? null,
        lat: s.location?.lat ?? null,
        lng: s.location?.lng ?? null,
      })),
      distanceMiles: toNumber(v.route.miles ?? v.route.distanceMiles ?? null),
      durationMinutes: toNumber(
        v.route.minutes ?? v.route.durationMinutes ?? null,
      ),
      hoursRequested:
        selectedService.pricingStrategy === "HOURLY" ? v.hoursRequested : null,
      specialRequests: v.specialRequests || null,
      flightAirline: v.flightAirline || null,
      flightNumber: v.flightNumber || null,
      flightScheduledAt: flightScheduledAtIso,
      flightTerminal: v.flightTerminal || null,
      flightGate: v.flightGate || null,
      eventType: v.eventType || null,
      estimateCents: estimateCents,
      callForPricing: selectedVehicle?.callForPricing ?? false,
      contactPhone: isAuthed ? v.contactPhone?.trim() || null : null,
    };

    setSavedLegs((prev) => [...prev, newLeg]);

    // Reset wizard fields for the next leg (keep contact info)
    setValue("serviceTypeId", "", { shouldDirty: false });
    setValue("pickupAtDate", "", { shouldDirty: false });
    setValue("pickupAtTime", "", { shouldDirty: false });
    setValue("passengers", 0, { shouldDirty: false });
    setValue("luggage", 0, { shouldDirty: false });
    setValue("pickupAirportId", "", { shouldDirty: false });
    setValue("dropoffAirportId", "", { shouldDirty: false });
    setValue("hoursRequested", 2, { shouldDirty: false });
    setValue("route", null, { shouldDirty: false });
    setValue("vehicleId", "", { shouldDirty: false });
    setValue("specialRequests", "", { shouldDirty: false });
    setValue("flightAirline", "", { shouldDirty: false });
    setValue("flightNumber", "", { shouldDirty: false });
    setValue("flightScheduledAtDate", "", { shouldDirty: false });
    setValue("flightScheduledAtTime", "", { shouldDirty: false });
    setValue("flightTerminal", "", { shouldDirty: false });
    setValue("flightGate", "", { shouldDirty: false });
    setValue("eventType", "", { shouldDirty: false });
    clearErrors();

    toast.success(`Ride ${savedLegs.length + 1} added to your trip!`);
    setStep(1);
  }

  function confirmRemoveLeg() {
    if (!removeLegId) return;
    setSavedLegs((prev) => prev.filter((l) => l.id !== removeLegId));
    setRemoveLegId(null);
    toast.success("Ride removed from trip.");
  }

  async function handleSubmit() {
    if (submitting || submitted) return;
    if (
      selectedService &&
      selectedService.airportLeg !== "NONE" &&
      serviceAirports.length === 0
    ) {
      toast.error("This airport service isn't configured yet.");
      return;
    }
    const fields: (keyof FormValues)[] = [
      "serviceTypeId",
      "pickupAtDate",
      "pickupAtTime",
      "passengers",
      "luggage",
      "route",
      "vehicleId",
    ];
    if (usesPickupAirport) fields.push("pickupAirportId");
    if (usesDropoffAirport) fields.push("dropoffAirportId");
    if (selectedService?.pricingStrategy === "HOURLY")
      fields.push("hoursRequested");
    if (!isAuthed) fields.push("guestName", "guestEmail", "guestPhone");
    if (isAuthed) fields.push("contactPhone");
    const ok = await trigger(fields, { shouldFocus: false });
    if (!ok) {
      toast.error(firstErrorMessage());
      return;
    }
    const v = getValues();
    if (!selectedService) {
      toast.error("Please select a service.");
      return;
    }
    if (!v.route?.pickup || !v.route?.dropoff) {
      toast.error("Please select pickup and dropoff.");
      return;
    }
    if (selectedService.pricingStrategy === "POINT_TO_POINT") {
      const miles = routeMiles(v.route);
      if (!miles || miles <= 0) {
        toast.error(
          "Route estimate missing (miles). Please re-check pickup/dropoff.",
        );
        return;
      }
    }
    const pickupAtIso = localToUtcIso(
      v.pickupAtDate,
      v.pickupAtTime,
      companyTimezone,
    );
    let flightScheduledAtIso: string | null = null;
    if (v.flightScheduledAtDate && v.flightScheduledAtTime) {
      flightScheduledAtIso = localToUtcIso(
        v.flightScheduledAtDate,
        v.flightScheduledAtTime,
        companyTimezone,
      );
    } else if (v.flightScheduledAtDate) {
      flightScheduledAtIso = localToUtcIso(
        v.flightScheduledAtDate,
        "00:00",
        companyTimezone,
      );
    }
    setSubmitting(true);
    try {
      const pickup = v.route.pickup;
      const dropoff = v.route.dropoff;

      // ─── Multi-leg: submit as trip group ───
      if (savedLegs.length > 0) {
        let flightScheduledAtIsoGroup: string | null = null;
        if (v.flightScheduledAtDate && v.flightScheduledAtTime) {
          flightScheduledAtIsoGroup = localToUtcIso(
            v.flightScheduledAtDate,
            v.flightScheduledAtTime,
            companyTimezone,
          );
        } else if (v.flightScheduledAtDate) {
          flightScheduledAtIsoGroup = localToUtcIso(
            v.flightScheduledAtDate,
            "00:00",
            companyTimezone,
          );
        }

        const currentLeg = {
          serviceTypeId: selectedService!.id,
          vehicleId: v.vehicleId,
          pickupAt: pickupAtIso,
          passengers: v.passengers,
          luggage: v.luggage,
          pickupAddress: pickup.address,
          pickupPlaceId: pickup.placeId ?? null,
          pickupLat: pickup.location?.lat ?? null,
          pickupLng: pickup.location?.lng ?? null,
          dropoffAddress: dropoff.address,
          dropoffPlaceId: dropoff.placeId ?? null,
          dropoffLat: dropoff.location?.lat ?? null,
          dropoffLng: dropoff.location?.lng ?? null,
          stops: (v.route?.stops ?? []).map((s) => ({
            address: s.address,
            placeId: s.placeId ?? null,
            lat: s.location?.lat ?? null,
            lng: s.location?.lng ?? null,
          })),
          distanceMiles: toNumber(
            v.route!.miles ?? v.route!.distanceMiles ?? null,
          ),
          durationMinutes: toNumber(
            v.route!.minutes ?? v.route!.durationMinutes ?? null,
          ),
          hoursRequested:
            selectedService!.pricingStrategy === "HOURLY"
              ? v.hoursRequested
              : null,
          specialRequests: v.specialRequests || null,
          flightAirline: v.flightAirline || null,
          flightNumber: v.flightNumber || null,
          flightScheduledAt: flightScheduledAtIsoGroup,
          flightTerminal: v.flightTerminal || null,
          flightGate: v.flightGate || null,
          eventType: v.eventType || null,
        };

        const allLegs = [
          ...savedLegs.map((sl) => ({
            serviceTypeId: sl.serviceTypeId,
            vehicleId: sl.vehicleId,
            pickupAt: sl.pickupAt,
            passengers: sl.passengers,
            luggage: sl.luggage,
            pickupAddress: sl.pickupAddress,
            pickupPlaceId: sl.pickupPlaceId,
            pickupLat: sl.pickupLat,
            pickupLng: sl.pickupLng,
            dropoffAddress: sl.dropoffAddress,
            dropoffPlaceId: sl.dropoffPlaceId,
            dropoffLat: sl.dropoffLat,
            dropoffLng: sl.dropoffLng,
            stops: sl.stops,
            distanceMiles: sl.distanceMiles,
            durationMinutes: sl.durationMinutes,
            hoursRequested: sl.hoursRequested,
            specialRequests: sl.specialRequests,
            flightAirline: sl.flightAirline,
            flightNumber: sl.flightNumber,
            flightScheduledAt: sl.flightScheduledAt,
            flightTerminal: sl.flightTerminal,
            flightGate: sl.flightGate,
            eventType: sl.eventType,
          })),
          currentLeg,
        ];

        const groupInput: CreateTripGroupInput = {
          legs: allLegs,
          guestName: isAuthed ? null : v.guestName.trim(),
          guestEmail: isAuthed ? null : v.guestEmail.trim().toLowerCase(),
          guestPhone: isAuthed ? null : v.guestPhone.trim(),
          contactPhone: isAuthed ? v.contactPhone?.trim() : null,
        };

        const groupRes = await createTripGroupBooking(groupInput);
        const groupData = groupRes as any;
        if (groupData?.error) {
          toast.error(groupData.error);
          setSubmitting(false);
          return;
        }
        setSubmitted(true);
        toast.success(`Multi-day trip submitted! (${allLegs.length} rides)`);
        const groupBookingId = groupData?.firstBookingId ?? null;
        const groupClaimToken = groupData?.claimToken ?? null;
        const groupHref = groupBookingId
          ? groupClaimToken
            ? `/book/success?id=${encodeURIComponent(String(groupBookingId))}&t=${encodeURIComponent(String(groupClaimToken))}`
            : `/book/success?id=${encodeURIComponent(String(groupBookingId))}`
          : "/book/success";
        router.push(groupHref);
        return;
      }

      // ─── Single ride: existing flow ───
      const res = await createBookingRequest({
        serviceTypeId: selectedService.id,
        vehicleId: v.vehicleId,
        pickupAt: pickupAtIso,
        passengers: v.passengers,
        luggage: v.luggage,
        pickupAddress: pickup.address,
        pickupPlaceId: pickup.placeId ?? null,
        pickupLat: pickup.location?.lat ?? null,
        pickupLng: pickup.location?.lng ?? null,
        dropoffAddress: dropoff.address,
        dropoffPlaceId: dropoff.placeId ?? null,
        dropoffLat: dropoff.location?.lat ?? null,
        dropoffLng: dropoff.location?.lng ?? null,
        contactPhone: isAuthed ? v.contactPhone?.trim() : null,
        stops: (v.route?.stops ?? []).map((s) => ({
          address: s.address,
          placeId: s.placeId ?? null,
          lat: s.location?.lat ?? null,
          lng: s.location?.lng ?? null,
        })),
        distanceMiles: toNumber(v.route.miles ?? v.route.distanceMiles ?? null),
        durationMinutes: toNumber(
          v.route.minutes ?? v.route.durationMinutes ?? null,
        ),
        hoursRequested:
          selectedService.pricingStrategy === "HOURLY"
            ? v.hoursRequested
            : null,
        specialRequests: v.specialRequests || null,
        flightAirline: v.flightAirline || null,
        flightNumber: v.flightNumber || null,
        flightScheduledAt: flightScheduledAtIso,
        flightTerminal: v.flightTerminal || null,
        flightGate: v.flightGate || null,
        guestName: isAuthed ? null : v.guestName.trim(),
        guestEmail: isAuthed ? null : v.guestEmail.trim().toLowerCase(),
        guestPhone: isAuthed ? null : v.guestPhone.trim(),
        eventType: v.eventType || null,
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
          ? `/book/success?id=${encodeURIComponent(String(bookingId))}&t=${encodeURIComponent(String(claimToken))}`
          : `/book/success?id=${encodeURIComponent(String(bookingId))}`
        : "/book/success";
      router.push(href);
    } catch (e: any) {
      toast.error(e?.message ?? "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const inputsKey = `${step}-${serviceTypeId || "none"}-${usesPickupAirport ? "P" : ""}${usesDropoffAirport ? "D" : ""}`;
  const hasFlightInfo =
    flightAirline ||
    flightNumber ||
    flightScheduledAtDate ||
    flightTerminal ||
    flightGate;

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 1068);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // ─── Checklist props (computed from form state) ───
  const hasPickup = usesPickupAirport
    ? Boolean(pickupAirportId)
    : Boolean(route?.pickup?.address);
  const hasDropoff = usesDropoffAirport
    ? Boolean(dropoffAirportId)
    : Boolean(route?.dropoff?.address);

  const hasContactInfo = isAuthed
    ? Boolean(watch("contactPhone")?.trim())
    : Boolean(guestName.trim() && guestEmail.trim() && guestPhone.trim());

  const contactPhone = watch("contactPhone");

  const contactLabel = useMemo(() => {
    if (isAuthed) {
      const phone = contactPhone?.trim();
      if (!phone) return null;
      return formatPhone(phone);
    }
    return guestName.trim() || null;
  }, [isAuthed, contactPhone, guestName]);

  const checklistDateTimeLabel = useMemo(() => {
    if (!pickupAtDate || !pickupAtTime) return null;
    try {
      const [y, m, d] = pickupAtDate.split("-");
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

  const checklistEstimateLabel = useMemo(() => {
    if (!selectedVehicle) return null;
    if (selectedVehicle.callForPricing)
      return selectedVehicle.callForPricingMessage || "Call for pricing";
    if (estimateCents <= 0) return null;
    return `$${centsToUsd(estimateCents)}`;
  }, [selectedVehicle, estimateCents]);

  const checklistNode = (
    <BookingWizardChecklist
      currentStep={step}
      onGoToStep={(s) => setStep(s as 1 | 2 | 3)}
      hasService={Boolean(selectedService)}
      serviceName={selectedService?.name ?? null}
      hasDateTime={Boolean(pickupAtDate && pickupAtTime)}
      dateTimeLabel={checklistDateTimeLabel}
      hasPassengersLuggage={passengers >= 1}
      passengersLuggageLabel={
        passengers >= 1
          ? `${passengers} passenger${passengers !== 1 ? "s" : ""}, ${luggage} bag${luggage !== 1 ? "s" : ""}`
          : null
      }
      hasPickup={hasPickup}
      pickupLabel={shortAddress(
        usesPickupAirport
          ? (serviceAirports.find((a) => a.id === pickupAirportId)?.name ??
              null)
          : (route?.pickup?.address ?? null),
      )}
      hasDropoff={hasDropoff}
      dropoffLabel={shortAddress(
        usesDropoffAirport
          ? (serviceAirports.find((a) => a.id === dropoffAirportId)?.name ??
              null)
          : (route?.dropoff?.address ?? null),
      )}
      hasVehicle={Boolean(selectedVehicle)}
      vehicleName={selectedVehicle?.name ?? null}
      estimateLabel={checklistEstimateLabel}
      hasContactInfo={hasContactInfo}
      contactLabel={contactLabel}
    />
  );

  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          {/* ✅ LEFT COLUMN: Sticky checklist (desktop only) */}
          {!isMobile && (
            <div className={styles.checklistContainer}>{checklistNode}</div>
          )}

          <div className={styles.right}>
            <div ref={wizardTopRef} className={styles.wizardTop} />

            {/* ✅ Mobile checklist (shown above wizard on mobile) */}
            {isMobile && (
              <div className={styles.checklistMobile}>
                <Stepper step={step} />
              </div>
            )}

            <div className={styles.wizard}>
              {/* STEP 1 */}
              {step === 1 ? (
                <div className={`${styles.contentBox} ${styles.stepPane}`}>
                  <h2 className='underline'>1. Trip details</h2>
                  <p className='subheading'>
                    {isMultiLeg
                      ? `Adding ride ${savedLegs.length + 1} to your trip`
                      : "Please provide the details for your trip below"}
                  </p>
                  {isMultiLeg && (
                    <div
                      style={{
                        background: "rgba(0,0,0,0.04)",
                        border: "1px solid rgba(0,0,0,0.1)",
                        borderRadius: 8,
                        padding: "10px 14px",
                        marginBottom: 12,
                        fontSize: "1.4rem",
                      }}
                    >
                      <strong>
                        🗓️ {savedLegs.length} ride
                        {savedLegs.length > 1 ? "s" : ""} added
                      </strong>
                      <span style={{ opacity: 0.7, marginLeft: 8 }}>
                        {savedLegs.some((l) => l.callForPricing)
                          ? `(from $${centsToUsd(savedLegsTotal)}+ so far)`
                          : `($${centsToUsd(savedLegsTotal)} so far)`}
                      </span>
                    </div>
                  )}
                  {hasNoServices ? (
                    <div
                      className='miniNote'
                      style={{ color: "rgba(180,0,0,0.8)" }}
                    >
                      No services are available yet. An admin needs to create at
                      least one service before bookings can be requested.
                    </div>
                  ) : null}

                  <div
                    id='wizard-field-service'
                    style={{
                      marginBottom: 20,
                    }}
                    className={styles.sectionBox}
                  >
                    <label className={labelCx(Boolean(errors.serviceTypeId))}>
                      Service
                    </label>
                    <select
                      value={serviceTypeId}
                      onChange={(e) => {
                        const next = e.target.value;
                        setValue("pickupAirportId", "", { shouldDirty: true });
                        setValue("dropoffAirportId", "", { shouldDirty: true });
                        setValue("route", null, { shouldDirty: true });
                        setValue("vehicleId", "", { shouldDirty: true });
                        setValue("flightAirline", "", { shouldDirty: true });
                        setValue("flightNumber", "", { shouldDirty: true });
                        setValue("flightScheduledAtDate", "", {
                          shouldDirty: true,
                        });
                        setValue("flightScheduledAtTime", "", {
                          shouldDirty: true,
                        });
                        setValue("flightTerminal", "", { shouldDirty: true });
                        setValue("flightGate", "", { shouldDirty: true });
                        setValue("serviceTypeId", next, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                        clearErrors([
                          "serviceTypeId",
                          "pickupAirportId",
                          "dropoffAirportId",
                          "route",
                          "vehicleId",
                        ]);
                        const svc = services.find((s) => s.id === next);
                        if (svc?.pricingStrategy === "HOURLY") {
                          setValue(
                            "hoursRequested",
                            Math.max(getValues("hoursRequested") || 2, 2),
                            { shouldDirty: true, shouldValidate: true },
                          );
                        }
                      }}
                      // className='input emptySmall'
                      className='selectBorder emptySmall'
                      disabled={hasNoServices}
                    >
                      <option value=''>Select a service...</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div id='wizard-field-datetime' className={styles.sectionBox}>
                    {" "}
                    <label
                      className={labelCx(
                        Boolean(errors.pickupAtDate) ||
                          Boolean(errors.pickupAtTime),
                      )}
                    >
                      Pickup date & time
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
                    <div className='miniNote' style={{ marginTop: 8 }}>
                      🕐 All times are in {companyTimezoneLabel}
                    </div>
                    {pickupTooSoon && (
                      <div
                        className='miniNote'
                        style={{
                          color: "rgba(180,0,0,0.85)",
                          marginTop: 8,
                          fontWeight: 700,
                          fontSize: 16,
                          letterSpacing: "normal",
                          lineHeight: 1.2,
                        }}
                      >
                        Bookings must be made at least 36 hours in advance.
                        Please choose a later date or time.
                      </div>
                    )}
                  </div>
                  <div
                    id='wizard-field-passengers-luggage'
                    className={styles.sectionBox}
                  >
                    <Grid2>
                      <div style={{ display: "grid", gap: 20 }}>
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
                          {Array.from({ length: 56 }, (_, i) => i + 1).map(
                            (n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                      <div style={{ display: "grid", gap: 20 }}>
                        <label className={labelCx(Boolean(errors.luggage))}>
                          Luggage
                        </label>
                        <select
                          value={luggage}
                          onChange={(e) => {
                            setValue("luggage", Number(e.target.value), {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                            clearErrors("luggage");
                          }}
                          className='selectBorder emptySmall'
                        >
                          <option value={0}>Select...</option>
                          {Array.from({ length: 56 }, (_, i) => i + 1).map(
                            (n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                    </Grid2>
                  </div>
                  <div className={styles.pickupDropoffContainer}>
                    <div id='wizard-field-pickup' className={styles.sectionBox}>
                      <label
                        className={`cardTitle h5${usesPickupAirport ? (errors.pickupAirportId ? " redBorder" : "") : pickupLabelRed ? " redBorder" : ""}`}
                      >
                        {usesPickupAirport ? "Pickup airport" : "Pickup"}
                      </label>
                      {usesPickupAirport ? (
                        <select
                          value={pickupAirportId}
                          onChange={(e) => {
                            const id = e.target.value;
                            setValue("pickupAirportId", id, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                            clearErrors("pickupAirportId");
                            applyAirportToRoute("pickup", id);
                          }}
                          className='selectBorder emptySmall'
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
                          key={`pickup-input-${step}`}
                          ref={pickupInputRef}
                          placeholder='Enter pickup address'
                          autoComplete='off'
                          className='input emptySmall'
                          defaultValue={route?.pickup?.address ?? ""}
                        />
                      )}
                    </div>

                    {/* STOPS SECTION */}
                    {(route?.stops?.length ?? 0) > 0 && (
                      <div className={styles.stopsListWizard}>
                        {route?.stops?.map((stop, index) => (
                          <div key={stop.id} className={styles.stopRowWizard}>
                            <div className={styles.stopBadgeWizard}>
                              {index + 1}
                            </div>
                            <input
                              type='text'
                              placeholder={`Stop ${index + 1} address...`}
                              defaultValue={stop.address}
                              className='input emptySmall'
                              style={{ flex: 1 }}
                              ref={(el) => {
                                if (el && window.google?.maps?.places) {
                                  const existingAC = (el as any).__stopAC;
                                  if (!existingAC) {
                                    const ac =
                                      new window.google.maps.places.Autocomplete(
                                        el,
                                        {
                                          fields: [
                                            "place_id",
                                            "formatted_address",
                                            "geometry",
                                          ],
                                          componentRestrictions: {
                                            country: "us",
                                          },
                                        },
                                      );
                                    ac.addListener("place_changed", () => {
                                      const place = ac.getPlace();
                                      const loc = place?.geometry?.location;
                                      if (
                                        !place?.place_id ||
                                        !place?.formatted_address ||
                                        !loc
                                      )
                                        return;

                                      const currentRoute = getValues("route");
                                      const currentStops = [
                                        ...(currentRoute?.stops ?? []),
                                      ];
                                      const stopIdx = currentStops.findIndex(
                                        (s) => s.id === stop.id,
                                      );

                                      if (stopIdx >= 0) {
                                        currentStops[stopIdx] = {
                                          ...currentStops[stopIdx],
                                          address: String(
                                            place.formatted_address,
                                          ),
                                          placeId: String(place.place_id),
                                          location: {
                                            lat: loc.lat(),
                                            lng: loc.lng(),
                                          },
                                        };

                                        setValue(
                                          "route",
                                          {
                                            pickup:
                                              currentRoute?.pickup ?? null,
                                            dropoff:
                                              currentRoute?.dropoff ?? null,
                                            stops: currentStops,
                                            miles: null,
                                            minutes: null,
                                            distanceMiles: null,
                                            durationMinutes: null,
                                          },
                                          {
                                            shouldDirty: true,
                                            shouldValidate: true,
                                          },
                                        );
                                      }
                                    });
                                    (el as any).__stopAC = ac;
                                  }
                                }
                              }}
                            />
                            <button
                              type='button'
                              onClick={() => {
                                const currentRoute = getValues("route");
                                const newStops = (
                                  currentRoute?.stops ?? []
                                ).filter((s) => s.id !== stop.id);
                                setValue(
                                  "route",
                                  {
                                    pickup: currentRoute?.pickup ?? null,
                                    dropoff: currentRoute?.dropoff ?? null,
                                    stops: newStops,
                                    miles: null,
                                    minutes: null,
                                    distanceMiles: null,
                                    durationMinutes: null,
                                  },
                                  { shouldDirty: true, shouldValidate: true },
                                );
                              }}
                              className={styles.removeStopBtnWizard}
                              title='Remove stop'
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ADD STOP BUTTON */}
                    <button
                      type='button'
                      onClick={() => {
                        const currentRoute = getValues("route");
                        const newStop = {
                          id: `stop-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                          address: "",
                          placeId: "",
                          location: { lat: 0, lng: 0 },
                        };
                        setValue(
                          "route",
                          {
                            pickup: currentRoute?.pickup ?? null,
                            dropoff: currentRoute?.dropoff ?? null,
                            stops: [...(currentRoute?.stops ?? []), newStop],
                            miles: currentRoute?.miles ?? null,
                            minutes: currentRoute?.minutes ?? null,
                            distanceMiles: currentRoute?.distanceMiles ?? null,
                            durationMinutes:
                              currentRoute?.durationMinutes ?? null,
                          },
                          { shouldDirty: true, shouldValidate: true },
                        );
                      }}
                      className={styles.addStopBtnWizard}
                    >
                      <span>➕</span> Add a stop
                      <span className={styles.addStopFeeWizard}>
                        (+$15.00 per stop)
                      </span>
                    </button>

                    <div
                      id='wizard-field-dropoff'
                      className={styles.sectionBox}
                    >
                      <label
                        className={`cardTitle h5${usesDropoffAirport ? (errors.dropoffAirportId ? " redBorder" : "") : dropoffLabelRed ? " redBorder" : ""}`}
                      >
                        {usesDropoffAirport ? "Dropoff airport" : "Dropoff"}
                      </label>
                      {usesDropoffAirport ? (
                        <select
                          value={dropoffAirportId}
                          onChange={(e) => {
                            const id = e.target.value;
                            setValue("dropoffAirportId", id, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                            clearErrors("dropoffAirportId");
                            applyAirportToRoute("dropoff", id);
                          }}
                          className='selectBorder emptySmall'
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
                          key={`dropoff-input-${step}`}
                          ref={dropoffInputRef}
                          placeholder='Enter dropoff address'
                          autoComplete='off'
                          className='input emptySmall'
                          defaultValue={route?.dropoff?.address ?? ""}
                        />
                      )}
                    </div>
                  </div>

                  {/* Stop surcharge info */}
                  {(route?.stops?.length ?? 0) > 0 && (
                    <div className={styles.stopSurchargeInfo}>
                      <span>
                        🛑 {route?.stops?.length} extra stop
                        {(route?.stops?.length ?? 0) > 1 ? "s" : ""}
                      </span>
                      <span className={styles.stopSurchargeAmount}>
                        +$
                        {(((route?.stops?.length ?? 0) * 1500) / 100).toFixed(
                          2,
                        )}{" "}
                        surcharge
                      </span>
                    </div>
                  )}

                  {/* ✅ ROUTE PICKER — now inline under dropoff */}
                  <div className={styles.routePickerInline}>
                    <Controller
                      name='route'
                      control={control}
                      rules={{
                        validate: (v) => {
                          if (!v?.pickup || !v?.dropoff)
                            return "Please select pickup and dropoff.";
                          if (
                            selectedService?.pricingStrategy ===
                            "POINT_TO_POINT"
                          ) {
                            const miles = toNumber(
                              v.miles ?? v.distanceMiles ?? null,
                            );
                            if (!miles || miles <= 0)
                              return "Route estimate missing (miles). Please re-check the route.";
                          }
                          return true;
                        },
                      }}
                      render={({ field }) => (
                        <RoutePicker
                          value={field.value}
                          onChange={(next) => {
                            const prev = getValues("route");
                            if (routeEquals(prev, next)) return;
                            field.onChange(next);
                            clearErrors("route");
                          }}
                          pickupInputRef={pickupInputRef}
                          dropoffInputRef={dropoffInputRef}
                          inputsKey={inputsKey}
                        />
                      )}
                    />
                  </div>

                  {selectedService?.pricingStrategy === "HOURLY" ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      <label
                        className={labelCx(Boolean(errors.hoursRequested))}
                      >
                        Hours
                      </label>
                      <input
                        type='number'
                        min={1}
                        step={1}
                        value={hoursRequested}
                        onChange={(e) => {
                          setValue("hoursRequested", Number(e.target.value), {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          clearErrors("hoursRequested");
                        }}
                        className='input emptySmall'
                      />
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        Vehicle minimum applies after you choose a vehicle
                        category.
                      </div>
                    </div>
                  ) : null}

                  {selectedService?.pricingStrategy === "HOURLY" ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      <label className='cardTitle h5'>
                        Event type (optional)
                      </label>
                      <select
                        value={
                          watch("eventType")?.startsWith("Other:")
                            ? "Other"
                            : watch("eventType")
                        }
                        onChange={(e) =>
                          setValue("eventType", e.target.value, {
                            shouldDirty: true,
                          })
                        }
                        className='selectBorder emptySmall'
                      >
                        <option value=''>Select...</option>
                        <option value='Wedding'>Wedding</option>
                        <option value='Corporate'>Corporate</option>
                        <option value='Night Out'>Night Out</option>
                        <option value='Other'>Other</option>
                      </select>
                      {(watch("eventType") === "Other" ||
                        watch("eventType")?.startsWith("Other:")) && (
                        <input
                          defaultValue=''
                          onChange={(e) =>
                            setValue(
                              "eventType",
                              e.target.value
                                ? `Other: ${e.target.value}`
                                : "Other",
                              { shouldDirty: true },
                            )
                          }
                          className='input emptySmall'
                          placeholder='Describe the event...'
                        />
                      )}
                    </div>
                  ) : null}

                  {/* Flight Information Section */}
                  {isAirportService && (
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
                          <span style={{ marginRight: 8 }}>✈️</span>
                          Flight Information{" "}
                          <span style={{ fontWeight: 400, opacity: 0.7 }}>
                            (optional)
                          </span>
                        </div>
                        <p
                          className='miniNote'
                          style={{ marginBottom: 16, marginTop: 8 }}
                        >
                          {usesPickupAirport
                            ? "Provide your flight details so we can monitor for delays and adjust your pickup time if needed."
                            : "Provide your flight details so your driver knows which terminal to drop you off at."}
                        </p>
                        <div style={{ display: "grid", gap: 8 }}>
                          <label className='cardTitle h5'>Airline</label>
                          <AirlineSelect
                            value={flightAirline}
                            onChange={(name) =>
                              setValue("flightAirline", name, {
                                shouldDirty: true,
                              })
                            }
                            onAirlineCodeSelected={(iataCode) => {
                              const current = flightNumber
                                .replace(/\s+/g, "")
                                .toUpperCase();
                              if (!current || /^[A-Z]{2}$/.test(current)) {
                                setValue("flightNumber", iataCode, {
                                  shouldDirty: true,
                                });
                              } else if (/^[A-Z]{2}\d/.test(current)) {
                                const digits = current.replace(/^[A-Z]{2}/, "");
                                setValue("flightNumber", iataCode + digits, {
                                  shouldDirty: true,
                                });
                              } else {
                                setValue("flightNumber", iataCode + current, {
                                  shouldDirty: true,
                                });
                              }
                            }}
                          />
                        </div>
                        <FlightLookupInput
                          flightNumber={flightNumber}
                          flightDate={pickupAtDate}
                          airportLeg={usesPickupAirport ? "PICKUP" : "DROPOFF"}
                          onFlightNumberChange={(val) =>
                            setValue("flightNumber", val, {
                              shouldDirty: true,
                            })
                          }
                          onFlightFound={(data) => {
                            if (data.airline) {
                              setValue("flightAirline", data.airline, {
                                shouldDirty: true,
                              });
                            }
                            if (data.terminal) {
                              setValue("flightTerminal", data.terminal, {
                                shouldDirty: true,
                              });
                            }
                            if (data.scheduledDate) {
                              setValue(
                                "flightScheduledAtDate",
                                data.scheduledDate,
                                { shouldDirty: true },
                              );
                            }
                            if (data.scheduledTime) {
                              setValue(
                                "flightScheduledAtTime",
                                data.scheduledTime,
                                { shouldDirty: true },
                              );
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <div className={styles.btnContainer}>
                      <button
                        type='button'
                        onClick={goStep2}
                        className='primaryBtn'
                        disabled={hasNoServices}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* STEP 2 */}
              {step === 2 ? (
                <div id='wizard-field-vehicle' className={styles.stepPane}>
                  <h2 className='underline'>2. Choose a vehicle</h2>
                  <p className='subheading'>Choose a vehicle category</p>
                  <br />
                  <div className={styles.sectionBox}>
                    <label className={labelCx(Boolean(errors.vehicleId))}>
                      Vehicle category
                    </label>
                    <div style={{ display: "grid", gap: 10 }}>
                      {filteredVehicles.map((v) => {
                        const isSelected = v.id === vehicleId;
                        const rowQuote = selectedService
                          ? calcQuoteCents({
                              pricingStrategy: toStrategy(
                                selectedService.pricingStrategy,
                              ),
                              distanceMiles:
                                selectedService.pricingStrategy ===
                                "POINT_TO_POINT"
                                  ? distanceMiles
                                  : null,
                              durationMinutes:
                                selectedService.pricingStrategy ===
                                "POINT_TO_POINT"
                                  ? durationMinutes
                                  : null,
                              hoursRequested:
                                selectedService.pricingStrategy === "HOURLY"
                                  ? hoursRequested
                                  : null,
                              stopCount: route?.stops?.length ?? 0,
                              fees: (selectedService.fees ?? []).map((f) => ({
                                label: f.label,
                                amountCents: f.amountCents,
                              })),
                              vehicleMinHours: v.minHours ?? 0,
                              serviceMinHours: selectedService.minHours ?? 0,
                              serviceMinFareCents: selectedService.minFareCents,
                              serviceBaseFeeCents: selectedService.baseFeeCents,
                              servicePerMileCents: selectedService.perMileCents,
                              servicePerMinuteCents:
                                selectedService.perMinuteCents,
                              servicePerHourCents: selectedService.perHourCents,
                              vehicleBaseFareCents: v.baseFareCents ?? 0,
                              vehiclePerMileCents: v.perMileCents ?? 0,
                              vehiclePerMinuteCents: v.perMinuteCents ?? 0,
                              vehiclePerHourCents: v.perHourCents ?? 0,
                            })
                          : null;
                        const rowEstimateCents = rowQuote?.totalCents ?? 0;
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
                              setValue("vehicleId", v.id, {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                              clearErrors("vehicleId");
                              if (
                                selectedService?.pricingStrategy === "HOURLY"
                              ) {
                                setValue(
                                  "hoursRequested",
                                  Math.max(
                                    hoursRequested || 1,
                                    v.minHours || 0,
                                  ),
                                  { shouldDirty: true, shouldValidate: true },
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
                              <div
                                className='emptyTitleSmall'
                                style={{ textAlign: "right", width: "100%" }}
                              >
                                {v.callForPricing
                                  ? v.callForPricingMessage ||
                                    "Call for pricing"
                                  : `$${centsToUsd(rowEstimateCents)}`}
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
                      {filteredVehicles.length === 0 && passengers > 0 && (
                        <div className='miniNote' style={{ marginTop: 8 }}>
                          No vehicles available for {passengers} passengers.
                          Please adjust your party size or{" "}
                          <a href='tel:+4803004885' className='inlineLink'>
                            contact us
                          </a>{" "}
                          for a custom quote.
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      marginTop: 20,
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
                      onClick={goStep3}
                      className='primaryBtn'
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}

              {/* STEP 3 */}
              {step === 3 ? (
                <div
                  className={styles.stepPane}
                  style={{ display: "grid", gap: 30 }}
                >
                  <h2 className='underline'>3. Confirm</h2>
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
                          ? `${pickupAtDate} @ ${pickupAtTime} (${companyTimezoneLabel})`
                          : "—"
                      }
                    />
                    <SummaryRow label='Passengers' value={String(passengers)} />
                    <SummaryRow label='Luggage' value={String(luggage)} />
                    <SummaryRow
                      label='Phone'
                      value={
                        isAuthed
                          ? formatPhone(watch("contactPhone")) || "—"
                          : formatPhone(guestPhone) || "—"
                      }
                    />
                    <SummaryRow
                      label='Pickup'
                      value={route?.pickup?.address ?? "—"}
                    />
                    <SummaryRow
                      label='Dropoff'
                      value={route?.dropoff?.address ?? "—"}
                    />
                    {(route?.stops?.length ?? 0) > 0 && (
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
                            🛑 Extra Stops ({route?.stops?.length})
                          </div>
                        </div>
                        {route?.stops?.map((stop, index) => (
                          <SummaryRow
                            key={stop.id}
                            label={`Stop ${index + 1}`}
                            value={stop.address || "—"}
                          />
                        ))}
                        <SummaryRow
                          label='Stop surcharge'
                          value={`$${(((route?.stops?.length ?? 0) * 1500) / 100).toFixed(2)}`}
                        />
                        <SummaryRow
                          label='Est. wait time'
                          value={`+${(route?.stops?.length ?? 0) * 5} min`}
                        />
                      </>
                    )}
                    {(selectedService?.fees?.length ?? 0) > 0 && (
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
                            💰 Service Fees
                          </div>
                        </div>
                        {selectedService?.fees?.map((fee) => (
                          <SummaryRow
                            key={fee.id}
                            label={fee.label}
                            value={`$${(fee.amountCents / 100).toFixed(2)}`}
                          />
                        ))}
                      </>
                    )}
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
                        {watch("eventType") && (
                          <SummaryRow
                            label='Event type'
                            value={watch("eventType")}
                          />
                        )}
                      </>
                    ) : null}
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
                          <SummaryRow label='Airline' value={flightAirline} />
                        )}
                        {flightNumber && (
                          <SummaryRow
                            label='Flight Number'
                            value={flightNumber}
                          />
                        )}
                        {flightScheduledAtDate && (
                          <SummaryRow
                            label={
                              usesPickupAirport
                                ? "Arrival Time"
                                : "Departure Time"
                            }
                            value={(() => {
                              try {
                                const [y, m, d] =
                                  flightScheduledAtDate.split("-");
                                const datePart = `${m}/${d}/${y.slice(2)}`;
                                if (!flightScheduledAtTime) return datePart;
                                const [hStr, mStr] =
                                  flightScheduledAtTime.split(":");
                                let h = parseInt(hStr, 10);
                                const ampm = h >= 12 ? "PM" : "AM";
                                if (h === 0) h = 12;
                                else if (h > 12) h -= 12;
                                return `${datePart} @ ${h}:${mStr}${ampm}`;
                              } catch {
                                return flightScheduledAtDate;
                              }
                            })()}
                          />
                        )}
                        {flightTerminal && (
                          <SummaryRow label='Terminal' value={flightTerminal} />
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
                    <SummaryRow
                      label='Estimate'
                      value={
                        selectedVehicle?.callForPricing
                          ? "To be quoted"
                          : `$${centsToUsd(estimateCents)}`
                      }
                      strong
                    />
                    {selectedVehicle?.callForPricing ? (
                      <div className='miniNote'>
                        This vehicle requires a custom quote. Submit your
                        request and we&apos;ll contact you with pricing, or call
                        us directly.
                      </div>
                    ) : (
                      <div className='miniNote'>
                        This is an estimate. Dispatch may adjust for special
                        dates, late night, extra stops, etc.
                        {(route?.stops?.length ?? 0) > 0 && (
                          <strong>
                            {" "}
                            Includes $
                            {(
                              ((route?.stops?.length ?? 0) * 1500) /
                              100
                            ).toFixed(2)}{" "}
                            surcharge for {route?.stops?.length ?? 0} extra stop
                            {(route?.stops?.length ?? 0) > 1 ? "s" : ""}.
                          </strong>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ─── Saved legs summary (multi-day trip) ─── */}
                  {savedLegs.length > 0 && (
                    <div
                      className='box'
                      style={{ background: "rgba(0,0,0,0.02)" }}
                    >
                      <div
                        className='cardTitle h5'
                        style={{ marginBottom: 12 }}
                      >
                        <span style={{ marginRight: 10 }}>🗓️</span> Your
                        multi-day trip ({savedLegs.length + 1} rides)
                      </div>
                      {savedLegs.map((leg, idx) => (
                        <div
                          key={leg.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            padding: "10px 0",
                            borderBottom: "1px solid rgba(0,0,0,0.08)",
                            gap: 12,
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{ fontWeight: 600, fontSize: "1.4rem" }}
                            >
                              Ride {idx + 1}: {leg.serviceName}
                            </div>
                            <div
                              style={{
                                fontSize: "1.3rem",
                                opacity: 0.7,
                                marginTop: 2,
                              }}
                            >
                              {leg.pickupAtDate} @ {leg.pickupAtTime} ·{" "}
                              {leg.vehicleName}
                            </div>
                            <div
                              style={{
                                fontSize: "1.2rem",
                                opacity: 0.6,
                                marginTop: 2,
                              }}
                            >
                              {shortAddress(leg.pickupAddress, 45)} →{" "}
                              {shortAddress(leg.dropoffAddress, 45)}
                            </div>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              flexShrink: 0,
                            }}
                          >
                            <span
                              style={{ fontWeight: 700, fontSize: "1.4rem" }}
                            >
                              {leg.callForPricing
                                ? "TBD"
                                : `$${centsToUsd(leg.estimateCents)}`}
                            </span>
                            <button
                              type='button'
                              onClick={() => setRemoveLegId(leg.id)}
                              title='Remove this ride'
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                fontSize: 16,
                                opacity: 0.5,
                                padding: "2px 6px",
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                      <div
                        style={{
                          padding: "10px 0",
                          fontWeight: 600,
                          fontSize: "1.4rem",
                        }}
                      >
                        Ride {savedLegs.length + 1}:{" "}
                        {selectedService?.name ?? "—"}{" "}
                        <span style={{ fontWeight: 400, opacity: 0.7 }}>
                          (this ride)
                        </span>
                        <span style={{ float: "right", fontWeight: 700 }}>
                          {selectedVehicle?.callForPricing
                            ? "TBD"
                            : `$${centsToUsd(estimateCents)}`}
                        </span>
                      </div>
                      <div
                        style={{
                          borderTop: "2px solid rgba(0,0,0,0.12)",
                          marginTop: 8,
                          paddingTop: 12,
                          display: "flex",
                          justifyContent: "space-between",
                          fontWeight: 700,
                          fontSize: "1.6rem",
                        }}
                      >
                        <span>Trip total estimate</span>
                        <span>
                          {savedLegs.some((l) => l.callForPricing) ||
                          selectedVehicle?.callForPricing
                            ? `From $${centsToUsd(groupEstimateTotal)}*`
                            : `$${centsToUsd(groupEstimateTotal)}`}
                        </span>
                      </div>
                    </div>
                  )}

                  {!isAuthed ? (
                    <div
                      id='wizard-field-contact'
                      className={styles.sectionBox}
                    >
                      <div style={{ display: "grid", gap: 20 }}>
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
                      <Grid2>
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
                      </Grid2>
                    </div>
                  ) : (
                    // For authenticated users:
                    <div
                      id='wizard-field-contact'
                      className={styles.sectionBox}
                    >
                      <div style={{ display: "grid", gap: 8 }}>
                        <label
                          className={labelCx(Boolean(errors.contactPhone))}
                        >
                          Phone number for this trip
                        </label>
                        <input
                          value={formatPhone(watch("contactPhone")) || ""}
                          onChange={(e) => {
                            // Store raw digits only
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
                          Your driver will use this number to contact you about
                          pickup.
                          {phoneWasPrefilled.current &&
                            watch("contactPhone")?.trim() && (
                              <span style={{ marginLeft: 6, fontWeight: 600 }}>
                                (already on file)
                              </span>
                            )}
                        </p>
                      </div>
                    </div>
                  )}

                  <div style={{ display: "grid", gap: 8 }}>
                    <div className='cardTitle h5'>
                      Special requests (optional)
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
                      placeholder='Child seat, wheelchair needs, extra stops, meet & greet...'
                    />
                  </div>

                  {/* "Add another ride" button */}
                  <button
                    type='button'
                    onClick={addAnotherRide}
                    className='secondaryBtn'
                    disabled={submitting || submitted}
                    style={{ width: "100%", textAlign: "center" }}
                  >
                    ➕ Add another ride to this trip
                  </button>
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
                          : isMultiLeg
                            ? `Submit ${savedLegs.length + 1} rides`
                            : "Submit request"}
                    </button>
                  </div>
                </div>
              ) : null}
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
