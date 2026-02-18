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
  rateRules?: {
    minimumHours?: number;
    hourlyFromUSD?: number;
    airportTransferFromUSD?: number;
    meetAndGreetUSD?: number;
    afterHoursSurchargePct?: number;
    waitTimeGraceMin?: number;
    extraStopUSD?: number;
  };
  policy?: {
    summary: string;
    details: string[];
  };
  faqs?: ReadonlyArray<{ q: string; a: string }>;

  // SEO
  seo?: {
    metaTitle: string;
    metaDescription: string;
  };

  // legacy card copy
  desc?: string;
};
