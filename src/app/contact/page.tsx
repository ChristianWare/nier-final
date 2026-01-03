import AboutTestimonials from "@/components/AboutPage/AboutTestimonials/AboutTestimonials";
import ContactPageIntro from "@/components/ContactPage/ContactPageIntro/ContactPageIntro";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import BlogSection from "@/components/shared/BlogSection/BlogSection";
import Nav from "@/components/shared/Nav/Nav";

export default function ContactPage() {
  return (
    <main>
      <Nav background='cream' />
      <ContactPageIntro />
      <AboutTestimonials />
      <BlogSection />
      <AboutNumbers />
    </main>
  );
}
