"use client";

import { useBookingTabs } from "./BookingDetailTabsContext";
import styles from "./BookingDetailTabs.module.css";

export type BookingTab = {
  id: string;
  label: string;
  isComplete: boolean;
  isPartial?: boolean;
  sectionId: string;
  content: React.ReactNode;
};

type Props = {
  tabs: BookingTab[];
};

export default function BookingDetailTabs({ tabs }: Props) {
  const { activeTabId, setActiveTabId, tabsEnabled, setTabsEnabled } =
    useBookingTabs();

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  // ── Shared toggle (matches DepositSetupClient style) ──────────────────────
  const toggleRow = (
    <div className={styles.viewToggleRow}>
      <span className={styles.viewToggleLabel}>Tab View</span>
      <label className={styles.toggle}>
        <input
          type='checkbox'
          checked={tabsEnabled}
          onChange={() => setTabsEnabled((v) => !v)}
        />
        <span className={styles.slider} />
        <span className={styles.toggleLabel}>{tabsEnabled ? "On" : "Off"}</span>
      </label>
    </div>
  );

  // ── Stacked (non-tab) view ─────────────────────────────────────────────────
  if (!tabsEnabled) {
    return (
      <div className={styles.stackedWrapper} id='booking-detail-tabs'>
        {toggleRow}
        {tabs.map((tab) => (
          <div
            key={tab.id}
            id={tab.sectionId}
            className={styles.stackedSection}
          >
            <div className={styles.stackedHeader}>{tab.label}</div>
            <div className={styles.stackedContent}>{tab.content}</div>
          </div>
        ))}
      </div>
    );
  }

  // ── Tab view ───────────────────────────────────────────────────────────────
  return (
    <div className={styles.wrapper} id='booking-detail-tabs'>
      {toggleRow}

      <div
        className={styles.tabBar}
        role='tablist'
        aria-label='Booking sections'
      >
        {tabs.map((tab) => {
          const isActive = (activeTab?.id ?? "") === tab.id;
          return (
            <button
              key={tab.id}
              type='button'
              role='tab'
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              className={[
                styles.tab,
                isActive ? styles.tabActive : "",
                tab.isComplete ? styles.tabComplete : "",
                tab.isPartial && !tab.isComplete ? styles.tabPartial : "",
                isActive && tab.isComplete ? styles.tabCompleteActive : "",
                isActive && tab.isPartial && !tab.isComplete
                  ? styles.tabPartialActive
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setActiveTabId(tab.id)}
            >
              <span className={styles.tabLabel}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Panels — all mounted, visibility toggled with CSS */}
      <div className={styles.panels}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            id={`tabpanel-${tab.id}`}
            role='tabpanel'
            style={{
              display: (activeTab?.id ?? "") === tab.id ? "block" : "none",
            }}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}
