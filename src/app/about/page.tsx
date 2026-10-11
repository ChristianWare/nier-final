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
