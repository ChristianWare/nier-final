// A titled table in a white card with a red header bar and one column card
// per column, separated by dashed row lines. On phones each row becomes its
// own card with the column names as labels.

import type { CSSProperties, ReactNode } from "react";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import styles from "./CharterTable.module.css";

export default function CharterTable({
  eyebrow,
  heading,
  copy,
  columns,
  rows,
  note,
  template = "1fr 1.2fr 1.2fr 2fr",
}: {
  eyebrow: string;
  heading: string;
  copy?: ReactNode;
  columns: string[];
  rows: { key: string; cells: ReactNode[] }[];
  note?: ReactNode;
  /** CSS grid-template-columns for the table. */
  template?: string;
}) {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.top}>
          <SectionHeading text={eyebrow} dot />
          <h2 className='h3'>{heading}</h2>
          {copy ? <p className={styles.copy}>{copy}</p> : null}
        </div>

        <div className={styles.card}>
          <div
            role='table'
            aria-label={heading}
            className={styles.table}
            style={{ "--cols": template } as CSSProperties}
          >
            <div role='row' className={styles.head}>
              {columns.map((c) => (
                <div key={c} role='columnheader' className={styles.th}>
                  {c}
                </div>
              ))}
            </div>
            <div className={styles.body}>
              {rows.map((r) => (
                <div key={r.key} role='row' className={styles.row}>
                  {r.cells.map((cell, i) => (
                    <div
                      key={columns[i]}
                      role='cell'
                      data-label={columns[i]}
                      className={`${styles.td}${i === 0 ? ` ${styles.first}` : ""}`}
                    >
                      {cell}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {note ? <p className={styles.note}>{note}</p> : null}
      </LayoutWrapper>
    </section>
  );
}
