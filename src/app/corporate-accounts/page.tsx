import CorporatePageIntro from "@/components/corporate/CorporatePageIntro/CorporatePageIntro";
import CorporateBenefits from "@/components/corporate/CorporateBenefits/CorporateBenefits";
import CorporateInquirySection from "@/components/corporate/CorporateInquirySection/CorporateInquirySection";
import Nav from "@/components/shared/Nav/Nav";
import WhyCorporate from "@/components/corporate/ WhyCorporate/WhyCorporate";
import { corporateQuestions } from "@/lib/data";
import Faq from "@/components/shared/Faq/Faq";
import BlogSection from "@/components/shared/BlogSection/BlogSection";
import WhoWeWorkWith from "@/components/corporate/WhoWeWorkWith/WhoWeWorkWith";
import AboutTestimonials from "@/components/AboutPage/AboutTestimonials/AboutTestimonials";
import SimplifyCTA from "@/components/corporate/SimplifyCTA/SimplifyCTA";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import PastClients from "@/components/corporate/PastClients/PastClients";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Corporate Accounts | Black Car Service Phoenix & Scottsdale",
  description:
    "Streamline your company's ground transportation with Nier Transportation. Centralized billing, dedicated support, and negotiated rates for businesses in Phoenix and Scottsdale.",
};

const corporateSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Corporate Transportation Accounts",
  url: "https://www.niertransportation.com/corporate",
  description:
    "Centralized corporate ground transportation accounts for businesses in Phoenix, Scottsdale, and greater Metro Phoenix. Dedicated billing, reporting, and priority booking.",
  provider: {
    "@type": "LocalBusiness",
    name: "Nier Transportation",
    url: "https://www.niertransportation.com",
  },
  areaServed: {
    "@type": "State",
    name: "Arizona",
  },
  serviceType: "Corporate Ground Transportation",
  audience: {
    "@type": "BusinessAudience",
    audienceType: "Corporate",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: corporateQuestions.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default function CorporateAccountsPage() {
  return (
    <main>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(corporateSchema) }}
      />
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Nav background='white' />
      <CorporatePageIntro />
      <WhyCorporate />
      <CorporateBenefits />
      <PastClients />
      <WhoWeWorkWith />
      <AboutTestimonials />
      <Faq items={corporateQuestions} />
      <SimplifyCTA />
      <CorporateInquirySection />
      <BlogSection />
      <AboutNumbers />
    </main>
  );
}
