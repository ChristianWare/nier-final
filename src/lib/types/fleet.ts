/* eslint-disable @typescript-eslint/no-explicit-any */
export type Vehicle = {
  id: number;
  title: string;
  slug: string;
  class: string;
  heroLine?: string;
  shortDesc?: string;
  longDesc?: string;

  // card/meta stats
  seats: string; // e.g., "7 seater"
  luggage?: string; // e.g., "5–7 standard bags"
  cargo?: string; // e.g., "144.7 cu ft"
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
  src?: any; // fallback single image (your current card import)

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
