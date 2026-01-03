"use client";

import FleetDetails from "../FleetDetails/FleetDetails";
import FleetSlugPageIntro from "../FleetSlugPageIntro/FleetSlugPageIntro";

import { fleetData } from "@/lib/data";

type Vehicle = (typeof fleetData)[number];

export default function FleetDetailsClient({ vehicle }: { vehicle: Vehicle }) {
  return (
    <main>
      <FleetSlugPageIntro vehicle={vehicle} />
      <FleetDetails vehicle={vehicle} />
    </main>
  );
}
