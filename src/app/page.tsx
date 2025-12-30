import AboutUsIntro from "@/components/HomePage/AboutUsIntro/AboutUsIntro";
import Hero from "@/components/HomePage/Hero/Hero";
// import ServicesPreview from "@/components/HomePage/ServicesPreview/ServicesPreview";
import Stats from "@/components/HomePage/Stats/Stats";
import HowItWorks from "@/components/shared/HowItWorks/HowItWorks";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <AboutUsIntro />
      <Stats />
      {/* <ServicesPreview /> */}
      <HowItWorks />
    </main>
  );
}
