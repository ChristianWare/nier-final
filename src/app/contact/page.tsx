import AboutTestimonials from "@/components/AboutPage/AboutTestimonials/AboutTestimonials";
import ContactPageIntro from "@/components/ContactPage/ContactPageIntro/ContactPageIntro";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import BlogSection from "@/components/shared/BlogSection/BlogSection";
import FinalCTA from "@/components/shared/FinalCTA/FinalCTA";
import Nav from "@/components/shared/Nav/Nav";
import type { Metadata } from "next";
import { BUSINESS_REF } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Contact Us | Nier Transportation",
  description:
    "Get in touch with Nier Transportation — luxury black car service in Scottsdale and Phoenix. Available 24/7 for bookings, inquiries, and corporate accounts.",
};

const contactSchema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Contact Nier Transportation",
  description:
    "Contact Nier Transportation for luxury black car service in Scottsdale, Phoenix, and greater Metro Phoenix. Available 24/7.",
  url: "https://www.niertransportation.com/contact",
  mainEntity: BUSINESS_REF,
};

export default function ContactPage() {
  return (
    <main>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactSchema) }}
      />
      <Nav background='cream' />
      <ContactPageIntro />
      <AboutTestimonials />
      <FinalCTA />
      <BlogSection />
      <AboutNumbers />
    </main>
  );
}
