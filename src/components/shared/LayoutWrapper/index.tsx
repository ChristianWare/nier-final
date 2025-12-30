import ContentPadding from "../ContentPadding/ContentPadding";
import styles from "./LayoutWrapper.module.css";

interface Props {
  children: React.ReactNode;
}

const LayoutWrapper = ({ children }: Props) => {
  return (
    <div className={styles.layout}>
      <ContentPadding>{children}</ContentPadding>
    </div>
  );
};
export default LayoutWrapper;
