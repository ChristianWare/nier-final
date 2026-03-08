import { serviceQuestions, services } from "@/lib/data";
import ServicesPreview from "@/components/HomePage/ServicesPreview/ServicesPreview";
import ServicePageIntro from "@/components/ServicesPage/ServicePageIntro/ServicePageIntro";
import ServicesMission from "@/components/ServicesPage/ServicesMission/ServicesMission";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import HowItWorks from "@/components/shared/HowItWorks/HowItWorks";
import Nav from "@/components/shared/Nav/Nav";
import type { Metadata } from "next";
import Faq from "@/components/shared/Faq/Faq";
import Img2 from "../../../public/images/people/linda.jpg";
import Img1 from "../../../public/images/other/services.jpg";

export const metadata: Metadata = {
  title: "Services | Luxury Black Car & Limo Service Phoenix",
  description:
    "Luxury ground transportation in Phoenix and Scottsdale — airport transfers, hourly chauffeur, corporate travel, weddings, and special events. Available 24/7.",
};

const servicesSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Nier Transportation Services",
  url: "https://www.niertransportation.com/services",
  description:
    "Luxury black car and limousine services serving Phoenix, Scottsdale, and greater Metro Phoenix.",
  itemListElement: services.map((service, index) => ({
    "@type": "ListItem",
    position: index + 1,
    item: {
      "@type": "Service",
      name: service.title,
      description: service.description,
      url: `https://www.niertransportation.com/services/${service.slug}`,
      provider: {
        "@type": "LocalBusiness",
        name: "Nier Transportation",
        url: "https://www.niertransportation.com",
      },
      areaServed: {
        "@type": "State",
        name: "Arizona",
      },
      serviceType: "Ground Transportation",
    },
  })),
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: serviceQuestions.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default function ServicesPage() {
  return (
    <main>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(servicesSchema) }}
      />
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Nav background='cream' />
      <ServicePageIntro
        heading='Chauffeur servicestailored to every journey.'
        label='Services'
        stat={{
          quote:
            "Have used this service multiple times. The drivers are great. Always very professional and prompt. You can tell they care about safety and a great customer experience, would definitely recommend it.",
          authorImage: Img2,
          authorName: "Illeana L.",
        }}
        heroImage={Img1}
      />{" "}
      <ServicesMission />
      <ServicesPreview />
      <HowItWorks />
      <Faq items={serviceQuestions} />
      <AboutNumbers />
    </main>
  );
}
