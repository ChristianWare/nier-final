import AboutUsIntro from "@/components/HomePage/AboutUsIntro/AboutUsIntro";
import Fleet from "@/components/HomePage/Fleet/Fleet";
import Hero from "@/components/HomePage/Hero/Hero";
import ServiceAreas from "@/components/HomePage/ServiceAreas/ServiceAreas";
import ServicesPreview from "@/components/HomePage/ServicesPreview/ServicesPreview";
import Stats from "@/components/HomePage/Stats/Stats";
import HowItWorks from "@/components/shared/HowItWorks/HowItWorks";
import Testimonials from "@/components/shared/Testimonials/Testimonials";

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
    </main>
  );
}
