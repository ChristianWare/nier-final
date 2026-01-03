import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./BlogPageIntro.module.css";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";

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
          <div className={styles.searchBar}>
            <span className={styles.text}>Search the blog</span>
            <div className={styles.btnContainer}>
              <Button href='/' text='Search' btnType='underlinedBlack' arrow />
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </div>
  );
}
