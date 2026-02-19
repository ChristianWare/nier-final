/* eslint-disable @typescript-eslint/no-unused-vars */
import Scottsdale from "../../public/images/scottsdale.jpg";
import Phoenix from "../../public/images/phoenix.jpg";
import Tempe from "../../public/images/tempe.jpg";
import Mesa from "../../public/images/mesa.jpg";
import Chandler from "../../public/images/chandler.jpg";
import Gilbert from "../../public/images/gilbert.webp";
import Peoria from "../../public/images/westValleyiii.jpg";
import Glendale from "../../public/images/westValleyii.jpg";
import ParadiseValley from "../../public/images/yuma.jpg";
import type { StaticImageData } from "next/image";

export const serviceAreaCities = [
  {
    name: "Scottsdale",
    slug: "scottsdale",
    note: "home to world-class golf courses like TPC Scottsdale and Troon North",
    src: Scottsdale,
  },
  {
    name: "Phoenix",
    slug: "phoenix",
    note: "served by Sky Harbor International Airport (PHX)",
    src: Phoenix,
  },
  {
    name: "Tempe",
    slug: "tempe",
    note: "home to Arizona State University and Tempe Marketplace",
    src: Tempe,
  },
  {
    name: "Mesa",
    slug: "mesa",
    note: "served by Phoenix-Mesa Gateway Airport (AZA)",
    src: Mesa,
  },
  {
    name: "Chandler",
    slug: "chandler",
    note: "a major corporate and tech hub in the East Valley",
    src: Chandler,
  },
  {
    name: "Gilbert",
    slug: "gilbert",
    note: "one of the fastest-growing communities in the East Valley",
    src: Gilbert,
  },
  {
    name: "Peoria",
    slug: "peoria",
    note: "home to the Peoria Sports Complex and P83 Entertainment District",
    src: Peoria,
  },
  {
    name: "Glendale",
    slug: "glendale",
    note: "home to State Farm Stadium and Desert Diamond Arena",
    src: Glendale,
  },
  {
    name: "Paradise Valley",
    slug: "paradise-valley",
    note: "home to some of Arizona's most prestigious resorts and estates",
    src: ParadiseValley,
  },
  {
    name: "Cave Creek",
    slug: "cave-creek",
    note: "known for its western charm, art galleries, and luxury desert retreats",
    src: Scottsdale,
  },
  {
    name: "Fountain Hills",
    slug: "fountain-hills",
    note: "known for the iconic Fountain Park and stunning mountain views",
    src: Mesa,
  },
  {
    name: "Surprise",
    slug: "surprise",
    note: "a growing West Valley community with easy freeway access",
    src: Peoria,
  },
  {
    name: "Goodyear",
    slug: "goodyear",
    note: "a rapidly growing West Valley city near the I-10 corridor",
    src: Glendale,
  },
  {
    name: "Avondale",
    slug: "avondale",
    note: "home to Phoenix Raceway and major West Valley destinations",
    src: Glendale,
  },
  {
    name: "Buckeye",
    slug: "buckeye",
    note: "a fast-growing community on the western edge of the Valley",
    src: Peoria,
  },
  {
    name: "Litchfield Park",
    slug: "litchfield-park",
    note: "an upscale West Valley community known for The Wigwam resort",
    src: Peoria,
  },
  {
    name: "Sun City",
    slug: "sun-city",
    note: "a premier active adult community in the Northwest Valley",
    src: Glendale,
  },
  {
    name: "Sun City West",
    slug: "sun-city-west",
    note: "a premier active adult community in the Northwest Valley",
    src: Glendale,
  },
  {
    name: "Anthem",
    slug: "anthem",
    note: "a master-planned community at the north end of the Valley",
    src: Phoenix,
  },
  {
    name: "Carefree",
    slug: "carefree",
    note: "a boutique desert town known for its galleries, dining, and luxury homes",
    src: Scottsdale,
  },
  {
    name: "Rio Verde",
    slug: "rio-verde",
    note: "an upscale community in the Sonoran Desert foothills",
    src: Scottsdale,
  },
  {
    name: "Ahwatukee",
    slug: "ahwatukee",
    note: "a South Phoenix community nestled at the base of South Mountain",
    src: Phoenix,
  },
  {
    name: "Laveen",
    slug: "laveen",
    note: "a growing South Phoenix community near the I-10 and Loop 202",
    src: Phoenix,
  },
  {
    name: "Queen Creek",
    slug: "queen-creek",
    note: "a growing Southeast Valley community with easy access to the 24 freeway",
    src: Gilbert,
  },
  {
    name: "San Tan Valley",
    slug: "san-tan-valley",
    note: "a growing Southeast Valley community near San Tan Mountain Regional Park",
    src: Gilbert,
  },
  {
    name: "Maricopa",
    slug: "maricopa",
    note: "a fast-growing city south of the Valley off the SR-347",
    src: Mesa,
  },
  {
    name: "Apache Junction",
    slug: "apache-junction",
    note: "a scenic East Valley city near the Superstition Mountains",
    src: Mesa,
  },
  {
    name: "Gold Canyon",
    slug: "gold-canyon",
    note: "a scenic desert community at the foot of the Superstition Mountains",
    src: Mesa,
  },
  {
    name: "Sedona",
    slug: "sedona",
    note: "a world-renowned red rock destination about two hours north of Phoenix",
    src: ParadiseValley,
  },
  {
    name: "Prescott",
    slug: "prescott",
    note: "a charming mountain city about 90 minutes north of Phoenix",
    src: ParadiseValley,
  },
  {
    name: "Wickenburg",
    slug: "wickenburg",
    note: "a historic desert town northwest of Phoenix known for luxury guest ranches",
    src: Scottsdale,
  },
  {
    name: "Payson",
    slug: "payson",
    note: "a mountain retreat about 90 minutes northeast of Phoenix on the Mogollon Rim",
    src: ParadiseValley,
  },
  {
    name: "Tucson",
    slug: "tucson",
    note: "Arizona's second-largest city, about 115 miles south of Phoenix",
    src: Phoenix,
  },
  {
    name: "Flagstaff",
    slug: "flagstaff",
    note: "a mountain city about two hours north of Phoenix near the Grand Canyon",
    src: ParadiseValley,
  },
  {
    name: "Yuma",
    slug: "yuma",
    note: "a city in southwestern Arizona near the California border",
    src: ParadiseValley,
  },
  {
    name: "Tolleson",
    slug: "tolleson",
    note: "a West Valley city with easy access to I-10 and Loop 101",
    src: Glendale,
  },
  {
    name: "El Mirage",
    slug: "el-mirage",
    note: "a Northwest Valley community near Surprise and Peoria",
    src: Peoria,
  },
  {
    name: "New River",
    slug: "new-river",
    note: "a rural community north of Phoenix near the I-17 corridor",
    src: Phoenix,
  },
  {
    name: "Casa Grande",
    slug: "casa-grande",
    note: "a central Arizona city midway between Phoenix and Tucson",
    src: Mesa,
  },
  {
    name: "Florence",
    slug: "florence",
    note: "a historic town in Pinal County southeast of the Valley",
    src: Chandler,
  },
] as const;

export type CityData = (typeof serviceAreaCities)[number];
