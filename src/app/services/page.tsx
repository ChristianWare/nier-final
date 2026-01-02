import ServicePageIntro from "@/components/ServicesPage/ServicePageIntro/ServicePageIntro";
import ServicesMission from "@/components/ServicesPage/ServicesMission/ServicesMission";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import Nav from "@/components/shared/Nav/Nav";

export default function ServicesPage() {
  return (
    <main>
      <Nav background='cream' />
      <ServicePageIntro />
      <ServicesMission />
      <AboutNumbers />
    </main>
  );
}
