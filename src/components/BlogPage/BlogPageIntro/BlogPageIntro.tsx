import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./BlogPageIntro.module.css";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import BlogSearchBar from "../BlogSearchBar/BlogSearchBar";

export default function BlogPageIntro() {
  return (
    <div className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <SectionHeading text='Blog' dot />
          <h1 className={styles.heading}>
            Tips, insights, and <br className={styles.br} /> updates from the
            team
          </h1>
          <p className={styles.copy}>
            Stay informed with our latest news, expert advice, and in-depth
            articles designed to help you make the most of your travel
            experiences.
          </p>
          <BlogSearchBar />
        </div>
      </LayoutWrapper>
    </div>
  );
}
