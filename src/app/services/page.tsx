import ServicesPreview from "@/components/HomePage/ServicesPreview/ServicesPreview";
import ServicePageIntro from "@/components/ServicesPage/ServicePageIntro/ServicePageIntro";
import ServicesMission from "@/components/ServicesPage/ServicesMission/ServicesMission";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import HowItWorks from "@/components/shared/HowItWorks/HowItWorks";
import Nav from "@/components/shared/Nav/Nav";

export default function ServicesPage() {
  return (
    <main>
      <Nav background='cream' />
      <ServicePageIntro />
      <ServicesMission />
      <ServicesPreview />
      <HowItWorks />
      <AboutNumbers />
    </main>
  );
}
