"use client";

import { useState, type ReactNode } from "react";
import Button from "@/components/shared/Button/Button";
import styles from "./AdminBookingDetailPage.module.css";

type IndicatorStatus = "complete" | "warning" | "neutral";

function CardIndicator({ status }: { status: IndicatorStatus }) {
  const colors = {
    complete: { bg: "#22c55e", icon: "✓" },
    warning: { bg: "#f59e0b", icon: "!" },
    neutral: { bg: "#94a3b8", icon: "○" },
  };
  const { bg, icon } = colors[status];
  return (
    <div
      style={{
        position: "absolute",
        top: -8,
        left: -8,
        width: 24,
        height: 24,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 700,
        zIndex: 10,
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.15)",
        background: bg,
        color: "white",
      }}
    >
      {icon}
    </div>
  );
}

export default function EditableCard({
  title,
  children,
  indicator,
  id,
  borderWarn,
  stylesWarn,
}: {
  title: string;
  children: ReactNode;
  indicator?: IndicatorStatus;
  id?: string;
  borderWarn?: boolean;
  stylesWarn?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);

  const cardClass = [
    styles.card,
    borderWarn ? styles.borderWarn : "",
    isEditing ? styles.cardEditing : styles.cardLocked,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div id={id} className={cardClass}>
      {indicator && <CardIndicator status={indicator} />}
      <div className={styles.cardTop}>
        <div
          className='cardTitle h4'
          style={stylesWarn ? { background: "var(--warning300)" } : {}}
        >
          {title}
        </div>
      </div>

      <div className={isEditing ? undefined : styles.cardLockedContent}>
        {children}
      </div>

      <div className={styles.cardEditActions}>
        {isEditing ? (
          <Button
            text='Done Editing'
            btnType='blackReg'
            type='button'
            onClick={() => setIsEditing(false)}
          />
        ) : (
          <Button
            text={`Edit ${title}`}
            btnType='blackReg'
            type='button'
            onClick={() => setIsEditing(true)}
          />
        )}
      </div>
    </div>
  );
}
