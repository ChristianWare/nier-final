import CorporatePageIntro from "@/components/corporate/CorporatePageIntro/CorporatePageIntro";
import CorporateBenefits from "@/components/corporate/CorporateBenefits/CorporateBenefits";
import CorporateInquirySection from "@/components/corporate/CorporateInquirySection/CorporateInquirySection";
import Nav from "@/components/shared/Nav/Nav";

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
      <CorporateBenefits />
      <CorporateInquirySection />
    </main>
  );
}
