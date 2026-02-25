import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import Footer from "@/components/shared/Footer/Footer";
import SessionProviderWrap from "@/components/Providers/SessionProvider";
import ToastsProvider from "@/components/Providers/ToastsProvider";
import ScrollToTop from "@/components/ServicesPage/ScrollToTop/ScrollToTop";

const inter = Inter({
  variable: "--inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "800", "900"],
});

export const metadata: Metadata = {
  title:
    "Nier Transportation | Luxury Black Car Service in Scottsdale & Phoenix",
  description:
    "Professional black car and limousine service in Scottsdale, Phoenix, and the greater Metro Phoenix area. Airport transfers, hourly chauffeur, and special events. Available 24/7.",
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
        {/* ── Video preload — loads hero video before React mounts ── */}
        <link
          rel='preload'
          href='/videos/phx.mp4'
          as='video'
          type='video/mp4'
        />

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
        <SessionProviderWrap>
          <ToastsProvider />
          {children}
          <Footer />
        </SessionProviderWrap>
      </body>
    </html>
  );
}
