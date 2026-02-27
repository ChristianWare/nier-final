import CharterBenefits from "@/components/charterPage/CharterBenefits/CharterBenefits";
import CharterClients from "@/components/charterPage/CharterClients/CharterClients";
import CharterPageIntro from "@/components/charterPage/CharterPageIntro/CharterPageIntro";
import CharterPricing from "@/components/charterPage/CharterPricing/CharterPricing";
import WhyCharter from "@/components/charterPage/WhyCharter/WhyCharter";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import BlogSection from "@/components/shared/BlogSection/BlogSection";
import Faq from "@/components/shared/Faq/Faq";
import Nav from "@/components/shared/Nav/Nav";
import { homeQuestions } from "@/lib/data";

export default function CharterBusRentalPage() {
  return (
    <main>
      <Nav background='white' />
      <CharterPageIntro />
      <WhyCharter />
      <CharterBenefits />
      <CharterClients />
      <CharterPricing />
      <Faq items={homeQuestions} />
      <BlogSection />
      <AboutNumbers />
    </main>
  );
}
