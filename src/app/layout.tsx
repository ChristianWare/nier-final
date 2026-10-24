import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import Footer from "@/components/shared/Footer/Footer";
import SessionProviderWrap from "@/components/Providers/SessionProvider";
import ToastsProvider from "@/components/Providers/ToastsProvider";
import ScrollToTop from "@/components/ServicesPage/ScrollToTop/ScrollToTop";
import PlausibleProvider from "next-plausible";
import { buildBusinessSchema } from "@/lib/schema";
import { getCompanySettings } from "../../actions/admin/companySettings";

const inter = Inter({
  variable: "--inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "800", "900"],
});

export const metadata: Metadata = {
  // Resolves relative canonical/og URLs. Pages that set their own openGraph
  // should pass `url: "/their-path"`; pages that don't now get no og:url
  // instead of the homepage's (which Facebook/LinkedIn treated as canonical).
  metadataBase: new URL("https://www.niertransportation.com"),
  title: "Nier Transportation | Black Car Service Phoenix & Scottsdale",
  description:
    "Phoenix and Scottsdale's trusted black car service since 2004. Flat-rate airport transfers, hourly chauffeur, corporate rides, and weddings. No surge pricing, available 24/7.",
  openGraph: {
    title: "Nier Transportation | Black Car Service Phoenix & Scottsdale",
    description:
      "Phoenix and Scottsdale's trusted black car service since 2004. Flat-rate airport transfers, hourly chauffeur, corporate rides, and weddings. No surge pricing, available 24/7.",
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
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Same settings the footer reads; its social URLs feed `sameAs`/`hasMap`.
  const settings = await getCompanySettings();
  const businessSchema = buildBusinessSchema(settings);

  return (
    <html lang='en'>
      <head>
      
        {/* ── Cloudinary preconnect ── */}
        {/* <link rel='preconnect' href='https://res.cloudinary.com' /> */}
        {/* <link
          rel='preload'
          href='https://res.cloudinary.com/dkxlrhwjd/video/upload/q_auto/phx_y9t0y5.mp4'
          as='video'
          type='video/mp4'
        /> */}
        <link rel='preconnect' href='https://plausible.io' />

        <link
          rel='preconnect'
          href='https://res.cloudinary.com'
          crossOrigin='anonymous'
        />
        <link
          rel='preload'
          as='image'
          href='https://res.cloudinary.com/dkxlrhwjd/image/upload/w_750,q_60,f_auto/phx-poster_bps55j'
          media='(max-width: 768px)'
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
            __html: JSON.stringify(businessSchema),
          }}
        />
        <ScrollToTop />
        <PlausibleProvider
          domain='niertransportation.com'
          // Staff and signed-in areas aren't site traffic: Barry, the
          // drivers and account holders would otherwise count as visitors.
          exclude='/admin, /admin/**, /driver-dashboard, /driver-dashboard/**, /dashboard, /dashboard/**, /account, /account/**, /corporate, /corporate/**, /studio, /studio/**'
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
