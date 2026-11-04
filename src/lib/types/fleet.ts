/* eslint-disable @typescript-eslint/no-explicit-any */
export type VehicleData = {
  id: number;
  title: string;
  slug: string;
  class: string;
  heroLine?: string;
  shortDesc?: string;
  longDesc?: string;

  // card/meta stats
  seats: string;
  luggage?: string;
  cargo?: string;
  cargoCuFt?: string;

  // extra content
  bestFor?: ReadonlyArray<string>;
  specs?: {
    drivetrain?: string;
    rideFeel?: string;
    cabin?: string;
    dimensions?: string;
  };
  amenities?: ReadonlyArray<string>;
  safetyTech?: ReadonlyArray<string>;
  features?: ReadonlyArray<string>;
  availabilityNotes?: string;

  // images
  images?: ReadonlyArray<{ src: any; alt: string }>;
  src?: any;

  // pricing/policy
  /**
   * @deprecated Prices now come from Admin → Vehicle Categories (see
   * lib/booking/publicRates.ts) and the shared rules in lib/booking/rules.ts.
   * Kept only so old components still type-check; no vehicle sets it.
   */
  rateRules?: {
    minimumHours?: number;
    hourlyFromUSD?: number;
    airportTransferFromUSD?: number;
    meetAndGreetUSD?: number;
    afterHoursSurchargePct?: number;
    waitTimeGraceMin?: number;
    extraStopUSD?: number;
  };
  /** @deprecated Cancellation timing is shared: CANCELLATION_POLICY. */
  policy?: {
    summary: string;
    details: string[];
  };
  /** Vehicle-specific policy lines (deposits, cleaning fees). */
  policyNotes?: ReadonlyArray<string>;
  faqs?: ReadonlyArray<{ q: string; a: string }>;

  // SEO
  seo?: {
    metaTitle: string;
    metaDescription: string;
  };

  // legacy card copy
  desc?: string;
};
