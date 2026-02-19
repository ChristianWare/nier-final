import CorporatePageIntro from "@/components/corporate/CorporatePageIntro/CorporatePageIntro";
import CorporateBenefits from "@/components/corporate/CorporateBenefits/CorporateBenefits";
import CorporateInquirySection from "@/components/corporate/CorporateInquirySection/CorporateInquirySection";
import Nav from "@/components/shared/Nav/Nav";
import WhyCorporate from "@/components/corporate/ WhyCorporate/WhyCorporate";
import { homeQuestions } from "@/lib/data";
import Faq from "@/components/shared/Faq/Faq";
import BlogSection from "@/components/shared/BlogSection/BlogSection";
import WhoWeWorkWith from "@/components/corporate/WhoWeWorkWith/WhoWeWorkWith";
import AboutTestimonials from "@/components/AboutPage/AboutTestimonials/AboutTestimonials";
import SimplifyCTA from "@/components/corporate/SimplifyCTA/SimplifyCTA";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";

export const metadata = {
  title: "Corporate Accounts | Nier Transportation",
  description:
    "Streamline your company's ground transportation with Nier Transportation's corporate accounts. Centralized billing, dedicated support, and negotiated rates.",
};

export default function CorporateAccountsPage() {
  return (
    <main>
      <Nav background='white' />
      <CorporatePageIntro />
      <WhyCorporate />
      <CorporateBenefits />
      <WhoWeWorkWith />
      <AboutTestimonials />
      <Faq items={homeQuestions} />
      <SimplifyCTA />
      <CorporateInquirySection />
      <BlogSection />
      <AboutNumbers />
    </main>
  );
}
