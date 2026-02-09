/* eslint-disable react-hooks/exhaustive-deps */
// src/components/admin/AdminNewBookingWizard/AdminNewBookingWizard.tsx
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import styles from "./AdminNewBookingWizard.module.css";
import stepperStyles from "@/components/BookingPage/Stepper/Stepper.module.css";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import RoutePicker, {
  RoutePickerPlace,
  RoutePickerStop,
  RoutePickerValue,
} from "@/components/BookingPage/RoutePicker/RoutePicker";
import BookingDateTimePicker from "@/components/BookingPage/BookingDateTimePicker/BookingDateTimePicker";
import Grid2 from "@/components/BookingPage/Grid2/Grid2";
import SummaryRow from "@/components/BookingPage/SummaryRow/SummaryRow";

import AssignBookingForm from "@/components/admin/AssignBookingForm/AssignBookingForm";
import ApprovePriceForm from "@/components/admin/ApprovePriceForm/ApprovePriceForm";
import SendPaymentLinkButton from "@/components/admin/SendPaymentLinkButton/SendPaymentLinkButton";

import { adminCreateBooking } from "../../../../actions/bookings/adminCreateBooking";
import type { AdminCreateBookingStatus } from "../../../../actions/bookings/adminCreateBooking";
import { adminSearchUsers } from "../../../../actions/admin/users/adminSearchUsers";

import { adminGetBookingWizardData } from "../../../../actions/bookings/adminGetBookingWizardData";
import { adminCreateManualPaymentIntent } from "../../../../actions/bookings/adminCreateManualPaymentIntent";
import { adminUpdateBookingStatus } from "../../../../actions/bookings/adminUpdateBookingStatus";

import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

import { calcQuoteCents } from "@/lib/pricing/calcQuote";
import Link from "next/link";
import FlightLookupInput from "@/components/BookingPage/FlightLookupInput/FlightLookupInput";
import AirlineSelect from "@/components/BookingPage/AirlineSelect/AirlineSelect";
import BookingWizardChecklist from "@/components/BookingPage/BookingWizardChecklist/BookingWizardChecklist";

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

// ✅ New admin step order:
// 1 Trip → 2 Vehicle → 3 Price → 4 Assign (+ status) → 5 Confirm → 6 Payment
type AdminWizardStep = 1 | 2 | 3 | 4 | 5 | 6;

type UserLite = {
  id: string;
  name: string | null;
  email: string;
  emailVerified: boolean;
  phone: string | null;
};

type DriverLite = { id: string; name: string | null; email: string };

type VehicleUnitLite = {
  id: string;
  name: string;
  plate: string | null;
  categoryId: string | null;
};

type CorporateAccountDTO = {
  id: string;
  name: string;
  discountPercent: number | null;
  billingCycle: string;
  paymentTerms: string;
  status: string;
  passengers: CorporatePassengerDTO[];
};

type CorporatePassengerDTO = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
};

type WizardBookingData = {
  bookingId: string;
  currency: string;
  subtotalCents: number;
  feesCents: number;
  taxesCents: number;
  totalCents: number;
  paymentStatus: string | null;
  checkoutUrl: string | null;

  // These may exist, but your API might return a nested assignment instead.
  assignmentDriverId: string | null;
  assignmentVehicleUnitId: string | null;
} & Record<string, any>;

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

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

// ✅ Now uses calcQuoteCents (single source of truth)
function estimateTotalCents(args: {
  service: ServiceTypeDTO;
  vehicle: VehicleDTO | null;
  distanceMiles: number | null;
  durationMinutes: number | null;
  hoursRequested: number | null;
  stopCount?: number;
}) {
  const {
    service,
    vehicle,
    distanceMiles,
    durationMinutes,
    hoursRequested,
    stopCount = 0,
  } = args;

  const q = calcQuoteCents({
    pricingStrategy: service.pricingStrategy as any,

    distanceMiles,
    durationMinutes,
    hoursRequested:
      service.pricingStrategy === "HOURLY" ? hoursRequested : null,
    stopCount,

    vehicleMinHours: vehicle?.minHours ?? 0,

    serviceMinFareCents: service.minFareCents,
    serviceBaseFeeCents: service.baseFeeCents,
    servicePerMileCents: service.perMileCents,
    servicePerMinuteCents: service.perMinuteCents,
    servicePerHourCents: service.perHourCents,

    vehicleBaseFareCents: vehicle?.baseFareCents ?? 0,
    vehiclePerMileCents: vehicle?.perMileCents ?? 0,
    vehiclePerMinuteCents: vehicle?.perMinuteCents ?? 0,
    vehiclePerHourCents: vehicle?.perHourCents ?? 0,
  });

  return q.totalCents;
}

function statusLabel(s: AdminCreateBookingStatus) {
  switch (s) {
    case "PENDING_REVIEW":
      return "Pending review";
    case "PENDING_PAYMENT":
      return "Pending payment";
    case "CONFIRMED":
      return "Confirmed";
    case "DRAFT":
      return "Draft";
    default:
      return String(s);
  }
}

/**
 * ✅ Robust assignment extractors:
 * Your adminGetBookingWizardData may return assignment data in different shapes.
 * These helpers try multiple common keys.
 */
function getAssignedDriverIdFromBookingData(bd: any): string | null {
  const v =
    bd?.assignmentDriverId ??
    bd?.assignedDriverId ??
    bd?.driverId ??
    bd?.assignment?.driverId ??
    bd?.assignment?.driver_id ??
    bd?.assignment?.driver?.id ??
    bd?.assignment?.driver?.userId ??
    null;
  return typeof v === "string" && v.trim() ? v : v != null ? String(v) : null;
}

function getAssignedUnitIdFromBookingData(bd: any): string | null {
  const v =
    bd?.assignmentVehicleUnitId ??
    bd?.assignedVehicleUnitId ??
    bd?.vehicleUnitId ??
    bd?.assignment?.vehicleUnitId ??
    bd?.assignment?.vehicle_unit_id ??
    bd?.assignment?.vehicleUnit?.id ??
    null;
  return typeof v === "string" && v.trim() ? v : v != null ? String(v) : null;
}

function getAssignedDriverObjectFromBookingData(bd: any): any | null {
  return bd?.assignment?.driver ?? bd?.driver ?? null;
}

function getAssignedUnitObjectFromBookingData(bd: any): any | null {
  return bd?.assignment?.vehicleUnit ?? bd?.vehicleUnit ?? null;
}

export default function AdminNewBookingWizard({
  serviceTypes,
  vehicles,
  blackoutsByYmd,
  drivers,
  vehicleUnits,
  corporateAccounts = [],
}: {
  serviceTypes: ServiceTypeDTO[];
  vehicles: VehicleDTO[];
  blackoutsByYmd: Record<string, boolean>;
  drivers: DriverLite[];
  vehicleUnits: VehicleUnitLite[];
  corporateAccounts?: CorporateAccountDTO[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<AdminWizardStep>(1);

  // booking created right before Price step
  const [bookingId, setBookingId] = useState<string>("");
  const [bookingData, setBookingData] = useState<WizardBookingData | null>(
    null,
  );
  const [bookingDataLoading, setBookingDataLoading] = useState(false);

  const [customerKind, setCustomerKind] = useState<
    "account" | "guest" | "corporate"
  >("account");

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
  const [passengers, setPassengers] = useState<number>(0);
  const [luggage, setLuggage] = useState<number>(0);
  const [hoursRequested, setHoursRequested] = useState<number>(2);

  const [route, setRoute] = useState<RoutePickerValue | null>(null);
  const pickupInputRef = useRef<HTMLInputElement | null>(null);
  const dropoffInputRef = useRef<HTMLInputElement | null>(null);

  const [vehicleId, setVehicleId] = useState<string>("");
  const [specialRequests, setSpecialRequests] = useState<string>("");

  const [pickupAirportId, setPickupAirportId] = useState<string>("");
  const [dropoffAirportId, setDropoffAirportId] = useState<string>("");

  // ✅ Status is chosen on Assign step (no Draft option shown)
  const [bookingStatus, setBookingStatus] =
    useState<AdminCreateBookingStatus>("PENDING_REVIEW");
  const [statusSaving, setStatusSaving] = useState(false);

  // validation attempt flags
  const [attemptTripNext, setAttemptTripNext] = useState(false);
  const [attemptVehicleNext, setAttemptVehicleNext] = useState(false);

  // ✅ Flight info state
  const [flightAirline, setFlightAirline] = useState<string>("");
  const [flightNumber, setFlightNumber] = useState<string>("");
  const [flightTerminal, setFlightTerminal] = useState<string>("");
  const [flightScheduledAtDate, setFlightScheduledAtDate] =
    useState<string>("");
  const [flightScheduledAtTime, setFlightScheduledAtTime] =
    useState<string>("");

  const [eventType, setEventType] = useState<string>("");

  // ─── Corporate booking state ───
  const [corporateAccountId, setCorporateAccountId] = useState<string>("");
  const [corporatePassengerId, setCorporatePassengerId] = useState<string>("");
  const [costCenter, setCostCenter] = useState<string>("");
  const [projectCode, setProjectCode] = useState<string>("");
  const [newPassengerMode, setNewPassengerMode] = useState(false);
  const [newPassengerName, setNewPassengerName] = useState("");
  const [newPassengerEmail, setNewPassengerEmail] = useState("");
  const [newPassengerPhone, setNewPassengerPhone] = useState("");
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
  const isAirportService = usesPickupAirport || usesDropoffAirport;

  // ─── Corporate derived state ───
  const selectedCorporateAccount = useMemo(() => {
    if (!corporateAccountId) return null;
    return corporateAccounts.find((a) => a.id === corporateAccountId) ?? null;
  }, [corporateAccounts, corporateAccountId]);

  const corporatePassengers = selectedCorporateAccount?.passengers ?? [];

  const isCorporateBooking =
    customerKind === "corporate" && Boolean(corporateAccountId);

  // Auto-set status to CONFIRMED for corporate bookings
  useEffect(() => {
    if (isCorporateBooking) {
      setBookingStatus("CONFIRMED");
    }
  }, [isCorporateBooking]);

  // ✅ Get the selected airport's IATA for flight validation
  const selectedAirportIata = useMemo(() => {
    if (usesPickupAirport && pickupAirportId) {
      return (
        serviceAirports.find((a) => a.id === pickupAirportId)?.iata ?? null
      );
    }
    if (usesDropoffAirport && dropoffAirportId) {
      return (
        serviceAirports.find((a) => a.id === dropoffAirportId)?.iata ?? null
      );
    }
    return null;
  }, [
    usesPickupAirport,
    usesDropoffAirport,
    pickupAirportId,
    dropoffAirportId,
    serviceAirports,
  ]);

  // scroll-to-top on step change
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

  const resetCreatedBooking = useCallback(() => {
    if (!bookingId && !bookingData) return;
    if (bookingId) setBookingId("");
    if (bookingData) setBookingData(null);
  }, [bookingId, bookingData]);

  // customerKind switching behavior
  // customerKind switching behavior
  useEffect(() => {
    if (customerKind === "guest") {
      setSelectedUser(null);
      setUserQuery("");
      setUserResults([]);
      setUserSearching(false);
      setCorporateAccountId("");
      setCorporatePassengerId("");
      setCostCenter("");
      setProjectCode("");
      setNewPassengerMode(false);
      setCustomerEmail("");
      setCustomerName("");
      setCustomerPhone("");
      resetCreatedBooking();
      return;
    }

    if (customerKind === "corporate") {
      setSelectedUser(null);
      setUserQuery("");
      setUserResults([]);
      setUserSearching(false);
      setCustomerEmail("");
      setCustomerName("");
      setCustomerPhone("");
      resetCreatedBooking();
      return;
    }

    if (customerKind === "account") {
      setCustomerPhone("");
      setCorporateAccountId("");
      setCorporatePassengerId("");
      setCostCenter("");
      setProjectCode("");
      setNewPassengerMode(false);
      if (selectedUser) {
        setCustomerEmail(selectedUser.email);
        setCustomerName((selectedUser.name ?? "").trim());
      }
    }
  }, [customerKind, selectedUser]);

  // user search
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
      } catch {
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
          stops: prev?.stops ?? [], // ✅ Preserve existing stops
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
        stops: prev?.stops ?? [], // ✅ Preserve existing stops
        miles: null,
        minutes: null,
        distanceMiles: null,
        durationMinutes: null,
      };

      return next;
    });
  }

  // ✅ Robust miles/minutes
  const distanceMiles = toNumber(route?.miles ?? (route as any)?.distanceMiles);
  const durationMinutes = toNumber(
    route?.minutes ?? (route as any)?.durationMinutes,
  );

  // ✅ Quote for selected service/vehicle (also gives billed hours)
  const selectedQuote = useMemo(() => {
    if (!selectedService) return null;

    // ✅ Get stop count from route
    const stopCount = route?.stops?.length ?? 0;

    return calcQuoteCents({
      pricingStrategy: selectedService.pricingStrategy as any,
      distanceMiles,
      durationMinutes,
      hoursRequested:
        selectedService.pricingStrategy === "HOURLY"
          ? toNumber(hoursRequested)
          : null,
      stopCount, // ✅ Add this
      vehicleMinHours: selectedVehicle?.minHours ?? 0,

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
  }, [
    selectedService,
    selectedVehicle,
    distanceMiles,
    durationMinutes,
    hoursRequested,
    route?.stops?.length, // ✅ Add this dependency
  ]);

  const billableHours =
    selectedService?.pricingStrategy === "HOURLY"
      ? (selectedQuote?.billedHours ?? null)
      : null;

  const estimateCents = selectedQuote?.totalCents ?? 0;

  function pickDate(val: string) {
    resetCreatedBooking();
    if (val && blackoutsByYmd[val]) {
      toast.error("That date is blacked out. Please choose another day.");
      return;
    }
    setPickupAtDate(val);
  }

  function selectUser(u: UserLite) {
    resetCreatedBooking();
    setSelectedUser(u);
    setUserResults([]);
    setUserQuery("");
    setCustomerEmail(u.email);
    setCustomerName((u.name ?? "").trim());
  }

  function clearSelectedUser() {
    resetCreatedBooking();
    setSelectedUser(null);
    setCustomerEmail("");
    setCustomerName("");
    setUserQuery("");
    setUserResults([]);
  }

  function computeTripErrors() {
    const e = {
      attachUser: false,
      guestEmail: false,
      guestName: false,
      guestPhone: false,

      corporateAccount: false,
      corporatePassenger: false,

      service: false,
      dateTime: false,

      pickup: false,
      dropoff: false,

      pickupAirport: false,
      dropoffAirport: false,

      airportNotConfigured: false,

      // ✅ New: route distance missing for point-to-point
      routeDistance: false,
    };

    if (customerKind === "account") {
      if (!selectedUser) e.attachUser = true;
    } else if (customerKind === "corporate") {
      if (!corporateAccountId) e.corporateAccount = true;
      if (!corporatePassengerId && !newPassengerMode)
        e.corporatePassenger = true;
      if (newPassengerMode && !newPassengerName.trim())
        e.corporatePassenger = true;
    } else {
      const email = customerEmail.trim().toLowerCase();
      if (!email || !isValidEmail(email)) e.guestEmail = true;
      if (!customerName.trim()) e.guestName = true;
      if (!customerPhone.trim()) e.guestPhone = true;
    }

    if (!selectedService) e.service = true;

    const hasDateTime = Boolean(pickupAtDate) && Boolean(pickupAtTime);
    const dateBlocked = pickupAtDate && blackoutsByYmd[pickupAtDate];
    if (!hasDateTime || dateBlocked) e.dateTime = true;

    if (selectedService) {
      if (
        selectedService.airportLeg !== "NONE" &&
        serviceAirports.length === 0
      ) {
        e.airportNotConfigured = true;
        e.service = true;
      }
      if (usesPickupAirport && !pickupAirportId) e.pickupAirport = true;
      if (usesDropoffAirport && !dropoffAirportId) e.dropoffAirport = true;

      // ✅ If point-to-point, miles must exist (>0)
      if (selectedService.pricingStrategy === "POINT_TO_POINT") {
        const miles = toNumber(route?.miles ?? (route as any)?.distanceMiles);
        if (!miles || miles <= 0) e.routeDistance = true;
      }
    }

    if (!route?.pickup) e.pickup = true;
    if (!route?.dropoff) e.dropoff = true;

    return e;
  }

  function computeVehicleErrors() {
    return { vehicle: !vehicleId };
  }

  const tripErrors = useMemo(() => {
    return attemptTripNext ? computeTripErrors() : ({} as any);
  }, [
    attemptTripNext,
    customerKind,
    selectedUser,
    customerEmail,
    customerName,
    customerPhone,
    corporateAccountId,
    corporatePassengerId,
    newPassengerMode,
    newPassengerName,
    selectedService,
    pickupAtDate,
    pickupAtTime,
    route,
    pickupAirportId,
    dropoffAirportId,
    usesPickupAirport,
    usesDropoffAirport,
    serviceAirports.length,
    blackoutsByYmd,
  ]);

  const vehicleErrors = useMemo(() => {
    return attemptVehicleNext ? computeVehicleErrors() : ({} as any);
  }, [attemptVehicleNext, vehicleId]);

  function tripIsValid() {
    const e = computeTripErrors();
    return !Object.values(e).some(Boolean);
  }

  async function refreshBookingData(id: string) {
    setBookingDataLoading(true);
    try {
      const res = await adminGetBookingWizardData({ bookingId: id });
      if ((res as any)?.error) {
        setBookingData(null);
        return;
      }
      setBookingData((res as any).booking as WizardBookingData);
    } catch {
      setBookingData(null);
    } finally {
      setBookingDataLoading(false);
    }
  }

  /**
   * ✅ Auto-refresh bookingData when entering steps 3-6.
   * This fixes "Assigned driver shows blank" when Assign step saved in DB
   * but bookingData wasn't refreshed before Confirm.
   */
  useEffect(() => {
    if (!bookingId) return;
    if (step >= 3) {
      refreshBookingData(bookingId);
    }
  }, [step, bookingId]);

  async function ensureBookingCreated(): Promise<string | null> {
    if (bookingId) return bookingId;

    // if trip is invalid, bounce back to step 1 with highlights
    if (!tripIsValid()) {
      setAttemptTripNext(true);
      toast.error("Please complete all required fields.");
      setStep(1);
      return null;
    }

    if (!selectedService) {
      setAttemptTripNext(true);
      toast.error("Please complete all required fields.");
      setStep(1);
      return null;
    }

    // ✅ Guard for POINT_TO_POINT miles
    if (selectedService.pricingStrategy === "POINT_TO_POINT") {
      const miles = toNumber(route?.miles ?? (route as any)?.distanceMiles);
      if (!miles || miles <= 0) {
        setAttemptTripNext(true);
        toast.error(
          "Missing route distance. Please re-check the route estimate (miles) before creating the booking.",
        );
        setStep(1);
        return null;
      }
    }

    if (!vehicleId) {
      setAttemptVehicleNext(true);
      toast.error("Please choose a vehicle category.");
      return null;
    }

    if (blackoutsByYmd[pickupAtDate]) {
      setAttemptTripNext(true);
      toast.error("That date is blacked out.");
      setStep(1);
      return null;
    }

    let customerUserId: string | null = null;
    let email = "";

    if (customerKind === "account") {
      if (!selectedUser) {
        setAttemptTripNext(true);
        toast.error("Please complete all required fields.");
        setStep(1);
        return null;
      }
      customerUserId = selectedUser.id;
      email = selectedUser.email.trim().toLowerCase();
    } else if (customerKind === "corporate") {
      if (!corporateAccountId) {
        setAttemptTripNext(true);
        toast.error("Please select a corporate account.");
        setStep(1);
        return null;
      }
      if (!corporatePassengerId && !newPassengerMode) {
        setAttemptTripNext(true);
        toast.error("Please select a passenger.");
        setStep(1);
        return null;
      }
      if (newPassengerMode && !newPassengerName.trim()) {
        setAttemptTripNext(true);
        toast.error("Please enter the passenger name.");
        setStep(1);
        return null;
      }
      // Corporate bookings don't require email — billing goes to account
      email =
        selectedCorporateAccount?.passengers.find(
          (p) => p.id === corporatePassengerId,
        )?.email ?? "";
    } else {
      email = customerEmail.trim().toLowerCase();
      if (
        !email ||
        !isValidEmail(email) ||
        !customerName.trim() ||
        !customerPhone.trim()
      ) {
        setAttemptTripNext(true);
        toast.error("Please complete all required fields.");
        setStep(1);
        return null;
      }
    }

    const pickupAtIso = new Date(
      `${pickupAtDate}T${pickupAtTime}:00`,
    ).toISOString();

    try {
      const pickup = route!.pickup!;
      const dropoff = route!.dropoff!;

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

        // ✅ Add stops
        stops: (route?.stops ?? []).map((s) => ({
          address: s.address,
          placeId: s.placeId ?? null,
          lat: s.location?.lat ?? null,
          lng: s.location?.lng ?? null,
        })),

        distanceMiles: toNumber(route?.miles ?? (route as any)?.distanceMiles),
        durationMinutes: toNumber(
          route?.minutes ?? (route as any)?.durationMinutes,
        ),

        hoursRequested:
          selectedService.pricingStrategy === "HOURLY"
            ? toNumber(hoursRequested)
            : null,
        specialRequests: specialRequests || null,

        // ✅ Flight info
        flightAirline: flightAirline || null,
        flightNumber: flightNumber || null,
        flightScheduledAt:
          flightScheduledAtDate && flightScheduledAtTime
            ? new Date(
                `${flightScheduledAtDate}T${flightScheduledAtTime}:00`,
              ).toISOString()
            : flightScheduledAtDate
              ? new Date(`${flightScheduledAtDate}T00:00:00`).toISOString()
              : null,
        flightTerminal: flightTerminal || null,
        eventType: eventType || null,

        status: bookingStatus,

        customerKind,
        customerUserId,
        customerEmail: email,
        customerName: customerKind === "guest" ? customerName.trim() : null,
        customerPhone: customerKind === "guest" ? customerPhone.trim() : null,

        // Corporate fields
        corporateAccountId:
          customerKind === "corporate" ? corporateAccountId : null,
        corporatePassengerId:
          customerKind === "corporate" && !newPassengerMode
            ? corporatePassengerId
            : null,
        costCenter:
          customerKind === "corporate" && costCenter.trim()
            ? costCenter.trim()
            : null,
        projectCode:
          customerKind === "corporate" && projectCode.trim()
            ? projectCode.trim()
            : null,
        // One-off passenger (not on roster)
        corporateNewPassengerName:
          customerKind === "corporate" && newPassengerMode
            ? newPassengerName.trim()
            : null,
        corporateNewPassengerEmail:
          customerKind === "corporate" && newPassengerMode
            ? newPassengerEmail.trim() || null
            : null,
        corporateNewPassengerPhone:
          customerKind === "corporate" && newPassengerMode
            ? newPassengerPhone.trim() || null
            : null,
      });

      if ((res as any)?.error) {
        toast.error((res as any).error);
        return null;
      }

      const id = String((res as any).bookingId || "");
      if (!id) {
        toast.error("Booking created, but no bookingId returned.");
        return null;
      }

      setBookingId(id);
      toast.success("Booking created.");
      await refreshBookingData(id);

      return id;
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create booking.");
      return null;
    }
  }

  // ✅ IMPORTANT: do NOT include `step` here (it remounts RoutePicker and nukes your bookingId)
  const inputsKey = `${serviceTypeId || "none"}-${customerKind}-${usesPickupAirport ? "P" : ""}${usesDropoffAirport ? "D" : ""}-${pickupAirportId || ""}-${dropoffAirportId || ""}`;

  const filteredVehicleUnits = useMemo(() => {
    if (!vehicleId) return [];
    return (vehicleUnits ?? []).filter((u) => u.categoryId === vehicleId);
  }, [vehicleUnits, vehicleId]);

  // ✅ Use robust extractors so "Assigned driver/unit" doesn't go blank
  const assignedDriverId = useMemo(
    () => getAssignedDriverIdFromBookingData(bookingData),
    [bookingData],
  );
  const assignedUnitId = useMemo(
    () => getAssignedUnitIdFromBookingData(bookingData),
    [bookingData],
  );

  const assignedDriver = useMemo(() => {
    // if API returns driver object, prefer it
    const obj = getAssignedDriverObjectFromBookingData(bookingData);
    if (obj && (obj.id || obj.email || obj.name)) {
      return {
        id: String(obj.id ?? assignedDriverId ?? ""),
        name: obj.name ?? null,
        email: obj.email ?? "",
      } as DriverLite;
    }

    if (!assignedDriverId) return null;
    return (drivers ?? []).find((d) => d.id === assignedDriverId) ?? null;
  }, [bookingData, assignedDriverId, drivers]);

  const assignedUnit = useMemo(() => {
    const obj = getAssignedUnitObjectFromBookingData(bookingData);
    if (obj && (obj.id || obj.name)) {
      return {
        id: String(obj.id ?? assignedUnitId ?? ""),
        name: String(obj.name ?? "Unit"),
        plate: obj.plate ?? null,
        categoryId: obj.categoryId ?? null,
      } as VehicleUnitLite;
    }

    if (!assignedUnitId) return null;
    return (vehicleUnits ?? []).find((u) => u.id === assignedUnitId) ?? null;
  }, [bookingData, assignedUnitId, vehicleUnits]);

  const handleRouteChange = useCallback(
    (v: RoutePickerValue | null) => {
      setRoute((prev) => {
        if (routeEquals(prev, v)) return prev;

        // only reset created booking if one exists
        if (bookingId) {
          setBookingId("");
          setBookingData(null);
        }
        return v;
      });
    },
    [bookingId],
  );

  const handleUserQueryChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      resetCreatedBooking();
      setUserQuery(e.target.value);
    },
    [resetCreatedBooking],
  );

  async function saveStatus(next: AdminCreateBookingStatus) {
    setBookingStatus(next);

    if (!bookingId) return;

    setStatusSaving(true);
    try {
      const res = await adminUpdateBookingStatus({
        bookingId,
        status: next,
      });
      if ((res as any)?.error) {
        toast.error((res as any).error);
        return;
      }
      toast.success("Status updated.");
      await refreshBookingData(bookingId);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update status.");
    } finally {
      setStatusSaving(false);
    }
  }

  const STATUS_OPTIONS: Array<{
    value: AdminCreateBookingStatus;
    label: string;
  }> = [
    {
      value: "PENDING_REVIEW" as AdminCreateBookingStatus,
      label: "Pending review",
    },
    {
      value: "PENDING_PAYMENT" as AdminCreateBookingStatus,
      label: "Pending payment",
    },
    { value: "CONFIRMED" as AdminCreateBookingStatus, label: "Confirmed" },
  ];

  const [stops, setStops] = useState<RoutePickerStop[]>([]);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 1268);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  function shortAddress(addr: string | null | undefined, maxLen = 35): string {
    if (!addr) return "";
    return addr.length > maxLen ? addr.slice(0, maxLen) + "…" : addr;
  }

  const hasPickup = usesPickupAirport
    ? Boolean(pickupAirportId)
    : Boolean(route?.pickup?.address);
  const hasDropoff = usesDropoffAirport
    ? Boolean(dropoffAirportId)
    : Boolean(route?.dropoff?.address);

  const hasContactInfo =
    customerKind === "account"
      ? Boolean(selectedUser)
      : customerKind === "corporate"
        ? Boolean(
            corporateAccountId && (corporatePassengerId || newPassengerMode),
          )
        : Boolean(
            customerName.trim() && customerEmail.trim() && customerPhone.trim(),
          );

  const contactLabel = useMemo(() => {
    if (customerKind === "account") {
      return selectedUser?.name?.trim() || selectedUser?.email || null;
    }
    if (customerKind === "corporate") {
      if (!selectedCorporateAccount) return null;
      const passengerName = newPassengerMode
        ? newPassengerName.trim()
        : (corporatePassengers.find((p) => p.id === corporatePassengerId)
            ?.name ?? null);
      return passengerName
        ? `${selectedCorporateAccount.name} · ${passengerName}`
        : selectedCorporateAccount.name;
    }
    return customerName.trim() || null;
  }, [
    customerKind,
    selectedUser,
    customerName,
    selectedCorporateAccount,
    corporatePassengerId,
    corporatePassengers,
    newPassengerMode,
    newPassengerName,
  ]);

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
    if (!selectedVehicle || estimateCents <= 0) return null;
    return `$${centsToUsd(estimateCents)}`;
  }, [selectedVehicle, estimateCents]);

  const adminStepLabels: Record<number, string> = {
    1: "Trip Details",
    2: "Vehicle",
    3: "Approve & Price",
    4: "Assign",
    5: "Confirm",
    6: "Payment",
  };

  const adminChecklistItems: import("@/components/BookingPage/BookingWizardChecklist/BookingWizardChecklist").ChecklistItem[] =
    [
      {
        key: "customer",
        label: "Customer",
        description: "Select or enter customer info",
        isComplete: hasContactInfo,
        value: contactLabel,
        step: 1,
        priority: "critical",
        sectionId: "wizard-field-customer",
      },
      {
        key: "service",
        label: "Service Type",
        description: "Choose a service for this trip",
        isComplete: Boolean(selectedService),
        value: selectedService?.name ?? null,
        step: 1,
        priority: "critical",
        sectionId: "wizard-field-service",
      },
      {
        key: "datetime",
        label: "Date & Time",
        description: "Select pickup date and time",
        isComplete: Boolean(pickupAtDate && pickupAtTime),
        value: checklistDateTimeLabel,
        step: 1,
        priority: "critical",
        sectionId: "wizard-field-datetime",
      },
      {
        key: "passengers-luggage",
        label: "Passengers & Luggage",
        description: "How many passengers and bags?",
        isComplete: passengers >= 1,
        value:
          passengers >= 1
            ? `${passengers} passenger${passengers !== 1 ? "s" : ""}, ${luggage} bag${luggage !== 1 ? "s" : ""}`
            : null,
        step: 1,
        priority: "critical",
        sectionId: "wizard-field-passengers",
      },
      {
        key: "pickup",
        label: "Pickup Location",
        description: "Enter pickup address",
        isComplete: hasPickup,
        value: shortAddress(
          usesPickupAirport
            ? (serviceAirports.find((a) => a.id === pickupAirportId)?.name ??
                null)
            : (route?.pickup?.address ?? null),
        ),
        step: 1,
        priority: "critical",
        sectionId: "wizard-field-pickup",
      },
      {
        key: "dropoff",
        label: "Dropoff Location",
        description: "Enter destination",
        isComplete: hasDropoff,
        value: shortAddress(
          usesDropoffAirport
            ? (serviceAirports.find((a) => a.id === dropoffAirportId)?.name ??
                null)
            : (route?.dropoff?.address ?? null),
        ),
        step: 1,
        priority: "critical",
        sectionId: "wizard-field-dropoff",
      },
      {
        key: "vehicle",
        label: "Vehicle",
        description: "Choose a vehicle category",
        isComplete: Boolean(selectedVehicle),
        value: selectedVehicle
          ? checklistEstimateLabel
            ? `${selectedVehicle.name} · ${checklistEstimateLabel}`
            : selectedVehicle.name
          : null,
        step: 2,
        priority: "critical",
        sectionId: "wizard-field-vehicle",
      },
      {
        key: "price",
        label: "Approve Price",
        description: "Review and approve pricing",
        isComplete: Boolean(bookingId && bookingData),
        value: bookingData ? `$${centsToUsd(bookingData.totalCents)}` : null,
        step: 3,
        priority: "critical",
        sectionId: "wizard-field-price",
      },
      {
        key: "assign",
        label: "Assign",
        description: "Assign driver and vehicle unit",
        isComplete: Boolean(assignedDriverId),
        value: assignedDriver
          ? assignedDriver.name?.trim() || assignedDriver.email
          : null,
        step: 4,
        priority: "important",
        sectionId: "wizard-field-assign",
      },
      {
        key: "confirm",
        label: "Confirm",
        description: "Final review of all details",
        isComplete: step >= 6,
        value: step >= 6 ? "Reviewed" : null,
        step: 5,
        priority: "important",
        sectionId: "wizard-field-confirm",
      },
      {
        key: "payment",
        label: "Payment",
        description: "Collect or send payment",
        isComplete: bookingData?.paymentStatus === "PAID",
        value: bookingData?.paymentStatus === "PAID" ? "Paid" : null,
        step: 6,
        priority: "important",
        sectionId: "wizard-field-payment",
      },
    ];

  const checklistNode = (
    <BookingWizardChecklist
      currentStep={step}
      onGoToStep={(s) => setStep(s as AdminWizardStep)}
      hasService={Boolean(selectedService)}
      serviceName={selectedService?.name ?? null}
      hasDateTime={Boolean(pickupAtDate && pickupAtTime)}
      dateTimeLabel={checklistDateTimeLabel}
      hasPassengersLuggage={passengers >= 1}
      passengersLuggageLabel={null}
      hasPickup={hasPickup}
      pickupLabel={null}
      hasDropoff={hasDropoff}
      dropoffLabel={null}
      hasVehicle={Boolean(selectedVehicle)}
      vehicleName={null}
      estimateLabel={null}
      hasContactInfo={hasContactInfo}
      contactLabel={contactLabel}
      customItems={adminChecklistItems}
      customStepLabels={adminStepLabels}
    />
  );

  return (
    <section className={styles.container}>
      <div className={styles.content}>
        {!isMobile && <div className={styles.left}>{checklistNode}</div>}

        <div className={styles.right}>
          <div ref={wizardTopRef} className={styles.wizardTop} />

          {isMobile && (
            <div style={{ marginBottom: 20 }}>
              <AdminBookingStepper step={step} />
            </div>
          )}

          <div className={styles.wizard}>
            {/* STEP 1: Trip */}
            {step === 1 ? (
              <div className={`${styles.contentBox} ${styles.stepPane}`}>
                <h2 className='underline'>Trip details</h2>
                <p className='subheading'>
                  Customer, service, date/time, and route.
                </p>

                <div id='wizard-field-customer' className={styles.sectionBox}>
                  <label className='cardTitle h5'>Customer type</label>
                  <select
                    className='input emptySmall'
                    value={customerKind}
                    onChange={(e) => {
                      resetCreatedBooking();
                      setCustomerKind(e.target.value as any);
                    }}
                  >
                    <option value='account'>Account (existing user)</option>
                    <option value='guest'>Guest (no account)</option>
                    {corporateAccounts.length > 0 && (
                      <option value='corporate'>Corporate account</option>
                    )}
                  </select>
                  {customerKind === "account" ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      <label
                        className={cx(
                          "cardTitle h5",
                          tripErrors.attachUser && "redBorder",
                        )}
                      >
                        Attach to user
                      </label>

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
                          <div
                            className='miniNote'
                            style={{ marginBottom: "4rem" }}
                          >
                            {selectedUser.email}
                          </div>
                          <div className='miniNote'>
                            {selectedUser.phone
                              ? `📞 ${selectedUser.phone}`
                              : "📞 No phone on file"}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              flexWrap: "wrap",
                            }}
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
                            onChange={handleUserQueryChange}
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
                      {customerKind === "corporate" ? (
                        <div style={{ display: "grid", gap: 20 }}>
                          {/* Corporate Account Picker */}
                          <div style={{ display: "grid", gap: 8 }}>
                            <label
                              className={cx(
                                "cardTitle h5",
                                tripErrors.corporateAccount && "redBorder",
                              )}
                            >
                              Corporate account
                            </label>
                            <select
                              value={corporateAccountId}
                              onChange={(e) => {
                                resetCreatedBooking();
                                setCorporateAccountId(e.target.value);
                                setCorporatePassengerId("");
                                setNewPassengerMode(false);
                              }}
                              className='input emptySmall'
                            >
                              <option value=''>Select an account...</option>
                              {corporateAccounts.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Account info badge */}
                          {selectedCorporateAccount && (
                            <div
                              style={{
                                border: "1px solid rgba(0,0,0,0.12)",
                                borderRadius: 10,
                                padding: 12,
                                background: "white",
                                display: "flex",
                                gap: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              {selectedCorporateAccount.discountPercent ? (
                                <span className='badge badge_good'>
                                  {selectedCorporateAccount.discountPercent}%
                                  discount
                                </span>
                              ) : null}
                              <span className='badge'>
                                {selectedCorporateAccount.billingCycle
                                  .replaceAll("_", " ")
                                  .toLowerCase()
                                  .replace(/\b\w/g, (c: string) =>
                                    c.toUpperCase(),
                                  )}
                              </span>
                              <span className='badge'>
                                {selectedCorporateAccount.paymentTerms
                                  .replaceAll("_", " ")
                                  .toLowerCase()
                                  .replace(/\b\w/g, (c: string) =>
                                    c.toUpperCase(),
                                  )}
                              </span>
                              <span className='badge'>
                                {corporatePassengers.length} employee
                                {corporatePassengers.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                          )}

                          {/* Passenger Picker */}
                          {selectedCorporateAccount && (
                            <div style={{ display: "grid", gap: 8 }}>
                              <label
                                className={cx(
                                  "cardTitle h5",
                                  tripErrors.corporatePassenger && "redBorder",
                                )}
                              >
                                Passenger
                              </label>

                              {!newPassengerMode ? (
                                <>
                                  <select
                                    value={corporatePassengerId}
                                    onChange={(e) => {
                                      resetCreatedBooking();
                                      setCorporatePassengerId(e.target.value);
                                    }}
                                    className='input emptySmall'
                                  >
                                    <option value=''>
                                      Select a passenger...
                                    </option>
                                    {corporatePassengers.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.name}
                                        {p.department
                                          ? ` — ${p.department}`
                                          : ""}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type='button'
                                    className='secondaryBtn'
                                    style={{ justifySelf: "start" }}
                                    onClick={() => {
                                      resetCreatedBooking();
                                      setNewPassengerMode(true);
                                      setCorporatePassengerId("");
                                    }}
                                  >
                                    + New passenger (one-time)
                                  </button>
                                </>
                              ) : (
                                <div style={{ display: "grid", gap: 10 }}>
                                  <div className='miniNote'>
                                    This passenger will be added to the roster
                                    automatically.
                                  </div>
                                  <Grid2>
                                    <div style={{ display: "grid", gap: 8 }}>
                                      <label className='cardTitle h5'>
                                        Name *
                                      </label>
                                      <input
                                        className='input emptySmall'
                                        value={newPassengerName}
                                        onChange={(e) => {
                                          resetCreatedBooking();
                                          setNewPassengerName(e.target.value);
                                        }}
                                        placeholder='Passenger name'
                                      />
                                    </div>
                                    <div style={{ display: "grid", gap: 8 }}>
                                      <label className='cardTitle h5'>
                                        Email
                                      </label>
                                      <input
                                        className='input emptySmall'
                                        value={newPassengerEmail}
                                        onChange={(e) => {
                                          resetCreatedBooking();
                                          setNewPassengerEmail(e.target.value);
                                        }}
                                        placeholder='Optional'
                                        inputMode='email'
                                      />
                                    </div>
                                  </Grid2>
                                  <div style={{ display: "grid", gap: 8 }}>
                                    <label className='cardTitle h5'>
                                      Phone
                                    </label>
                                    <input
                                      className='input emptySmall'
                                      value={newPassengerPhone}
                                      onChange={(e) => {
                                        resetCreatedBooking();
                                        setNewPassengerPhone(e.target.value);
                                      }}
                                      placeholder='Optional'
                                      inputMode='tel'
                                    />
                                  </div>
                                  <button
                                    type='button'
                                    className='secondaryBtn'
                                    style={{ justifySelf: "start" }}
                                    onClick={() => {
                                      resetCreatedBooking();
                                      setNewPassengerMode(false);
                                      setNewPassengerName("");
                                      setNewPassengerEmail("");
                                      setNewPassengerPhone("");
                                    }}
                                  >
                                    ← Pick from roster instead
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Cost Center & Project Code */}
                          {selectedCorporateAccount && (
                            <Grid2>
                              <div style={{ display: "grid", gap: 8 }}>
                                <label className='cardTitle h5'>
                                  Cost center{" "}
                                  <span
                                    style={{ fontWeight: 400, opacity: 0.5 }}
                                  >
                                    (optional)
                                  </span>
                                </label>
                                <input
                                  className='input emptySmall'
                                  value={costCenter}
                                  onChange={(e) => {
                                    resetCreatedBooking();
                                    setCostCenter(e.target.value);
                                  }}
                                  placeholder='e.g., MKTG-001'
                                />
                              </div>
                              <div style={{ display: "grid", gap: 8 }}>
                                <label className='cardTitle h5'>
                                  Project code{" "}
                                  <span
                                    style={{ fontWeight: 400, opacity: 0.5 }}
                                  >
                                    (optional)
                                  </span>
                                </label>
                                <input
                                  className='input emptySmall'
                                  value={projectCode}
                                  onChange={(e) => {
                                    resetCreatedBooking();
                                    setProjectCode(e.target.value);
                                  }}
                                  placeholder='e.g., Q1-LAUNCH'
                                />
                              </div>
                            </Grid2>
                          )}
                        </div>
                      ) : (
                        <>
                          <Grid2>
                            <div style={{ display: "grid", gap: 8 }}>
                              <label
                                className={cx(
                                  "cardTitle h5",
                                  tripErrors.guestEmail && "redBorder",
                                )}
                              >
                                Customer email
                              </label>
                              <input
                                className='input emptySmall'
                                value={customerEmail}
                                onChange={(e) => {
                                  resetCreatedBooking();
                                  setCustomerEmail(e.target.value);
                                }}
                                placeholder='customer@email.com'
                                inputMode='email'
                              />
                            </div>

                            <div style={{ display: "grid", gap: 8 }}>
                              <label
                                className={cx(
                                  "cardTitle h5",
                                  tripErrors.guestName && "redBorder",
                                )}
                              >
                                Customer name
                              </label>
                              <input
                                className='input emptySmall'
                                value={customerName}
                                onChange={(e) => {
                                  resetCreatedBooking();
                                  setCustomerName(e.target.value);
                                }}
                                placeholder='Required for guest'
                              />
                            </div>
                          </Grid2>

                          <div style={{ display: "grid", gap: 10 }}>
                            <label
                              className={cx(
                                "cardTitle h5",
                                tripErrors.guestPhone && "redBorder",
                              )}
                            >
                              Customer phone
                            </label>
                            <input
                              className='input emptySmall'
                              value={customerPhone}
                              onChange={(e) => {
                                resetCreatedBooking();
                                setCustomerPhone(e.target.value);
                              }}
                              placeholder='(602) 555-1234'
                              inputMode='tel'
                            />
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>

                <div
                  id='wizard-field-service'
                  style={{ display: "grid", gap: 8 }}
                  className={styles.sectionBox}
                >
                  <label
                    className={cx(
                      "cardTitle h5",
                      (tripErrors.service || tripErrors.airportNotConfigured) &&
                        "redBorder",
                    )}
                  >
                    Service
                  </label>
                  <select
                    value={serviceTypeId}
                    onChange={(e) => {
                      resetCreatedBooking();
                      const next = e.target.value;

                      setPickupAirportId("");
                      setDropoffAirportId("");
                      setRoute(null);
                      setVehicleId("");

                      setFlightAirline("");
                      setFlightNumber("");
                      setFlightTerminal("");
                      setFlightScheduledAtDate("");
                      setFlightScheduledAtTime("");
                      setEventType("");

                      setServiceTypeId(next);

                      const svc = serviceTypes.find((s) => s.id === next);
                      if (svc?.pricingStrategy === "HOURLY") {
                        setHoursRequested((prev) =>
                          Math.max(Math.floor(prev || 2), 2),
                        );
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

                {attemptTripNext &&
                selectedService &&
                selectedService.airportLeg !== "NONE" &&
                serviceAirports.length === 0 ? (
                  <div
                    className='miniNote'
                    style={{ color: "rgba(180,0,0,0.85)" }}
                  >
                    This airport service isn&#39;t configured yet (no airports
                    assigned). Choose a different service or assign airports
                    first.
                  </div>
                ) : null}
                <div className={styles.sectionBox} id='wizard-field-datetime'>
                  {attemptTripNext && tripErrors.routeDistance ? (
                    <div
                      className='miniNote'
                      style={{ color: "rgba(180,0,0,0.85)" }}
                    >
                      Route estimate is missing distance (miles). Re-check the
                      route picker selection.
                    </div>
                  ) : null}

                  <label
                    className={cx(
                      "cardTitle h5",
                      tripErrors.dateTime && "redBorder",
                      // styles.sectionBox,
                    )}
                  >
                    Pickup date & time
                  </label>
                  <BookingDateTimePicker
                    date={pickupAtDate}
                    time={pickupAtTime}
                    onChangeDate={pickDate}
                    onChangeTime={(t) => {
                      resetCreatedBooking();
                      setPickupAtTime(t);
                    }}
                  />
                </div>
                <div className={styles.sectionBox} id='wizard-field-passengers'>
                  <Grid2>
                    <div style={{ display: "grid", gap: 8 }}>
                      <label className='cardTitle h5'>Passengers</label>
                      <input
                        type='number'
                        min={1}
                        value={passengers}
                        onChange={(e) => {
                          resetCreatedBooking();
                          setPassengers(Number(e.target.value));
                        }}
                        className='input emptySmall'
                      />
                    </div>

                    <div style={{ display: "grid", gap: 8 }}>
                      <label className='cardTitle h5'>Luggage</label>
                      <input
                        type='number'
                        min={0}
                        value={luggage}
                        onChange={(e) => {
                          resetCreatedBooking();
                          setLuggage(Number(e.target.value));
                        }}
                        className='input emptySmall'
                      />
                    </div>
                  </Grid2>
                </div>

                <div className={styles.pickupDropoffContainer}>
                  <div
                    id='wizard-field-pickup'
                    style={{ display: "grid", gap: 8 }}
                    className={styles.sectionBox}
                  >
                    <label
                      className={cx(
                        "cardTitle h5",
                        (usesPickupAirport
                          ? tripErrors.pickupAirport
                          : tripErrors.pickup) && "redBorder",
                      )}
                    >
                      {usesPickupAirport ? "Pickup airport" : "Pickup"}
                    </label>

                    {usesPickupAirport ? (
                      <select
                        value={pickupAirportId}
                        onChange={(e) => {
                          resetCreatedBooking();
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

                  {/* ✅ STOPS SECTION - Between Pickup and Dropoff */}
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

                                    resetCreatedBooking();
                                    setRoute((prev) => {
                                      const currentStops = [
                                        ...(prev?.stops ?? []),
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
                                      }

                                      return {
                                        pickup: prev?.pickup ?? null,
                                        dropoff: prev?.dropoff ?? null,
                                        stops: currentStops,
                                        miles: null,
                                        minutes: null,
                                        distanceMiles: null,
                                        durationMinutes: null,
                                      };
                                    });
                                  });
                                  (el as any).__stopAC = ac;
                                }
                              }
                            }}
                          />
                          <button
                            type='button'
                            onClick={() => {
                              resetCreatedBooking();
                              setRoute((prev) => {
                                const newStops = (prev?.stops ?? []).filter(
                                  (s) => s.id !== stop.id,
                                );
                                return {
                                  pickup: prev?.pickup ?? null,
                                  dropoff: prev?.dropoff ?? null,
                                  stops: newStops,
                                  miles: null,
                                  minutes: null,
                                  distanceMiles: null,
                                  durationMinutes: null,
                                };
                              });
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

                  {/* ✅ ADD STOP BUTTON */}
                  <button
                    type='button'
                    onClick={() => {
                      resetCreatedBooking();
                      const newStop: RoutePickerStop = {
                        id: `stop-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                        address: "",
                        placeId: "",
                        location: { lat: 0, lng: 0 },
                      };
                      setRoute((prev) => ({
                        pickup: prev?.pickup ?? null,
                        dropoff: prev?.dropoff ?? null,
                        stops: [...(prev?.stops ?? []), newStop],
                        miles: prev?.miles ?? null,
                        minutes: prev?.minutes ?? null,
                        distanceMiles: prev?.distanceMiles ?? null,
                        durationMinutes: prev?.durationMinutes ?? null,
                      }));
                    }}
                    className={styles.addStopBtnWizard}
                  >
                    <span>➕</span> Add a stop
                    <span className={styles.addStopFeeWizard}>
                      (+$15.00 per stop)
                    </span>
                  </button>

                  {/* ✅ Show stop surcharge info */}
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

                  <div
                    id='wizard-field-dropoff'
                    style={{ display: "grid", gap: 8 }}
                    className={styles.sectionBox}
                  >
                    <label
                      className={cx(
                        "cardTitle h5",
                        (usesDropoffAirport
                          ? tripErrors.dropoffAirport
                          : tripErrors.dropoff) && "redBorder",
                      )}
                    >
                      {usesDropoffAirport ? "Dropoff airport" : "Dropoff"}
                    </label>

                    {usesDropoffAirport ? (
                      <select
                        value={dropoffAirportId}
                        onChange={(e) => {
                          resetCreatedBooking();
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
                      onChange={(e) => {
                        resetCreatedBooking();
                        setHoursRequested(
                          Math.max(1, Math.floor(Number(e.target.value) || 1)),
                        );
                      }}
                      className='input emptySmall'
                    />
                  </div>
                ) : null}

                {selectedService?.pricingStrategy === "HOURLY" ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <label className='cardTitle h5'>
                      Event type (optional)
                    </label>
                    <select
                      value={
                        eventType.startsWith("Other:") ? "Other" : eventType
                      }
                      onChange={(e) => {
                        resetCreatedBooking();
                        setEventType(e.target.value);
                      }}
                      className='input emptySmall'
                    >
                      <option value=''>Select...</option>
                      <option value='Wedding'>Wedding</option>
                      <option value='Corporate'>Corporate</option>
                      <option value='Night Out'>Night Out</option>
                      <option value='Other'>Other</option>
                    </select>
                    {(eventType === "Other" ||
                      eventType.startsWith("Other:")) && (
                      <input
                        defaultValue={
                          eventType.startsWith("Other:")
                            ? eventType.slice(7).trim()
                            : ""
                        }
                        onChange={(e) => {
                          resetCreatedBooking();
                          setEventType(
                            e.target.value
                              ? `Other: ${e.target.value}`
                              : "Other",
                          );
                        }}
                        className='input emptySmall'
                        placeholder='Describe the event...'
                      />
                    )}
                  </div>
                ) : null}

                {isAirportService && (
                  <div className={styles.flightInfoSection}>
                    <div className={styles.flightInfoFields}>
                      <div
                        className='cardTitle h5'
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        ✈️ Flight Information{" "}
                        <span style={{ fontWeight: 400, opacity: 0.7 }}>
                          (optional)
                        </span>
                      </div>
                      <p
                        className='miniNote'
                        style={{ marginBottom: 16, marginTop: 8 }}
                      >
                        {usesPickupAirport
                          ? "Provide flight details so we can monitor for delays and adjust pickup time if needed."
                          : "Provide flight details so the driver knows which terminal to drop off at."}
                      </p>

                      <Grid2>
                        <div style={{ display: "grid", gap: 8 }}>
                          <label className='cardTitle h5'>Airline</label>
                          <AirlineSelect
                            value={flightAirline}
                            onChange={(name) => {
                              resetCreatedBooking();
                              setFlightAirline(name);
                            }}
                            onAirlineCodeSelected={(iataCode) => {
                              const current = flightNumber
                                .replace(/\s+/g, "")
                                .toUpperCase();
                              if (!current || /^[A-Z]{2}$/.test(current)) {
                                setFlightNumber(iataCode);
                              } else if (/^[A-Z]{2}\d/.test(current)) {
                                const digits = current.replace(/^[A-Z]{2}/, "");
                                setFlightNumber(iataCode + digits);
                              } else {
                                setFlightNumber(iataCode + current);
                              }
                            }}
                          />
                        </div>

                        <FlightLookupInput
                          flightNumber={flightNumber}
                          flightDate={pickupAtDate}
                          airportLeg={usesPickupAirport ? "PICKUP" : "DROPOFF"}
                          airportIata={selectedAirportIata}
                          onFlightNumberChange={(val) => {
                            resetCreatedBooking();
                            setFlightNumber(val);
                          }}
                          onFlightFound={(data) => {
                            resetCreatedBooking();
                            if (data.airline) setFlightAirline(data.airline);
                            if (data.terminal) setFlightTerminal(data.terminal);
                            if (data.scheduledDate)
                              setFlightScheduledAtDate(data.scheduledDate);
                            if (data.scheduledTime)
                              setFlightScheduledAtTime(data.scheduledTime);
                          }}
                        />
                      </Grid2>

                      <div style={{ display: "grid", gap: 8 }}>
                        <label className='cardTitle h5'>Terminal</label>
                        <input
                          type='text'
                          value={flightTerminal}
                          onChange={(e) => {
                            resetCreatedBooking();
                            setFlightTerminal(e.target.value);
                          }}
                          placeholder='e.g., Terminal 4'
                          className='input emptySmall'
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className={styles.routePickerContainer}>
                  <RoutePicker
                    value={route}
                    onChange={handleRouteChange}
                    pickupInputRef={pickupInputRef}
                    dropoffInputRef={dropoffInputRef}
                    inputsKey={inputsKey}
                  />
                </div>

                <div className={styles.btnRow}>
                  <button
                    type='button'
                    className='primaryBtn'
                    disabled={isPending}
                    onClick={() => {
                      setAttemptTripNext(true);

                      const errs = computeTripErrors();
                      const hasErr = Object.values(errs).some(Boolean);

                      if (hasErr) {
                        toast.error("Please complete all required fields.");
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
            {/* STEP 2: Vehicle + Special requests */}
            {step === 2 ? (
              <div
                id='wizard-field-vehicle'
                className={`${styles.sectionBox} ${styles.stepPane}`}
                style={{ display: "grid", gap: 20 }}
              >
                <h2 className='underline'>Choose a vehicle</h2>
                <p className='subheading'>
                  Choose a vehicle category, then create the booking.
                </p>

                <label
                  className={cx(
                    "cardTitle h5",
                    vehicleErrors.vehicle && "redBorder",
                  )}
                >
                  Vehicle category
                </label>

                <div style={{ display: "grid", gap: 10 }}>
                  {vehicles.map((v) => {
                    const isSelected = v.id === vehicleId;

                    const rowQuote = selectedService
                      ? calcQuoteCents({
                          pricingStrategy:
                            selectedService.pricingStrategy as any,
                          distanceMiles,
                          durationMinutes,
                          hoursRequested:
                            selectedService.pricingStrategy === "HOURLY"
                              ? toNumber(hoursRequested)
                              : null,
                          vehicleMinHours: v.minHours ?? 0,

                          serviceMinFareCents: selectedService.minFareCents,
                          serviceBaseFeeCents: selectedService.baseFeeCents,
                          servicePerMileCents: selectedService.perMileCents,
                          servicePerMinuteCents: selectedService.perMinuteCents,
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
                        ? (rowQuote?.billedHours ?? null)
                        : null;

                    return (
                      <button
                        key={v.id}
                        type='button'
                        onClick={() => {
                          resetCreatedBooking();
                          setVehicleId(v.id);
                          if (selectedService?.pricingStrategy === "HOURLY") {
                            setHoursRequested((prev) =>
                              Math.max(
                                Math.floor(prev || 1),
                                Math.floor(v.minHours || 0),
                              ),
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

                <div style={{ display: "grid", gap: 8 }}>
                  <div className='cardTitle h5'>
                    Special requests (optional)
                  </div>
                  <textarea
                    value={specialRequests}
                    onChange={(e) => {
                      resetCreatedBooking();
                      setSpecialRequests(e.target.value);
                    }}
                    className='input subheading'
                    style={{ minHeight: 90 }}
                    placeholder='Child seat, wheelchair needs, extra stops, meet & greet...'
                  />
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
                    disabled={isPending}
                    onClick={() => {
                      // ensure trip still valid (route picker can change)
                      if (!tripIsValid()) {
                        setAttemptTripNext(true);
                        toast.error("Please complete all required fields.");
                        setStep(1);
                        return;
                      }

                      setAttemptVehicleNext(true);
                      if (!vehicleId) {
                        toast.error("Please choose a vehicle category.");
                        return;
                      }

                      startTransition(async () => {
                        const id = await ensureBookingCreated();
                        if (!id) return;
                        setStep(3);
                      });
                    }}
                  >
                    {isPending ? "Creating..." : "Next"}
                  </button>
                </div>
              </div>
            ) : null}

            {/* STEP 3: Price */}
            {step === 3 ? (
              <div
                className={`${styles.stepPane}`}
                style={{ display: "grid", gap: 18 }}
              >
                <h2 className='underline'>Approve booking & set price</h2>
                <p className='subheading'>Approve & price the booking.</p>

                {!bookingId ? (
                  <div
                    className='miniNote'
                    style={{ color: "rgba(180,0,0,0.85)" }}
                  >
                    Booking missing. Go back and re-create it.
                  </div>
                ) : (
                  <div className='box'>
                    <ApprovePriceForm
                      bookingId={bookingId}
                      currency={bookingData?.currency ?? "USD"}
                      subtotalCents={
                        bookingData?.subtotalCents ?? estimateCents
                      }
                      feesCents={bookingData?.feesCents ?? 0}
                      taxesCents={bookingData?.taxesCents ?? 0}
                      totalCents={bookingData?.totalCents ?? estimateCents}
                    />

                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type='button'
                        className='secondaryBtn'
                        onClick={() => refreshBookingData(bookingId)}
                        disabled={bookingDataLoading}
                      >
                        {bookingDataLoading ? "Refreshing..." : "Refresh"}
                      </button>

                      <button
                        type='button'
                        className='secondaryBtn'
                        onClick={() =>
                          router.push(`/admin/bookings/${bookingId}`)
                        }
                      >
                        Open booking
                      </button>
                    </div>
                  </div>
                )}

                <div className={styles.actionsBetween}>
                  <button
                    type='button'
                    className='secondaryBtn'
                    onClick={() => setStep(2)}
                  >
                    Back
                  </button>

                  <button
                    type='button'
                    className='primaryBtn'
                    onClick={() => {
                      if (!bookingId) {
                        toast.error("Booking missing. Go back and create it.");
                        return;
                      }
                      setStep(4);
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}

            {/* STEP 4: Assign (+ status AFTER assign UI) */}
            {step === 4 ? (
              <div
                id='wizard-field-assign'
                className={`${styles.sectionBox} ${styles.stepPane}`}
                style={{ display: "grid", gap: 18 }}
              >
                <h2 className='underline'>Assign</h2>
                <p className='subheading'>
                  Assign driver / vehicle unit, then set initial status.
                </p>

                {!bookingId ? (
                  <div
                    className='miniNote'
                    style={{ color: "rgba(180,0,0,0.85)" }}
                  >
                    Booking missing. Go back and create it.
                  </div>
                ) : drivers.length === 0 ? (
                  <div className='miniNote'>
                    No drivers yet. Create users and assign DRIVER role in{" "}
                    <Link className='inlineLink' href='/admin/users'>
                      Users
                    </Link>
                    .
                  </div>
                ) : (
                  <div className='box'>
                    <AssignBookingForm
                      bookingId={bookingId}
                      drivers={drivers as any}
                      vehicleUnits={filteredVehicleUnits as any}
                      currentDriverId={assignedDriverId ?? null}
                      currentVehicleUnitId={assignedUnitId ?? null}
                      currentDriverPaymentCents={
                        bookingData?.assignment?.driverPaymentCents ?? null
                      }
                      bookingTotalCents={
                        bookingData?.totalCents ?? estimateCents
                      }
                      currency={bookingData?.currency ?? "USD"}
                      pickupAt={
                        pickupAtDate && pickupAtTime
                          ? new Date(
                              `${pickupAtDate}T${pickupAtTime}:00`,
                            ).toISOString()
                          : new Date().toISOString()
                      }
                    />

                    <div style={{ marginTop: 20, display: "grid", gap: 20 }}>
                      <label className='cardTitle h5'>Initial status</label>
                      <select
                        className='input emptySmall'
                        value={bookingStatus}
                        onChange={(e) => saveStatus(e.target.value as any)}
                        disabled={!bookingId || statusSaving}
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <div className='miniNote'>
                        Current: <strong>{statusLabel(bookingStatus)}</strong>
                        {statusSaving ? " • Saving…" : ""}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type='button'
                        className='secondaryBtn'
                        onClick={() => refreshBookingData(bookingId)}
                        disabled={bookingDataLoading}
                      >
                        {bookingDataLoading ? "Refreshing..." : "Refresh"}
                      </button>

                      <button
                        type='button'
                        className='secondaryBtn'
                        onClick={() =>
                          router.push(`/admin/bookings/${bookingId}`)
                        }
                      >
                        Open booking
                      </button>
                    </div>
                  </div>
                )}

                <div className={styles.actionsBetween}>
                  <button
                    type='button'
                    className='secondaryBtn'
                    onClick={() => setStep(3)}
                  >
                    Back
                  </button>

                  {/* ✅ Important: refresh bookingData BEFORE going to Confirm */}
                  <button
                    type='button'
                    className='primaryBtn'
                    onClick={() => {
                      if (!bookingId) {
                        toast.error("Booking missing. Go back and create it.");
                        return;
                      }

                      startTransition(async () => {
                        await refreshBookingData(bookingId);
                        setStep(5);
                      });
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}

            {/* STEP 5: Confirm */}
            {step === 5 ? (
              <div
                id='wizard-field-confirm'
                className={`${styles.sectionBox} ${styles.stepPane}`}
                style={{ display: "grid", gap: 18 }}
              >
                <h2 className='underline'>Confirm</h2>
                <p className='subheading'>Final review before payment.</p>

                {!bookingId ? (
                  <div
                    className='miniNote'
                    style={{ color: "rgba(180,0,0,0.85)" }}
                  >
                    Booking missing. Go back and create it.
                  </div>
                ) : (
                  <div className='box'>
                    <SummaryRow label='Booking ID' value={bookingId} strong />

                    <SummaryRow
                      label='Status'
                      value={statusLabel(bookingStatus)}
                    />

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
                          label='Phone'
                          value={selectedUser?.phone || "No phone on file"}
                        />
                      </>
                    ) : customerKind === "corporate" ? (
                      <>
                        <SummaryRow
                          label='Corporate account'
                          value={selectedCorporateAccount?.name ?? "—"}
                          strong
                        />
                        <SummaryRow
                          label='Passenger'
                          value={
                            newPassengerMode
                              ? `${newPassengerName.trim()} (new)`
                              : (corporatePassengers.find(
                                  (p) => p.id === corporatePassengerId,
                                )?.name ?? "—")
                          }
                        />
                        {selectedCorporateAccount?.discountPercent ? (
                          <SummaryRow
                            label='Corporate discount'
                            value={`${selectedCorporateAccount.discountPercent}%`}
                          />
                        ) : null}
                        {costCenter.trim() ? (
                          <SummaryRow
                            label='Cost center'
                            value={costCenter.trim()}
                          />
                        ) : null}
                        {projectCode.trim() ? (
                          <SummaryRow
                            label='Project code'
                            value={projectCode.trim()}
                          />
                        ) : null}
                        <SummaryRow
                          label='Billing'
                          value={`${selectedCorporateAccount?.billingCycle
                            .replaceAll("_", " ")
                            .toLowerCase()
                            .replace(/\b\w/g, (c: string) =>
                              c.toUpperCase(),
                            )} · ${selectedCorporateAccount?.paymentTerms
                            .replaceAll("_", " ")
                            .toLowerCase()
                            .replace(/\b\w/g, (c: string) => c.toUpperCase())}`}
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
                      label='Vehicle category'
                      value={selectedVehicle?.name ?? "—"}
                    />

                    <SummaryRow
                      label='Pickup time'
                      value={
                        pickupAtDate && pickupAtTime
                          ? `${pickupAtDate} @ ${pickupAtTime}`
                          : "—"
                      }
                    />
                    <SummaryRow
                      label='Pickup'
                      value={route?.pickup?.address ?? "—"}
                    />

                    {/* ✅ Extra Stops */}
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

                    <SummaryRow
                      label='Dropoff'
                      value={route?.dropoff?.address ?? "—"}
                    />

                    {selectedService?.pricingStrategy === "HOURLY" ? (
                      <>
                        <SummaryRow
                          label='Hours requested'
                          value={String(
                            selectedQuote?.requestedHours ?? hoursRequested,
                          )}
                        />
                        <SummaryRow
                          label='Billable hours'
                          value={String(billableHours ?? hoursRequested)}
                        />
                        {eventType && (
                          <SummaryRow label='Event type' value={eventType} />
                        )}
                      </>
                    ) : null}

                    <SummaryRow
                      label='Subtotal'
                      value={`$${centsToUsd(bookingData?.subtotalCents ?? estimateCents)}`}
                    />
                    <SummaryRow
                      label='Fees'
                      value={`$${centsToUsd(bookingData?.feesCents ?? 0)}`}
                    />
                    <SummaryRow
                      label='Taxes'
                      value={`$${centsToUsd(bookingData?.taxesCents ?? 0)}`}
                    />
                    <SummaryRow
                      label='Total'
                      value={`$${centsToUsd(bookingData?.totalCents ?? estimateCents)}`}
                      strong
                    />

                    <SummaryRow
                      label='Assigned driver'
                      value={
                        assignedDriver
                          ? `${(assignedDriver.name ?? "").trim() || "Unnamed"}${assignedDriver.email ? ` • ${assignedDriver.email}` : ""}`
                          : assignedDriverId
                            ? `Unknown driver • ${assignedDriverId}`
                            : "—"
                      }
                    />
                    <SummaryRow
                      label='Vehicle unit'
                      value={
                        assignedUnit
                          ? `${assignedUnit.name}${assignedUnit.plate ? ` • ${assignedUnit.plate}` : ""}`
                          : assignedUnitId
                            ? `Unknown unit • ${assignedUnitId}`
                            : "—"
                      }
                    />

                    {specialRequests?.trim() ? (
                      <SummaryRow
                        label='Special requests'
                        value={specialRequests.trim()}
                      />
                    ) : null}

                    {/* ✅ Flight info in summary */}
                    {(flightAirline || flightNumber || flightTerminal) && (
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
                  </div>
                )}

                <div className={styles.actionsBetween}>
                  <button
                    type='button'
                    className='secondaryBtn'
                    onClick={() => setStep(4)}
                  >
                    Back
                  </button>

                  <button
                    type='button'
                    className='primaryBtn'
                    onClick={() => {
                      if (!bookingId) return;

                      startTransition(async () => {
                        await refreshBookingData(bookingId);
                        setStep(6);
                      });
                    }}
                    disabled={!bookingId}
                  >
                    Proceed to payment
                  </button>
                </div>
              </div>
            ) : null}
            {/* STEP 6: Payment */}
            {step === 6 ? (
              <div
                id='wizard-field-payment'
                className={`${styles.sectionBox} ${styles.stepPane}`}
                style={{ display: "grid", gap: 18 }}
              >
                <h2 className='underline'>Payment</h2>
                <p className='subheading'>
                  {isCorporateBooking
                    ? "This booking will be billed to the corporate account."
                    : "Send a payment link or take a card payment."}
                </p>

                {isCorporateBooking && bookingId ? (
                  <div className='box'>
                    <div
                      style={{
                        display: "grid",
                        gap: 12,
                        textAlign: "center",
                        padding: "20px 0",
                      }}
                    >
                      <div style={{ fontSize: 32 }}>🏢</div>
                      <div className='emptyTitle'>
                        Billed to{" "}
                        {selectedCorporateAccount?.name ?? "corporate account"}
                      </div>
                      <div className='miniNote'>
                        This ride will appear on the next{" "}
                        <strong>
                          {(selectedCorporateAccount?.billingCycle ?? "MONTHLY")
                            .replaceAll("_", " ")
                            .toLowerCase()}
                        </strong>{" "}
                        invoice. No payment collection needed.
                      </div>
                      {selectedCorporateAccount?.discountPercent ? (
                        <div className='miniNote'>
                          Corporate discount of{" "}
                          <strong>
                            {selectedCorporateAccount.discountPercent}%
                          </strong>{" "}
                          has been applied.
                        </div>
                      ) : null}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        justifyContent: "center",
                        marginTop: 10,
                      }}
                    >
                      <button
                        type='button'
                        className='secondaryBtn'
                        onClick={() =>
                          router.push(`/admin/bookings/${bookingId}`)
                        }
                      >
                        Open booking
                      </button>
                    </div>
                  </div>
                ) : !bookingId ? (
                  <div
                    className='miniNote'
                    style={{ color: "rgba(180,0,0,0.85)" }}
                  >
                    Booking missing. Go back and create it.
                  </div>
                ) : (
                  <>
                    <div className='box'>
                      <div
                        className='emptyTitleSmall'
                        style={{ marginBottom: "1rem" }}
                      >
                        Payment status:{" "}
                        <strong>{bookingData?.paymentStatus ?? "NONE"}</strong>
                      </div>

                      <SendPaymentLinkButton
                        bookingId={bookingId}
                        totalCents={bookingData?.totalCents ?? estimateCents}
                        amountPaidCents={0}
                        currency={bookingData?.currency ?? "USD"}
                      />
                      <br />
                      {bookingData?.checkoutUrl ? (
                        <div className='miniNote' style={{ marginTop: 12 }}>
                          Latest checkout URL:
                          <div style={{ marginTop: 8 }}>
                            <a
                              href={bookingData.checkoutUrl}
                              className='backBtn emptyTitleSmall'
                              target='_blank'
                              rel='noopener noreferrer'
                            >
                              Payment Link
                            </a>
                          </div>
                        </div>
                      ) : null}

                      <div
                        style={{
                          marginTop: 10,
                          display: "flex",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type='button'
                          className='secondaryBtn'
                          onClick={() => refreshBookingData(bookingId)}
                          disabled={bookingDataLoading}
                        >
                          {bookingDataLoading ? "Refreshing..." : "Refresh"}
                        </button>

                        <button
                          type='button'
                          className='secondaryBtn'
                          onClick={() =>
                            router.push(`/admin/bookings/${bookingId}`)
                          }
                        >
                          Open booking
                        </button>
                      </div>
                    </div>

                    <div className='box'>
                      <div className='cardTitle h5'>
                        Take card payment (manual)
                      </div>
                      <div
                        className='miniNote'
                        style={{ marginBottom: "2rem", marginTop: "2rem" }}
                      >
                        Card-only checkout. After success, you’ll see a green
                        confirmation state.
                      </div>

                      <AdminManualCardPayment
                        bookingId={bookingId}
                        amountCents={bookingData?.totalCents ?? estimateCents}
                        currency={bookingData?.currency ?? "USD"}
                        onSuccess={async () => {
                          await refreshBookingData(bookingId);
                        }}
                      />
                    </div>
                  </>
                )}

                <div className={styles.actionsBetween}>
                  <button
                    type='button'
                    className='secondaryBtn'
                    onClick={() => setStep(5)}
                  >
                    Back
                  </button>

                  <button
                    type='button'
                    className='primaryBtn'
                    onClick={() => {
                      if (!bookingId) return;
                      router.push(`/admin/bookings/${bookingId}`);
                    }}
                    disabled={!bookingId}
                  >
                    Finish
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

function AdminBookingStepper({ step }: { step: AdminWizardStep }) {
  const items = [
    {
      n: 1 as const,
      label: "Trip",
      copy: "Customer, service, date/time, route",
    },
    { n: 2 as const, label: "Vehicle", copy: "Vehicle category + notes" },
    { n: 3 as const, label: "Price", copy: "Approve totals" },
    { n: 4 as const, label: "Assign", copy: "Driver / unit + status" },
    { n: 5 as const, label: "Confirm", copy: "Final review" },
    { n: 6 as const, label: "Payment", copy: "Send link or take card" },
  ];

  return (
    <div className={stepperStyles.container}>
      {items.map((it, idx) => {
        const isLast = idx === items.length - 1;
        const isActive = step === it.n;
        const isComplete = it.n < step;

        const toneClass = isActive
          ? stepperStyles.stepNumberActive
          : isComplete
            ? stepperStyles.stepNumberComplete
            : stepperStyles.stepNumberInactive;

        return (
          <div key={it.n} className={stepperStyles.step}>
            <div className={stepperStyles.stepDetails}>
              <div className={stepperStyles.left}>
                <div className={stepperStyles.marker}>
                  <span className={`${stepperStyles.stepNumber} ${toneClass}`}>
                    {it.n}
                  </span>
                  {!isLast ? (
                    <span className={stepperStyles.connector} />
                  ) : null}
                </div>
              </div>

              <div className={stepperStyles.right}>
                <div className={stepperStyles.label}>{it.label}</div>
                {/* <p className={stepperStyles.copy}>{it.copy}</p> */}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const stripePromise = (() => {
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  return pk ? loadStripe(pk) : null;
})();

function AdminManualCardPayment({
  bookingId,
  amountCents,
  currency,
  onSuccess,
}: {
  bookingId: string;
  amountCents: number;
  currency: string;
  onSuccess: () => void | Promise<void>;
}) {
  const [clientSecret, setClientSecret] = useState<string>("");
  const [creating, setCreating] = useState(false);

  if (!stripePromise) {
    return (
      <div className='miniNote' style={{ color: "rgba(180,0,0,0.85)" }}>
        Missing <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>. Add it to
        enable manual payments.
      </div>
    );
  }

  async function start() {
    if (!bookingId) return;
    setCreating(true);
    try {
      const res = await adminCreateManualPaymentIntent({ bookingId });
      if ((res as any)?.error) {
        toast.error((res as any).error);
        return;
      }
      const secret = String((res as any)?.clientSecret || "");
      if (!secret) {
        toast.error("No clientSecret returned.");
        return;
      }
      setClientSecret(secret);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to start manual payment.");
    } finally {
      setCreating(false);
    }
  }

  if (!clientSecret) {
    return (
      <button
        type='button'
        className='goodBtnii'
        onClick={start}
        disabled={creating}
      >
        {creating ? "Starting..." : `Take card payment `}
      </button>
    );
  }

  return (
    <div style={{ marginTop: 10 }}>
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: { theme: "stripe" },
          loader: "auto",
        }}
      >
        <ManualPaymentInner clientSecret={clientSecret} onSuccess={onSuccess} />
      </Elements>
    </div>
  );
}

function ManualPaymentInner({
  clientSecret,
  onSuccess,
}: {
  clientSecret: string;
  onSuccess: () => void | Promise<void>;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [paidSuccess, setPaidSuccess] = useState(false);

  async function pay() {
    if (!stripe || !elements) return;

    const card = elements.getElement(CardElement);
    if (!card) {
      toast.error("Card input not ready yet.");
      return;
    }

    setSubmitting(true);
    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        { payment_method: { card } },
      );

      if (error) {
        toast.error(error.message ?? "Payment failed.");
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        setPaidSuccess(true);
        toast.success("Payment succeeded.");
        await onSuccess();
      } else {
        toast.success(`Payment status: ${paymentIntent?.status ?? "unknown"}`);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Payment error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {/* ✅ Card-only fields (removes Affirm/Cash App/Klarna/Amazon/Crypto UI) */}
      <div
        style={{
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 10,
          padding: 12,
          background: "white",
        }}
      >
        <CardElement
          options={{
            hidePostalCode: false,
          }}
        />
      </div>

      <button
        type='button'
        className='primaryBtn'
        onClick={pay}
        disabled={!stripe || !elements || submitting || paidSuccess}
        style={
          paidSuccess
            ? {
                background: "rgba(0,160,80,0.95)",
                borderColor: "rgba(0,160,80,0.95)",
              }
            : undefined
        }
      >
        {paidSuccess
          ? "Payment successful"
          : submitting
            ? "Processing..."
            : "Charge card"}
      </button>
    </div>
  );
}
