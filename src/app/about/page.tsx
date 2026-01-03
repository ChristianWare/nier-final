import AboutPageIntro from "@/components/AboutPage/AboutPageIntro/AboutPageIntro";
import AboutTestimonials from "@/components/AboutPage/AboutTestimonials/AboutTestimonials";
import Areas from "@/components/AboutPage/Areas/Areas";
import MissionValues from "@/components/AboutPage/MissionValues/MissionValues";
import Story from "@/components/AboutPage/Story/Story";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import BlogSection from "@/components/shared/BlogSection/BlogSection";
import Faq from "@/components/shared/Faq/Faq";
import Nav from "@/components/shared/Nav/Nav";
import { aboutQuestions } from "@/lib/data";

export default function AboutPage() {
  return (
    <main>
      <Nav background='white' />
      <AboutPageIntro />
      <Story />
      <MissionValues />
      <Areas />
      <AboutTestimonials />
      <Faq items={aboutQuestions} />
      <BlogSection />
      <AboutNumbers />
    </main>
  );
}
