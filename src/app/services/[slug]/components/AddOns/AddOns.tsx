import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./AddOns.module.css";
import Button from "@/components/shared/Button/Button";

type AddOnItem = {
  id: number | string;
  title: string;
  description?: string;
};

export default function AddOns({
  items,
  //   heading = "Learn to drive with confidence, easy steps to your license",
  ctaHref = "/",
  ctaText = "Book your ride",
}: {
  items: ReadonlyArray<AddOnItem>;
  heading?: string;
  ctaHref?: string;
  ctaText?: string;
}) {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            <h2 className={`${styles.heading} h3`}>
              Feel free to ask your driver for these additional add-ons before or durring the time
              of your ride:
            </h2>
            <div className={styles.btnContainer}>
              <Button href={ctaHref} text={ctaText} btnType='yellow' arrow />
            </div>
          </div>
          <div className={styles.right}>
            <div className={styles.mapDataContainer}>
              {items.map((item) => (
                <div key={item.id} className={styles.card}>
                  <div className={styles.cardLeft}>
                    <div className={styles.id}>
                      0{typeof item.id === "number" ? item.id : item.id}.
                    </div>
                  </div>
                  <div className={styles.cardRight}>
                    <h3 className={styles.title}>{item.title}</h3>
                    {item.description ? (
                      <p className={styles.desc}>{item.description}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.btnContainerii}>
              <Button href={ctaHref} text={ctaText} btnType='yellow' arrow />
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
