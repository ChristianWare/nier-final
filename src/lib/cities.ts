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
    note: "Home to world-class golf courses like TPC Scottsdale and Troon North",
    src: Scottsdale,
  },
  {
    name: "Phoenix",
    slug: "phoenix",
    note: "Served by Sky Harbor International Airport (PHX)",
    src: Phoenix,
  },
  {
    name: "Tempe",
    slug: "tempe",
    note: "Home to Arizona State University and Tempe Marketplace",
    src: Tempe,
  },
  {
    name: "Mesa",
    slug: "mesa",
    note: "Served by Phoenix-Mesa Gateway Airport (AZA)",
    src: Mesa,
  },
  {
    name: "Chandler",
    slug: "chandler",
    note: "A major corporate and tech hub in the East Valley",
    src: Chandler,
  },
  {
    name: "Gilbert",
    slug: "gilbert",
    note: "One of the fastest-growing communities in the East Valley",
    src: Gilbert,
  },
  {
    name: "Peoria",
    slug: "peoria",
    note: "Home to the Peoria Sports Complex and P83 Entertainment District",
    src: Peoria,
  },
  {
    name: "Glendale",
    slug: "glendale",
    note: "Home to State Farm Stadium and Desert Diamond Arena",
    src: Glendale,
  },
  {
    name: "Paradise Valley",
    slug: "paradise-valley",
    note: "Home to some of Arizona's most prestigious resorts and estates",
    src: ParadiseValley,
  },
  {
    name: "Cave Creek",
    slug: "cave-creek",
    note: "Known for its western charm, art galleries, and luxury desert retreats",
    src: Scottsdale,
  },
  {
    name: "Fountain Hills",
    slug: "fountain-hills",
    note: "Known for the iconic Fountain Park and stunning mountain views",
    src: Mesa,
  },
  {
    name: "Surprise",
    slug: "surprise",
    note: "A growing West Valley community with easy freeway access",
    src: Peoria,
  },
  {
    name: "Goodyear",
    slug: "goodyear",
    note: "A rapidly growing West Valley city near the I-10 corridor",
    src: Glendale,
  },
  {
    name: "Avondale",
    slug: "avondale",
    note: "Home to Phoenix Raceway and major West Valley destinations",
    src: Glendale,
  },
  {
    name: "Buckeye",
    slug: "buckeye",
    note: "A fast-growing community on the western edge of the Valley",
    src: Peoria,
  },
  {
    name: "Litchfield Park",
    slug: "litchfield-park",
    note: "An upscale West Valley community known for The Wigwam resort",
    src: Peoria,
  },
  {
    name: "Sun City",
    slug: "sun-city",
    note: "A premier active adult community in the Northwest Valley",
    src: Glendale,
  },
  {
    name: "Sun City West",
    slug: "sun-city-west",
    note: "A premier active adult community in the Northwest Valley",
    src: Glendale,
  },
  {
    name: "Anthem",
    slug: "anthem",
    note: "A master-planned community at the north end of the Valley",
    src: Phoenix,
  },
  {
    name: "Carefree",
    slug: "carefree",
    note: "A boutique desert town known for its galleries, dining, and luxury homes",
    src: Scottsdale,
  },
  {
    name: "Rio Verde",
    slug: "rio-verde",
    note: "An upscale community in the Sonoran Desert foothills",
    src: Scottsdale,
  },
  {
    name: "Ahwatukee",
    slug: "ahwatukee",
    note: "A South Phoenix community nestled at the base of South Mountain",
    src: Phoenix,
  },
  {
    name: "Laveen",
    slug: "laveen",
    note: "A growing South Phoenix community near the I-10 and Loop 202",
    src: Phoenix,
  },
  {
    name: "Queen Creek",
    slug: "queen-creek",
    note: "A growing Southeast Valley community with easy access to the 24 freeway",
    src: Gilbert,
  },
  {
    name: "San Tan Valley",
    slug: "san-tan-valley",
    note: "A growing Southeast Valley community near San Tan Mountain Regional Park",
    src: Gilbert,
  },
  {
    name: "Maricopa",
    slug: "maricopa",
    note: "A fast-growing city south of the Valley off the SR-347",
    src: Mesa,
  },
  {
    name: "Apache Junction",
    slug: "apache-junction",
    note: "A scenic East Valley city near the Superstition Mountains",
    src: Mesa,
  },
  {
    name: "Gold Canyon",
    slug: "gold-canyon",
    note: "A scenic desert community at the foot of the Superstition Mountains",
    src: Mesa,
  },
  {
    name: "Sedona",
    slug: "sedona",
    note: "A world-renowned red rock destination about two hours north of Phoenix",
    src: ParadiseValley,
  },
  {
    name: "Prescott",
    slug: "prescott",
    note: "A charming mountain city about 90 minutes north of Phoenix",
    src: ParadiseValley,
  },
  {
    name: "Wickenburg",
    slug: "wickenburg",
    note: "A historic desert town northwest of Phoenix known for luxury guest ranches",
    src: Scottsdale,
  },
  {
    name: "Payson",
    slug: "payson",
    note: "A mountain retreat about 90 minutes northeast of Phoenix on the Mogollon Rim",
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
    note: "A mountain city about two hours north of Phoenix near the Grand Canyon",
    src: ParadiseValley,
  },
  {
    name: "Yuma",
    slug: "yuma",
    note: "A city in southwestern Arizona near the California border",
    src: ParadiseValley,
  },
  {
    name: "Tolleson",
    slug: "tolleson",
    note: "A West Valley city with easy access to I-10 and Loop 101",
    src: Glendale,
  },
  {
    name: "El Mirage",
    slug: "el-mirage",
    note: "A Northwest Valley community near Surprise and Peoria",
    src: Peoria,
  },
  {
    name: "New River",
    slug: "new-river",
    note: "A rural community north of Phoenix near the I-17 corridor",
    src: Phoenix,
  },
  {
    name: "Casa Grande",
    slug: "casa-grande",
    note: "A central Arizona city midway between Phoenix and Tucson",
    src: Mesa,
  },
  {
    name: "Florence",
    slug: "florence",
    note: "A historic town in Pinal County southeast of the Valley",
    src: Chandler,
  },
] as const;

export type CityData = (typeof serviceAreaCities)[number];
