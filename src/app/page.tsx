import AboutUsIntro from "@/components/HomePage/AboutUsIntro/AboutUsIntro";
import Fleet from "@/components/HomePage/Fleet/Fleet";
import Hero from "@/components/HomePage/Hero/Hero";
import ServiceAreas from "@/components/HomePage/ServiceAreas/ServiceAreas";
import ServicesPreview from "@/components/HomePage/ServicesPreview/ServicesPreview";
import Stats from "@/components/HomePage/Stats/Stats";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import BlogSection from "@/components/shared/BlogSection/BlogSection";
import Faq from "@/components/shared/Faq/Faq";
import FinalCTA from "@/components/shared/FinalCTA/FinalCTA";
import HowItWorks from "@/components/shared/HowItWorks/HowItWorks";
import Testimonials from "@/components/shared/Testimonials/Testimonials";
import { homeQuestions } from "@/lib/data";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <AboutUsIntro />
      <Stats />
      <ServicesPreview />
      <HowItWorks />
      <ServiceAreas />
      <Fleet />
      <Testimonials />
      <Faq items={homeQuestions} />
      <BlogSection />
      {/* <FinalCTA /> */}
      <AboutNumbers />
    </main>
  );
}
