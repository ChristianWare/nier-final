import AboutPageIntro from "@/components/AboutPage/AboutPageIntro/AboutPageIntro";
import AboutTestimonials from "@/components/AboutPage/AboutTestimonials/AboutTestimonials";
import Areas from "@/components/AboutPage/Areas/Areas";
import MissionValues from "@/components/AboutPage/MissionValues/MissionValues";
import Story from "@/components/AboutPage/Story/Story";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import BlogSection from "@/components/shared/BlogSection/BlogSection";
import Faq from "@/components/shared/Faq/Faq";
import Nav from "@/components/shared/Nav/Nav";
import { aboutQuestions } from "@/lib/data";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Nier Transportation | Luxury Black Car Service",
  description:
    "Family-owned since 2004, Nier Transportation provides luxury black car and limousine service throughout Phoenix and Scottsdale. Learn our story and values.",
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://www.niertransportation.com/#business",
  name: "Nier Transportation",
  url: "https://www.niertransportation.com",
  logo: "https://www.niertransportation.com/nierLogo.png",
  telephone: "+1-480-300-6003",
  email: "info@niertransportation.com",
  foundingDate: "2004",
  description:
    "Family-owned luxury black car and limousine service serving Phoenix, Scottsdale, and greater Metro Phoenix since 2004.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "10105 E Via Linda, Ste A-105",
    addressLocality: "Scottsdale",
    addressRegion: "AZ",
    postalCode: "85258",
    addressCountry: "US",
  },
  areaServed: {
    "@type": "State",
    name: "Arizona",
  },
  priceRange: "$$$",
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: aboutQuestions.map((q) => ({
    "@type": "Question",
    name: q.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: q.answer,
    },
  })),
};

export default function AboutPage() {
  return (
    <main>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(localBusinessSchema),
        }}
      />
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Nav background='white' />
      <AboutPageIntro />
      <Story />
      <MissionValues />
      <Areas />
      <AboutTestimonials />
      <Faq items={aboutQuestions} />
      <BlogSection />
      <AboutNumbers />
    </main>
  );
}
