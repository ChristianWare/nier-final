import FleetPageIntro from "@/components/FleetpAge/FleetPageIntro/FleetPageIntro";
import FleetPostHero from "@/components/FleetpAge/FleetPostHero/FleetPostHero";
import Fleet from "@/components/HomePage/Fleet/Fleet";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import BlogSection from "@/components/shared/BlogSection/BlogSection";
import Faq from "@/components/shared/Faq/Faq";
import Nav from "@/components/shared/Nav/Nav";
import { homeQuestions } from "@/lib/data";

export default function FleetPage() {
  return (
    <main>
      <Nav background='accent' />
      <FleetPageIntro />
      <FleetPostHero />
      <Fleet />
      <Faq items={homeQuestions} />
      <BlogSection />
      <AboutNumbers />
    </main>
  );
}
