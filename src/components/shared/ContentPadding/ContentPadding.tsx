import styles from "./ContentPadding.module.css";

interface PaddingProps {
  children: React.ReactNode;
  paddingBottom?: string;
  paddingNone?: string;
}

const ContentPadding = ({
  children,
  paddingBottom = "",
  paddingNone = "",
}: PaddingProps) => {
  return (
    <div
      className={`${styles.container} ${styles[paddingBottom]} ${styles[paddingNone]}`}
    >
      {children}
    </div>
  );
};
export default ContentPadding;
