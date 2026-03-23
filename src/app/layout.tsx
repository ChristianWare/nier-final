import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import Footer from "@/components/shared/Footer/Footer";
import SessionProviderWrap from "@/components/Providers/SessionProvider";
import ToastsProvider from "@/components/Providers/ToastsProvider";
import ScrollToTop from "@/components/ServicesPage/ScrollToTop/ScrollToTop";
import PlausibleProvider from "next-plausible";

const inter = Inter({
  variable: "--inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "800", "900"],
});

export const metadata: Metadata = {
  title: "Nier Transportation | Black Car Service Phoenix & Scottsdale",
  description:
    "Phoenix and Scottsdale's trusted black car service since 2004. Flat-rate airport transfers, hourly chauffeur, corporate rides, and weddings. No surge pricing, available 24/7.",
  openGraph: {
    title: "Nier Transportation | Black Car Service Phoenix & Scottsdale",
    description:
      "Phoenix and Scottsdale's trusted black car service since 2004. Flat-rate airport transfers, hourly chauffeur, corporate rides, and weddings. No surge pricing, available 24/7.",
    url: "https://www.niertransportation.com",
    siteName: "Nier Transportation",
    type: "website",
    images: [
      {
        url: "https://www.niertransportation.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Nier Transportation — Black Car Service Phoenix & Scottsdale",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nier Transportation | Black Car Service Phoenix & Scottsdale",
    description:
      "Phoenix and Scottsdale's trusted black car service since 2004. No surge pricing, available 24/7.",
    images: ["https://www.niertransportation.com/og-image.png"],
  },
};
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Nier Transportation",
  url: "https://www.niertransportation.com",
  logo: "https://www.niertransportation.com/nierLogo.png",
  image: "https://www.niertransportation.com/nierLogo.png",
  telephone: "+1-480-300-6003",
  email: "info@niertransportation.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "10105 E Via Linda, Ste A-105",
    addressLocality: "Scottsdale",
    addressRegion: "AZ",
    postalCode: "85258",
    addressCountry: "US",
  },
  areaServed: [
    "Phoenix, AZ",
    "Scottsdale, AZ",
    "Tempe, AZ",
    "Mesa, AZ",
    "Chandler, AZ",
    "Gilbert, AZ",
    "Peoria, AZ",
    "Glendale, AZ",
    "Paradise Valley, AZ",
    "Cave Creek, AZ",
    "Fountain Hills, AZ",
    "Surprise, AZ",
    "Goodyear, AZ",
    "Avondale, AZ",
    "Buckeye, AZ",
    "Litchfield Park, AZ",
    "Tolleson, AZ",
    "El Mirage, AZ",
    "Youngtown, AZ",
    "Sun City, AZ",
    "Sun City West, AZ",
    "Anthem, AZ",
    "New River, AZ",
    "Carefree, AZ",
    "Rio Verde, AZ",
    "Ahwatukee, AZ",
    "Laveen, AZ",
    "Queen Creek, AZ",
    "San Tan Valley, AZ",
    "Maricopa, AZ",
    "Casa Grande, AZ",
    "Coolidge, AZ",
    "Florence, AZ",
    "Apache Junction, AZ",
    "Gold Canyon, AZ",
    "Sedona, AZ",
    "Prescott, AZ",
    "Wickenburg, AZ",
    "Payson, AZ",
    "Tucson, AZ",
  ],
  sameAs: [
    // Add social profile URLs here when ready, e.g.:
    // "https://www.facebook.com/niertransportation",
    "https://www.instagram.com/niertransportation",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <head>
        {/* ── Cloudinary preconnect ── */}
        <link rel='preconnect' href='https://res.cloudinary.com' />

        {/* ── PWA ── */}
        <link rel='manifest' href='/manifest.json' />
        <meta name='theme-color' content='#000000' />
        <meta name='apple-mobile-web-app-capable' content='yes' />
        <meta
          name='apple-mobile-web-app-status-bar-style'
          content='black-translucent'
        />
        <meta name='apple-mobile-web-app-title' content='Nier' />
        <link rel='apple-touch-icon' href='/apple-touch-icon.png' />
      </head>
      <body className={`${inter.variable} `}>
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
        <ScrollToTop />
        <PlausibleProvider
          domain='niertransportation.com'
          trackLocalhost={false}
          enabled={true}
        >
          <SessionProviderWrap>
            <ToastsProvider />
            {children}
            <Footer />
          </SessionProviderWrap>
        </PlausibleProvider>
      </body>
    </html>
  );
}
