import ContentPadding from "../ContentPadding/ContentPadding";
import styles from "./LayoutWrapper.module.css";

interface Props {
  children: React.ReactNode;
  paddingBottom?: string;
  paddingNone?: string;
}

const LayoutWrapper = ({
  children,
  paddingBottom = "",
  paddingNone = "",
}: Props) => {
  return (
    <div className={styles.layout}>
      <ContentPadding paddingBottom={paddingBottom} paddingNone={paddingNone}>
        {children}
      </ContentPadding>
    </div>
  );
};
export default LayoutWrapper;
