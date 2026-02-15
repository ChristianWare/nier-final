/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import styles from "./CorporateNewBookingWizard.module.css";
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
import FlightLookupInput from "@/components/BookingPage/FlightLookupInput/FlightLookupInput";
import AirlineSelect from "@/components/BookingPage/AirlineSelect/AirlineSelect";
import BookingWizardChecklist from "@/components/BookingPage/BookingWizardChecklist/BookingWizardChecklist";

import { corporateCreateBooking } from "../../../../actions/corporate/corporateCreateBooking";
import { corporateCreateTripGroupBooking } from "../../../../actions/corporate/corporateCreateTripGroupBooking";
import Modal from "@/components/shared/Modal/Modal";
import { localToUtcIso } from "@/lib/timezone";
import { calcQuoteCents } from "@/lib/pricing/calcQuote";

// ───────────── Types ─────────────

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

type ServiceFeeDTO = {
  id: string;
  label: string;
  amountCents: number;
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
  fees: ServiceFeeDTO[];
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

type PassengerDTO = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
};

type CorporateAccountDTO = {
  id: string;
  name: string;
  discountPercent: number;
  billingCycle: string;
  paymentTerms: string;
};

// Steps: 1 Trip → 2 Vehicle → 3 Review → 4 Confirmed
type WizardStep = 1 | 2 | 3 | 4;

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
  stops: {
    address: string;
    placeId?: string | null;
    lat?: number | null;
    lng?: number | null;
  }[];
  distanceMiles: number | null;
  durationMinutes: number | null;
  hoursRequested: number | null;
  specialRequests: string | null;
  flightAirline: string | null;
  flightNumber: string | null;
  flightScheduledAt: string | null;
  flightTerminal: string | null;
  eventType: string | null;
  estimateCents: number;
  callForPricing: boolean;
  costCenter: string | null;
  projectCode: string | null;
};
// ───────────── Helpers ─────────────

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function centsToUsd(cents: number) {
  return (cents / 100).toFixed(2);
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

function shortAddress(addr: string | null | undefined, maxLen = 35): string {
  if (!addr) return "";
  return addr.length > maxLen ? addr.slice(0, maxLen) + "…" : addr;
}

// ───────────── Component ─────────────

export default function CorporateNewBookingWizard({
  serviceTypes,
  vehicles,
  blackoutsByYmd,
  passengers,
  corporateAccount,
  companyTimezone,
}: {
  serviceTypes: ServiceTypeDTO[];
  vehicles: VehicleDTO[];
  blackoutsByYmd: Record<string, boolean>;
  passengers: PassengerDTO[];
  corporateAccount: CorporateAccountDTO;
  companyTimezone: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<WizardStep>(1);
  const [bookingId, setBookingId] = useState<string>("");

  // ─── Passenger state ───
  const [corporatePassengerId, setCorporatePassengerId] = useState<string>("");
  const [newPassengerMode, setNewPassengerMode] = useState(false);
  const [newPassengerName, setNewPassengerName] = useState("");
  const [newPassengerEmail, setNewPassengerEmail] = useState("");
  const [newPassengerPhone, setNewPassengerPhone] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [projectCode, setProjectCode] = useState("");

  // ─── Trip state ───
  const [serviceTypeId, setServiceTypeId] = useState<string>("");
  const [pickupAtDate, setPickupAtDate] = useState<string>("");
  const [pickupAtTime, setPickupAtTime] = useState<string>("");
  const [passengers_count, setPassengersCount] = useState<number>(0);
  const [luggage, setLuggage] = useState<number>(0);
  const [hoursRequested, setHoursRequested] = useState<number>(2);

  const [route, setRoute] = useState<RoutePickerValue | null>(null);
  const pickupInputRef = useRef<HTMLInputElement | null>(null);
  const dropoffInputRef = useRef<HTMLInputElement | null>(null);

  const [vehicleId, setVehicleId] = useState<string>("");
  const [specialRequests, setSpecialRequests] = useState<string>("");

  const [pickupAirportId, setPickupAirportId] = useState<string>("");
  const [dropoffAirportId, setDropoffAirportId] = useState<string>("");

  // ─── Flight info ───
  const [flightAirline, setFlightAirline] = useState<string>("");
  const [flightNumber, setFlightNumber] = useState<string>("");
  const [flightTerminal, setFlightTerminal] = useState<string>("");
  const [flightScheduledAtDate, setFlightScheduledAtDate] =
    useState<string>("");
  const [flightScheduledAtTime, setFlightScheduledAtTime] =
    useState<string>("");
  const [eventType, setEventType] = useState<string>("");

  // ─── Validation ───
  const [attemptTripNext, setAttemptTripNext] = useState(false);
  const [attemptVehicleNext, setAttemptVehicleNext] = useState(false);

  // ─── Multi-leg state ───
  const [savedLegs, setSavedLegs] = useState<SavedLeg[]>([]);
  const [removeLegId, setRemoveLegId] = useState<string | null>(null);
  // ─── Derived ───
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

  // Scroll to top on step change
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

  // ─── Route helpers ───
  const distanceMiles = toNumber(route?.miles ?? (route as any)?.distanceMiles);
  const durationMinutes = toNumber(
    route?.minutes ?? (route as any)?.durationMinutes,
  );

  function applyAirportToRoute(side: "pickup" | "dropoff", airportId: string) {
    const a = serviceAirports.find((x) => x.id === airportId) ?? null;

    if (!a) {
      setRoute((prev) => {
        const next: RoutePickerValue = {
          pickup: side === "pickup" ? null : (prev?.pickup ?? null),
          dropoff: side === "dropoff" ? null : (prev?.dropoff ?? null),
          stops: prev?.stops ?? [],
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
        "That airport is missing coordinates. Please contact Nier Transportation.",
      );
      return;
    }

    const place: RoutePickerPlace = {
      address: a.address,
      placeId: a.placeId ?? a.id,
      location: { lat, lng },
    };

    setRoute((prev) => ({
      pickup: side === "pickup" ? place : (prev?.pickup ?? null),
      dropoff: side === "dropoff" ? place : (prev?.dropoff ?? null),
      stops: prev?.stops ?? [],
      miles: null,
      minutes: null,
      distanceMiles: null,
      durationMinutes: null,
    }));
  }

  // ─── Quote calculation ───
  const selectedQuote = useMemo(() => {
    if (!selectedService) return null;
    const stopCount = route?.stops?.length ?? 0;
    return calcQuoteCents({
      pricingStrategy: selectedService.pricingStrategy as any,
      distanceMiles,
      durationMinutes,
      hoursRequested:
        selectedService.pricingStrategy === "HOURLY"
          ? toNumber(hoursRequested)
          : null,
      stopCount,
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
    route?.stops?.length,
  ]);

  const billableHours =
    selectedService?.pricingStrategy === "HOURLY"
      ? (selectedQuote?.billedHours ?? null)
      : null;

  const estimateCents = selectedQuote?.totalCents ?? 0;
  const discountPercent = corporateAccount.discountPercent ?? 0;
  const discountAmountCents =
    discountPercent > 0
      ? Math.round(estimateCents * (discountPercent / 100))
      : 0;
  const displayTotalCents = estimateCents - discountAmountCents;

  // ─── Multi-leg helpers ───
  const isMultiLeg = savedLegs.length > 0;
  const savedLegsTotal = savedLegs.reduce((sum, l) => sum + l.estimateCents, 0);
  const groupEstimateTotal = savedLegsTotal + displayTotalCents;

  // ─── Selected passenger info ───
  const selectedPassenger = useMemo(() => {
    if (newPassengerMode) {
      return newPassengerName.trim()
        ? { name: newPassengerName.trim(), department: null }
        : null;
    }
    if (!corporatePassengerId) return null;
    return passengers.find((p) => p.id === corporatePassengerId) ?? null;
  }, [corporatePassengerId, passengers, newPassengerMode, newPassengerName]);

  // ─── Validation ───
  function computeTripErrors() {
    const e = {
      passenger: false,
      service: false,
      dateTime: false,
      tooSoon: false,
      pickup: false,
      dropoff: false,
      pickupAirport: false,
      dropoffAirport: false,
      airportNotConfigured: false,
      routeDistance: false,
    };

    if (!corporatePassengerId && !newPassengerMode) e.passenger = true;
    if (newPassengerMode && !newPassengerName.trim()) e.passenger = true;

    if (!selectedService) e.service = true;

    const hasDateTime = Boolean(pickupAtDate) && Boolean(pickupAtTime);
    const dateBlocked = pickupAtDate && blackoutsByYmd[pickupAtDate];
    if (!hasDateTime || dateBlocked) e.dateTime = true;

    if (hasDateTime && !e.dateTime) {
      const selectedDt = new Date(`${pickupAtDate}T${pickupAtTime}:00`);
      const minAllowed = new Date(Date.now() + 36 * 60 * 60 * 1000);
      if (selectedDt < minAllowed) e.tooSoon = true;
    }

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

  // ─── Date picker ───
  function pickDate(val: string) {
    if (val && blackoutsByYmd[val]) {
      toast.error("That date is unavailable. Please choose another day.");
      return;
    }
    setPickupAtDate(val);
  }

  // ─── Route change handler ───
  const handleRouteChange = useCallback((v: RoutePickerValue | null) => {
    setRoute((prev) => {
      if (routeEquals(prev, v)) return prev;
      return v;
    });
  }, []);

  /** Save current leg to savedLegs and reset wizard to step 1 */
  function addAnotherRide() {
    if (!tripIsValid()) {
      setAttemptTripNext(true);
      toast.error("Please complete all required fields.");
      setStep(1);
      return;
    }
    if (!vehicleId) {
      setAttemptVehicleNext(true);
      toast.error("Please choose a vehicle.");
      setStep(2);
      return;
    }
    if (!selectedService || !route?.pickup || !route?.dropoff) {
      toast.error("Please complete pickup and dropoff.");
      return;
    }
    if (selectedService.pricingStrategy === "POINT_TO_POINT") {
      const miles = toNumber(route.miles ?? (route as any).distanceMiles);
      if (!miles || miles <= 0) {
        toast.error("Route estimate missing. Please re-check the route.");
        return;
      }
    }

    const pickupAtIso = localToUtcIso(
      pickupAtDate,
      pickupAtTime,
      companyTimezone,
    );

    let flightScheduledAtIso: string | null = null;
    if (flightScheduledAtDate && flightScheduledAtTime) {
      flightScheduledAtIso = localToUtcIso(
        flightScheduledAtDate,
        flightScheduledAtTime,
        companyTimezone,
      );
    } else if (flightScheduledAtDate) {
      flightScheduledAtIso = localToUtcIso(
        flightScheduledAtDate,
        "00:00",
        companyTimezone,
      );
    }

    const newLeg: SavedLeg = {
      id: `leg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      serviceTypeId: selectedService.id,
      serviceName: selectedService.name,
      vehicleId,
      vehicleName: selectedVehicle?.name ?? "Standard",
      pickupAt: pickupAtIso,
      pickupAtDate,
      pickupAtTime,
      passengers: passengers_count,
      luggage,
      pickupAddress: route.pickup.address,
      pickupPlaceId: route.pickup.placeId ?? null,
      pickupLat: route.pickup.location?.lat ?? null,
      pickupLng: route.pickup.location?.lng ?? null,
      dropoffAddress: route.dropoff.address,
      dropoffPlaceId: route.dropoff.placeId ?? null,
      dropoffLat: route.dropoff.location?.lat ?? null,
      dropoffLng: route.dropoff.location?.lng ?? null,
      stops: (route.stops ?? []).map((s) => ({
        address: s.address,
        placeId: s.placeId ?? null,
        lat: s.location?.lat ?? null,
        lng: s.location?.lng ?? null,
      })),
      distanceMiles: toNumber(
        route.miles ?? (route as any).distanceMiles ?? null,
      ),
      durationMinutes: toNumber(
        route.minutes ?? (route as any).durationMinutes ?? null,
      ),
      hoursRequested:
        selectedService.pricingStrategy === "HOURLY" ? hoursRequested : null,
      specialRequests: specialRequests || null,
      flightAirline: flightAirline || null,
      flightNumber: flightNumber || null,
      flightScheduledAt: flightScheduledAtIso,
      flightTerminal: flightTerminal || null,
      eventType: eventType || null,
      estimateCents: displayTotalCents,
      callForPricing: selectedVehicle?.callForPricing ?? false,
      costCenter: costCenter.trim() || null,
      projectCode: projectCode.trim() || null,
    };

    setSavedLegs((prev) => [...prev, newLeg]);

    // Reset trip-specific fields (keep passenger/account info)
    setServiceTypeId("");
    setPickupAtDate("");
    setPickupAtTime("");
    setPassengersCount(0);
    setLuggage(0);
    setHoursRequested(2);
    setRoute(null);
    setVehicleId("");
    setSpecialRequests("");
    setPickupAirportId("");
    setDropoffAirportId("");
    setFlightAirline("");
    setFlightNumber("");
    setFlightTerminal("");
    setFlightScheduledAtDate("");
    setFlightScheduledAtTime("");
    setEventType("");
    setCostCenter("");
    setProjectCode("");
    setAttemptTripNext(false);
    setAttemptVehicleNext(false);

    toast.success(`Ride ${savedLegs.length + 1} added to your trip!`);
    setStep(1);
  }

  function confirmRemoveLeg() {
    if (!removeLegId) return;
    setSavedLegs((prev) => prev.filter((l) => l.id !== removeLegId));
    setRemoveLegId(null);
    toast.success("Ride removed from trip.");
  }

  // ─── RoutePicker key (remounts on service change) ───

  const inputsKey = `${serviceTypeId || "none"}-${usesPickupAirport ? "P" : ""}${usesDropoffAirport ? "D" : ""}-${pickupAirportId || ""}-${dropoffAirportId || ""}`;

  // ─── Submit booking ───
  async function submitBooking() {
    if (!tripIsValid()) {
      setAttemptTripNext(true);
      toast.error("Please complete all required fields.");
      setStep(1);
      return;
    }

    if (!vehicleId) {
      setAttemptVehicleNext(true);
      toast.error("Please choose a vehicle.");
      setStep(2);
      return;
    }

    if (!selectedService) return;

    const pickup = route!.pickup!;
    const dropoff = route!.dropoff!;
    const pickupAtIso = localToUtcIso(
      pickupAtDate,
      pickupAtTime,
      companyTimezone,
    );

    // ─── Multi-leg: submit as trip group ───
    if (savedLegs.length > 0) {
      let flightScheduledAtIsoGroup: string | null = null;
      if (flightScheduledAtDate && flightScheduledAtTime) {
        flightScheduledAtIsoGroup = localToUtcIso(
          flightScheduledAtDate,
          flightScheduledAtTime,
          companyTimezone,
        );
      } else if (flightScheduledAtDate) {
        flightScheduledAtIsoGroup = localToUtcIso(
          flightScheduledAtDate,
          "00:00",
          companyTimezone,
        );
      }

      const currentLeg = {
        serviceTypeId,
        vehicleId,
        pickupAt: pickupAtIso,
        passengers: passengers_count,
        luggage,
        pickupAddress: pickup.address,
        pickupPlaceId: pickup.placeId ?? null,
        pickupLat: pickup.location?.lat ?? null,
        pickupLng: pickup.location?.lng ?? null,
        dropoffAddress: dropoff.address,
        dropoffPlaceId: dropoff.placeId ?? null,
        dropoffLat: dropoff.location?.lat ?? null,
        dropoffLng: dropoff.location?.lng ?? null,
        stops: (route?.stops ?? []).map((s) => ({
          address: s.address,
          placeId: s.placeId ?? null,
          lat: s.location?.lat ?? null,
          lng: s.location?.lng ?? null,
        })),
        distanceMiles: toNumber(
          route!.miles ?? (route as any)!.distanceMiles ?? null,
        ),
        durationMinutes: toNumber(
          route!.minutes ?? (route as any)!.durationMinutes ?? null,
        ),
        hoursRequested:
          selectedService.pricingStrategy === "HOURLY"
            ? toNumber(hoursRequested)
            : null,
        specialRequests: specialRequests || null,
        flightAirline: flightAirline || null,
        flightNumber: flightNumber || null,
        flightScheduledAt: flightScheduledAtIsoGroup,
        flightTerminal: flightTerminal || null,
        eventType: eventType || null,
        costCenter: costCenter.trim() || null,
        projectCode: projectCode.trim() || null,
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
          eventType: sl.eventType,
          costCenter: sl.costCenter,
          projectCode: sl.projectCode,
        })),
        currentLeg,
      ];

      try {
        const groupRes = await corporateCreateTripGroupBooking({
          legs: allLegs,
          corporatePassengerId: !newPassengerMode
            ? corporatePassengerId || null
            : null,
          newPassengerName: newPassengerMode ? newPassengerName.trim() : null,
          newPassengerEmail: newPassengerMode
            ? newPassengerEmail.trim() || null
            : null,
          newPassengerPhone: newPassengerMode
            ? newPassengerPhone.trim() || null
            : null,
        });
        const groupData = groupRes as any;
        if (groupData?.error) {
          toast.error(groupData.error);
          return;
        }
        const id = String(
          groupData?.firstBookingId || groupData?.bookingId || "",
        );
        setBookingId(id);
        toast.success(`Multi-day trip booked! (${allLegs.length} rides)`);
        setStep(4);
        return;
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to create trip group.");
        return;
      }
    }

    // ─── Single ride: existing flow ───
    try {
      const res = await corporateCreateBooking({
        serviceTypeId,
        vehicleId,
        pickupAt: pickupAtIso,
        passengers: passengers_count,
        luggage,

        pickupAddress: pickup.address,
        pickupPlaceId: pickup.placeId ?? null,
        pickupLat: pickup.location?.lat ?? null,
        pickupLng: pickup.location?.lng ?? null,

        dropoffAddress: dropoff.address,
        dropoffPlaceId: dropoff.placeId ?? null,
        dropoffLat: dropoff.location?.lat ?? null,
        dropoffLng: dropoff.location?.lng ?? null,

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

        flightAirline: flightAirline || null,
        flightNumber: flightNumber || null,
        flightScheduledAt:
          flightScheduledAtDate && flightScheduledAtTime
            ? localToUtcIso(
                flightScheduledAtDate,
                flightScheduledAtTime,
                companyTimezone,
              )
            : flightScheduledAtDate
              ? localToUtcIso(flightScheduledAtDate, "00:00", companyTimezone)
              : null,
        flightTerminal: flightTerminal || null,
        eventType: eventType || null,

        corporatePassengerId: !newPassengerMode
          ? corporatePassengerId || null
          : null,
        newPassengerName: newPassengerMode ? newPassengerName.trim() : null,
        newPassengerEmail: newPassengerMode
          ? newPassengerEmail.trim() || null
          : null,
        newPassengerPhone: newPassengerMode
          ? newPassengerPhone.trim() || null
          : null,
        costCenter: costCenter.trim() || null,
        projectCode: projectCode.trim() || null,
      });

      if ((res as any)?.error) {
        toast.error((res as any).error);
        return;
      }

      const id = String((res as any).bookingId || "");
      if (!id) {
        toast.error("Booking created, but no ID returned.");
        return;
      }

      setBookingId(id);
      toast.success("Ride booked successfully!");
      setStep(4);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create booking.");
    }
  }

  // ─── Responsive ───
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 900);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // ───────────── Render ─────────────
  return (
    <section className={styles.container}>
      <div ref={wizardTopRef} className={styles.wizardTop} />

      {/* Stepper */}
      {/* <CorporateBookingStepper step={step} /> */}

      <div className={styles.content}>
        {/* Left — checklist on desktop, stepper on mobile */}
        <div className={styles.left}>
          <div className={styles.desktopOnly}>
            <BookingWizardChecklist
              currentStep={step}
              onGoToStep={(s) => setStep(s as WizardStep)}
              hasService={Boolean(selectedService)}
              serviceName={selectedService?.name ?? null}
              hasDateTime={Boolean(pickupAtDate && pickupAtTime)}
              dateTimeLabel={
                pickupAtDate && pickupAtTime
                  ? `${pickupAtDate} @ ${pickupAtTime}`
                  : null
              }
              hasPickup={Boolean(route?.pickup)}
              pickupLabel={shortAddress(route?.pickup?.address) || null}
              hasDropoff={Boolean(route?.dropoff)}
              dropoffLabel={shortAddress(route?.dropoff?.address) || null}
              hasPassengersLuggage={passengers_count >= 1}
              passengersLuggageLabel={
                passengers_count >= 1
                  ? `${passengers_count} pax, ${luggage} bags`
                  : null
              }
              hasVehicle={Boolean(vehicleId)}
              vehicleName={selectedVehicle?.name ?? null}
              estimateLabel={
                displayTotalCents > 0
                  ? `$${centsToUsd(displayTotalCents)}`
                  : null
              }
              hasContactInfo={Boolean(
                corporatePassengerId ||
                (newPassengerMode && newPassengerName.trim()),
              )}
              contactLabel={selectedPassenger?.name ?? null}
              customStepLabels={{
                1: "Trip Details",
                2: "Vehicle",
                3: "Review",
                4: "Confirmed",
              }}
              customItems={[
                {
                  key: "service",
                  label: "Service Type",
                  description: "Choose a service for your trip",
                  isComplete: Boolean(selectedService),
                  value: selectedService?.name ?? null,
                  step: 1,
                  priority: "critical",
                  sectionId: "wizard-field-service",
                },
                {
                  key: "passenger",
                  label: "Passenger",
                  description: "Select an employee from your roster",
                  isComplete: Boolean(
                    corporatePassengerId ||
                    (newPassengerMode && newPassengerName.trim()),
                  ),
                  value: selectedPassenger?.name ?? null,
                  step: 1,
                  priority: "critical",
                  sectionId: "wizard-field-passenger",
                },
                {
                  key: "datetime",
                  label: "Date & Time",
                  description: "Select your pickup date and time",
                  isComplete: Boolean(pickupAtDate && pickupAtTime),
                  value:
                    pickupAtDate && pickupAtTime
                      ? `${pickupAtDate} @ ${pickupAtTime}`
                      : null,
                  step: 1,
                  priority: "critical",
                  sectionId: "wizard-field-datetime",
                },
                {
                  key: "passengers-luggage",
                  label: "Passengers & Luggage",
                  description: "How many passengers and bags?",
                  isComplete: passengers_count >= 1,
                  value:
                    passengers_count >= 1
                      ? `${passengers_count} pax, ${luggage} bags`
                      : null,
                  step: 1,
                  priority: "critical",
                  sectionId: "wizard-field-passengers-luggage",
                },
                {
                  key: "pickup",
                  label: "Pickup Location",
                  description: "Enter your pickup address",
                  isComplete: Boolean(route?.pickup),
                  value: shortAddress(route?.pickup?.address) || null,
                  step: 1,
                  priority: "critical",
                  sectionId: "wizard-field-pickup",
                },
                {
                  key: "dropoff",
                  label: "Dropoff Location",
                  description: "Enter your destination",
                  isComplete: Boolean(route?.dropoff),
                  value: shortAddress(route?.dropoff?.address) || null,
                  step: 1,
                  priority: "critical",
                  sectionId: "wizard-field-dropoff",
                },
                {
                  key: "vehicle",
                  label: "Vehicle",
                  description: "Choose a vehicle category",
                  isComplete: Boolean(vehicleId),
                  value: selectedVehicle
                    ? displayTotalCents > 0
                      ? `${selectedVehicle.name} · $${centsToUsd(displayTotalCents)}`
                      : selectedVehicle.name
                    : null,
                  step: 2,
                  priority: "critical",
                  sectionId: "wizard-field-vehicle",
                },
                {
                  key: "confirm",
                  label: "Confirm",
                  description: "Final review of all details",
                  isComplete: step >= 3,
                  value: step >= 3 ? "Ready to submit" : null,
                  step: 3,
                  priority: "critical",
                  sectionId: "wizard-field-confirm",
                },
              ]}
            />
          </div>
          <div className={styles.mobileOnly}>
            <CorporateBookingStepper step={step} />
          </div>
        </div>

        {/* Right — wizard steps */}
        <div className={styles.right}>
          <div className={styles.wizard}>
            {" "}
            {/* ═══════════ STEP 1: Trip Details ═══════════ */}
            {step === 1 && (
              <div className={`${styles.stepPane} ${styles.contentBox}`}>
                <h1 className='underline h2'>Book a Ride</h1>
                <p className='subheading'>
                  {isMultiLeg
                    ? `Adding ride ${savedLegs.length + 1} to your trip`
                    : "Select a passenger, service, date/time, and route for this trip."}
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

                {/* Service */}
                <div id='wizard-field-service' className={styles.sectionBox}>
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
                    className='selectBorder emptySmall'
                  >
                    <option value=''>Select a service...</option>
                    {serviceTypes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Account info badge */}
                <div className={styles.accountBadge}>
                  <span className={styles.accountName}>
                    {corporateAccount.name}
                  </span>
                  <div className={styles.badgeRow}>
                    {discountPercent > 0 && (
                      <span className='badge badge_good'>
                        {discountPercent}% discount
                      </span>
                    )}
                    <span className='badge'>
                      {corporateAccount.billingCycle
                        .replaceAll("_", " ")
                        .toLowerCase()
                        .replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </span>
                    <span className='badge'>
                      {corporateAccount.paymentTerms
                        .replaceAll("_", " ")
                        .toLowerCase()
                        .replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </span>
                  </div>
                </div>

                {/* Passenger */}
                <div id='wizard-field-passenger' className={styles.sectionBox}>
                  <label
                    className={cx(
                      "cardTitle h5",
                      tripErrors.passenger && "redBorder",
                    )}
                  >
                    Passenger
                  </label>

                  {!newPassengerMode ? (
                    <>
                      <select
                        value={corporatePassengerId}
                        onChange={(e) =>
                          setCorporatePassengerId(e.target.value)
                        }
                        className='selectBorder emptySmall'
                      >
                        <option value=''>Select a passenger...</option>
                        {passengers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                            {p.department ? ` — ${p.department}` : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        type='button'
                        className='secondaryBtn'
                        style={{ justifySelf: "start" }}
                        onClick={() => {
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
                        This passenger will be added to your roster
                        automatically.
                      </div>
                      <Grid2>
                        <div style={{ display: "grid", gap: 8 }}>
                          <label className='cardTitle h5'>Name *</label>
                          <input
                            className='input emptySmall'
                            value={newPassengerName}
                            onChange={(e) =>
                              setNewPassengerName(e.target.value)
                            }
                            placeholder='Passenger name'
                          />
                        </div>
                        <div style={{ display: "grid", gap: 8 }}>
                          <label className='cardTitle h5'>Email</label>
                          <input
                            className='input emptySmall'
                            value={newPassengerEmail}
                            onChange={(e) =>
                              setNewPassengerEmail(e.target.value)
                            }
                            placeholder='Optional'
                            inputMode='email'
                          />
                        </div>
                      </Grid2>
                      <div style={{ display: "grid", gap: 8 }}>
                        <label className='cardTitle h5'>Phone</label>
                        <input
                          className='input emptySmall'
                          value={newPassengerPhone}
                          onChange={(e) => setNewPassengerPhone(e.target.value)}
                          placeholder='Optional'
                          inputMode='tel'
                        />
                      </div>
                      <button
                        type='button'
                        className='secondaryBtn'
                        style={{ justifySelf: "start" }}
                        onClick={() => {
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

                {/* Cost Center & Project Code */}
                <Grid2>
                  <div style={{ display: "grid", gap: 8 }}>
                    <label className='cardTitle h5'>
                      Cost center{" "}
                      <span style={{ fontWeight: 400, opacity: 0.5 }}>
                        (optional)
                      </span>
                    </label>
                    <input
                      className='input emptySmall'
                      value={costCenter}
                      onChange={(e) => setCostCenter(e.target.value)}
                      placeholder='e.g., MKTG-001'
                    />
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <label className='cardTitle h5'>
                      Project code{" "}
                      <span style={{ fontWeight: 400, opacity: 0.5 }}>
                        (optional)
                      </span>
                    </label>
                    <input
                      className='input emptySmall'
                      value={projectCode}
                      onChange={(e) => setProjectCode(e.target.value)}
                      placeholder='e.g., Q1-LAUNCH'
                    />
                  </div>
                </Grid2>

                {attemptTripNext &&
                  selectedService &&
                  selectedService.airportLeg !== "NONE" &&
                  serviceAirports.length === 0 && (
                    <div
                      className='miniNote'
                      style={{ color: "rgba(180,0,0,0.85)" }}
                    >
                      This airport service isn&apos;t configured yet. Please
                      contact Nier Transportation.
                    </div>
                  )}

                {attemptTripNext && tripErrors.routeDistance && (
                  <div
                    className='miniNote'
                    style={{ color: "rgba(180,0,0,0.85)" }}
                  >
                    Route estimate is missing distance. Re-check the route
                    picker selection.
                  </div>
                )}

                {/* Date & Time */}
                <div id='wizard-field-datetime' className={styles.sectionBox}>
                  <label
                    className={cx(
                      "cardTitle h5",
                      tripErrors.dateTime && "redBorder",
                    )}
                  >
                    Pickup date & time
                  </label>
                  <BookingDateTimePicker
                    date={pickupAtDate}
                    time={pickupAtTime}
                    onChangeDate={pickDate}
                    onChangeTime={(t) => setPickupAtTime(t)}
                    timeZone={companyTimezone}
                  />
                </div>

                {attemptTripNext && tripErrors.tooSoon && (
                  <div
                    className='miniNote'
                    style={{ color: "rgba(180,0,0,0.85)" }}
                  >
                    Bookings must be made at least 36 hours in advance. Please
                    select a later date/time, or call for bookings.
                  </div>
                )}

                {/* Passengers & Luggage */}
                <div
                  id='wizard-field-passengers-luggage'
                  className={styles.sectionBox}
                >
                  <Grid2>
                    <div style={{ display: "grid", gap: 8 }}>
                      <label className='cardTitle h5'>Passengers</label>
                      <select
                        value={passengers_count}
                        onChange={(e) =>
                          setPassengersCount(Number(e.target.value))
                        }
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
                    <div style={{ display: "grid", gap: 8 }}>
                      <label className='cardTitle h5'>Luggage</label>
                      <select
                        value={luggage}
                        onChange={(e) => setLuggage(Number(e.target.value))}
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

                {/* Pickup & Dropoff */}
                <div className={styles.pickupDropoffContainer}>
                  <div id='wizard-field-pickup' className={styles.sectionBox}>
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
                          const id = e.target.value;
                          setPickupAirportId(id);
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
                        ref={pickupInputRef}
                        placeholder='Enter pickup address'
                        autoComplete='off'
                        className='input emptySmall'
                      />
                    )}
                  </div>

                  {/* Extra Stops */}
                  {(route?.stops?.length ?? 0) > 0 && (
                    <div className={styles.stopsList}>
                      {route?.stops?.map((stop, index) => (
                        <div key={stop.id} className={styles.stopRow}>
                          <div className={styles.stopBadge}>{index + 1}</div>
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
                              setRoute((prev) => ({
                                pickup: prev?.pickup ?? null,
                                dropoff: prev?.dropoff ?? null,
                                stops: (prev?.stops ?? []).filter(
                                  (s) => s.id !== stop.id,
                                ),
                                miles: null,
                                minutes: null,
                                distanceMiles: null,
                                durationMinutes: null,
                              }));
                            }}
                            className={styles.removeStopBtn}
                            title='Remove stop'
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type='button'
                    onClick={() => {
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
                    className={styles.addStopBtn}
                  >
                    <span>➕</span> Add a stop
                    <span className={styles.addStopFee}>
                      (+$15.00 per stop)
                    </span>
                  </button>

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

                  <div id='wizard-field-dropoff' className={styles.sectionBox}>
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
                          const id = e.target.value;
                          setDropoffAirportId(id);
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
                        ref={dropoffInputRef}
                        placeholder='Enter dropoff address'
                        autoComplete='off'
                        className='input emptySmall'
                      />
                    )}
                  </div>
                </div>

                {/* Hours (HOURLY only) */}
                {selectedService?.pricingStrategy === "HOURLY" && (
                  <>
                    <div style={{ display: "grid", gap: 8 }}>
                      <label className='cardTitle h5'>Hours</label>
                      <input
                        type='number'
                        min={1}
                        step={1}
                        value={hoursRequested}
                        onChange={(e) =>
                          setHoursRequested(
                            Math.max(
                              1,
                              Math.floor(Number(e.target.value) || 1),
                            ),
                          )
                        }
                        className='input emptySmall'
                      />
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                      <label className='cardTitle h5'>
                        Event type (optional)
                      </label>
                      <select
                        value={
                          eventType.startsWith("Other:") ? "Other" : eventType
                        }
                        onChange={(e) => setEventType(e.target.value)}
                        className='selectBorder emptySmall'
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
                          onChange={(e) =>
                            setEventType(
                              e.target.value
                                ? `Other: ${e.target.value}`
                                : "Other",
                            )
                          }
                          className='input emptySmall'
                          placeholder='Describe the event...'
                        />
                      )}
                    </div>
                  </>
                )}

                {/* Flight Info (airport services only) */}
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
                          ? "Provide flight details so we can monitor for delays and adjust pickup time."
                          : "Provide flight details so the driver knows the correct terminal."}
                      </p>
                      <Grid2>
                        <div style={{ display: "grid", gap: 8 }}>
                          <label className='cardTitle h5'>Airline</label>
                          <AirlineSelect
                            value={flightAirline}
                            onChange={(name) => setFlightAirline(name)}
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
                          onFlightNumberChange={(val) => setFlightNumber(val)}
                          onFlightFound={(data) => {
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
                          onChange={(e) => setFlightTerminal(e.target.value)}
                          placeholder='e.g., Terminal 4'
                          className='input emptySmall'
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Route Picker (hidden, wired to pickup/dropoff refs) */}
                <div className={styles.routePickerContainer}>
                  <RoutePicker
                    value={route}
                    onChange={handleRouteChange}
                    pickupInputRef={pickupInputRef}
                    dropoffInputRef={dropoffInputRef}
                    inputsKey={inputsKey}
                  />
                </div>

                {/* Next */}
                <div className={styles.btnRow}>
                  <button
                    type='button'
                    className='primaryBtn'
                    disabled={isPending}
                    onClick={() => {
                      setAttemptTripNext(true);
                      const errs = computeTripErrors();
                      if (Object.values(errs).some(Boolean)) {
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
            )}
            {/* ═══════════ STEP 2: Vehicle ═══════════ */}
            {step === 2 && (
              <div className={`${styles.stepPane} ${styles.contentBox}`}>
                <h2 className='underline'>Choose a vehicle</h2>
                <p className='subheading'>
                  Select a vehicle category for this trip.
                </p>

                <label
                  id='wizard-field-vehicle'
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
                    const rowDiscountCents =
                      discountPercent > 0
                        ? Math.round(rowEstimateCents * (discountPercent / 100))
                        : 0;
                    const rowDisplayCents = rowEstimateCents - rowDiscountCents;
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
                            {v.callForPricing ? (
                              v.callForPricingMessage || "Call for pricing"
                            ) : rowDiscountCents > 0 ? (
                              <>
                                <span
                                  style={{
                                    textDecoration: "line-through",
                                    opacity: 0.5,
                                    marginRight: 6,
                                  }}
                                >
                                  ${centsToUsd(rowEstimateCents)}
                                </span>
                                <span style={{ color: "#15803d" }}>
                                  ${centsToUsd(rowDisplayCents)}
                                </span>
                              </>
                            ) : (
                              `$${centsToUsd(rowEstimateCents)}`
                            )}
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
                        {v.description && (
                          <div style={{ fontSize: 12, opacity: 0.75 }}>
                            {v.description}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Special requests */}
                <div style={{ display: "grid", gap: 8 }}>
                  <div className='cardTitle h5'>
                    Special requests (optional)
                  </div>
                  <textarea
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    className='input subheading'
                    style={{ minHeight: 90 }}
                    placeholder='Child seat, wheelchair needs, meet & greet...'
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
                      setStep(3);
                    }}
                  >
                    Review booking
                  </button>
                </div>
              </div>
            )}
            {/* ═══════════ STEP 3: Review ═══════════ */}
            {step === 3 && (
              <div className={`${styles.stepPane} ${styles.contentBox}`}>
                <h2 className='underline'>Review & Confirm</h2>
                <p className='subheading'>
                  Review the details below, then confirm to book this ride.
                </p>

                <div className='box'>
                  <SummaryRow
                    label='Corporate account'
                    value={corporateAccount.name}
                    strong
                  />
                  <SummaryRow
                    label='Passenger'
                    value={
                      newPassengerMode
                        ? `${newPassengerName.trim()} (new)`
                        : (passengers.find((p) => p.id === corporatePassengerId)
                            ?.name ?? "—")
                    }
                  />

                  {costCenter.trim() && (
                    <SummaryRow label='Cost center' value={costCenter.trim()} />
                  )}
                  {projectCode.trim() && (
                    <SummaryRow
                      label='Project code'
                      value={projectCode.trim()}
                    />
                  )}

                  <SummaryRow
                    label='Service'
                    value={selectedService?.name ?? "—"}
                  />
                  <SummaryRow
                    label='Vehicle'
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
                    </>
                  )}

                  <SummaryRow
                    label='Dropoff'
                    value={route?.dropoff?.address ?? "—"}
                  />

                  {selectedService?.pricingStrategy === "HOURLY" && (
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
                  )}

                  <SummaryRow
                    label='Passengers'
                    value={`${passengers_count} passenger${passengers_count !== 1 ? "s" : ""}, ${luggage} bag${luggage !== 1 ? "s" : ""}`}
                  />

                  {specialRequests?.trim() && (
                    <SummaryRow
                      label='Special requests'
                      value={specialRequests.trim()}
                    />
                  )}

                  {/* Flight info */}
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
                          label='Flight number'
                          value={flightNumber}
                        />
                      )}
                      {flightTerminal && (
                        <SummaryRow label='Terminal' value={flightTerminal} />
                      )}
                    </>
                  )}

                  {/* Pricing */}
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
                      💰 Pricing
                    </div>
                  </div>
                  {selectedVehicle?.callForPricing ? (
                    <>
                      <SummaryRow label='Total' value='To be quoted' strong />
                      <div className='miniNote'>
                        This vehicle requires a custom quote. Submit your
                        request and Nier Transportation will contact you with
                        pricing.
                      </div>
                    </>
                  ) : (
                    <>
                      <SummaryRow
                        label='Subtotal'
                        value={`$${centsToUsd(estimateCents)}`}
                      />
                      {discountAmountCents > 0 && (
                        <SummaryRow
                          label={`Corporate discount (${discountPercent}%)`}
                          value={`−$${centsToUsd(discountAmountCents)}`}
                        />
                      )}
                      <SummaryRow
                        label='Total'
                        value={`$${centsToUsd(displayTotalCents)}`}
                        strong
                      />
                    </>
                  )}

                  <div className={styles.billingNote}>
                    🏢 This ride will appear on your next{" "}
                    <strong>
                      {corporateAccount.billingCycle
                        .replaceAll("_", " ")
                        .toLowerCase()}
                    </strong>{" "}
                    invoice. No payment is needed now.
                  </div>
                </div>

                {/* ─── Saved legs summary (multi-day trip) ─── */}
                {savedLegs.length > 0 && (
                  <div
                    className='box'
                    style={{ background: "rgba(0,0,0,0.02)" }}
                  >
                    <div className='cardTitle h5' style={{ marginBottom: 12 }}>
                      <span style={{ marginRight: 10 }}>🗓️</span> Your multi-day
                      trip ({savedLegs.length + 1} rides)
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
                          <div style={{ fontWeight: 600, fontSize: "1.4rem" }}>
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
                          <span style={{ fontWeight: 700, fontSize: "1.4rem" }}>
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
                          : `$${centsToUsd(displayTotalCents)}`}
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

                {/* "Add another ride" button */}
                <button
                  type='button'
                  onClick={addAnotherRide}
                  className='secondaryBtn'
                  disabled={isPending}
                  style={{ width: "100%", textAlign: "center" }}
                >
                  ➕ Add another ride to this trip
                </button>
                {savedLegs.length === 0 && (
                  <div
                    className='miniNote'
                    style={{ textAlign: "center", marginTop: -4 }}
                  >
                    Need rides on multiple days? Add them all here and submit as
                    one trip.
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
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        await submitBooking();
                      });
                    }}
                  >
                    {isPending
                      ? "Booking..."
                      : isMultiLeg
                        ? `Submit ${savedLegs.length + 1} rides`
                        : "Confirm & Book"}
                  </button>
                </div>
              </div>
            )}
            {/* ═══════════ STEP 4: Confirmed ═══════════ */}
            {step === 4 && (
              <div className={`${styles.stepPane} ${styles.confirmedPane}`}>
                <div className={styles.confirmedIcon}>✅</div>
                <h2 className='underline'>
                  {isMultiLeg ? "Trip Booked!" : "Ride Booked!"}
                </h2>
                <p className='subheading'>
                  {isMultiLeg
                    ? `Your ${savedLegs.length + 1}-ride trip has been confirmed and Nier Transportation has been notified.`
                    : "Your ride has been confirmed and Nier Transportation has been notified."}
                </p>

                <div className='box'>
                  <SummaryRow label='Booking ID' value={bookingId} strong />
                  <SummaryRow label='Status' value='Confirmed' />
                  <SummaryRow
                    label='Passenger'
                    value={
                      newPassengerMode
                        ? newPassengerName.trim()
                        : (passengers.find((p) => p.id === corporatePassengerId)
                            ?.name ?? "—")
                    }
                  />
                  <SummaryRow
                    label='Service'
                    value={selectedService?.name ?? "—"}
                  />
                  <SummaryRow
                    label='Vehicle'
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
                    value={shortAddress(route?.pickup?.address ?? "", 50)}
                  />
                  <SummaryRow
                    label='Dropoff'
                    value={shortAddress(route?.dropoff?.address ?? "", 50)}
                  />
                  <SummaryRow
                    label='Total'
                    value={
                      selectedVehicle?.callForPricing
                        ? "To be quoted"
                        : `$${centsToUsd(displayTotalCents)}`
                    }
                    strong
                  />

                  <div className={styles.billingNote}>
                    🏢 Billed to <strong>{corporateAccount.name}</strong> — this
                    ride will appear on your next{" "}
                    <strong>
                      {corporateAccount.billingCycle
                        .replaceAll("_", " ")
                        .toLowerCase()}
                    </strong>{" "}
                    invoice.
                  </div>
                </div>

                <div className={styles.confirmedActions}>
                  <button
                    type='button'
                    className='primaryBtn'
                    onClick={() => router.push("/corporate/bookings")}
                  >
                    View All Bookings
                  </button>
                  <button
                    type='button'
                    className='secondaryBtn'
                    onClick={() => {
                      // Reset everything for a new booking
                      setStep(1);
                      setBookingId("");
                      setCorporatePassengerId("");
                      setNewPassengerMode(false);
                      setNewPassengerName("");
                      setNewPassengerEmail("");
                      setNewPassengerPhone("");
                      setCostCenter("");
                      setProjectCode("");
                      setServiceTypeId("");
                      setPickupAtDate("");
                      setPickupAtTime("");
                      setPassengersCount(1);
                      setLuggage(0);
                      setHoursRequested(2);
                      setRoute(null);
                      setVehicleId("");
                      setSpecialRequests("");
                      setPickupAirportId("");
                      setDropoffAirportId("");
                      setFlightAirline("");
                      setFlightNumber("");
                      setFlightTerminal("");
                      setFlightScheduledAtDate("");
                      setFlightScheduledAtTime("");
                      setEventType("");
                      setAttemptTripNext(false);
                      setAttemptVehicleNext(false);
                    }}
                  >
                    Book Another Ride
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Remove ride confirmation modal */}
      <Modal isOpen={removeLegId !== null} onClose={() => setRemoveLegId(null)}>
        <div style={{ display: "grid", gap: 16, padding: 8 }}>
          <div className='cardTitle h5'>Remove this ride?</div>
          <p className='paragraph'>
            Are you sure you want to remove this ride from your trip?
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
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

// ───────────── Stepper ─────────────

function CorporateBookingStepper({ step }: { step: WizardStep }) {
  const items = [
    { n: 1 as const, label: "Trip", copy: "Passenger, service, route" },
    { n: 2 as const, label: "Vehicle", copy: "Vehicle category + notes" },
    { n: 3 as const, label: "Review", copy: "Confirm details" },
    { n: 4 as const, label: "Confirmed", copy: "Booking complete" },
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
                  {!isLast && <span className={stepperStyles.connector} />}
                </div>
              </div>
              <div className={stepperStyles.right}>
                <div className={stepperStyles.label}>{it.label}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
