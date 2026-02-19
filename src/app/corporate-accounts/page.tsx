import CorporatePageIntro from "@/components/corporate/CorporatePageIntro/CorporatePageIntro";
import CorporateBenefits from "@/components/corporate/CorporateBenefits/CorporateBenefits";
import CorporateInquirySection from "@/components/corporate/CorporateInquirySection/CorporateInquirySection";
import Nav from "@/components/shared/Nav/Nav";
import WhyCorporate from "@/components/corporate/ WhyCorporate/WhyCorporate";
import { homeQuestions } from "@/lib/data";
import Faq from "@/components/shared/Faq/Faq";
import BlogSection from "@/components/shared/BlogSection/BlogSection";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import WhoWeWorkWith from "@/components/corporate/WhoWeWorkWith/WhoWeWorkWith";

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
      <CorporateInquirySection />
      <Faq items={homeQuestions} />
      <BlogSection />
      <AboutNumbers />
    </main>
  );
}
