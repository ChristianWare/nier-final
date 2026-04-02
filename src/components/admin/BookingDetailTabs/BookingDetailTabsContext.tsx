"use client";

import { createContext, useContext, useState } from "react";

/** Maps checklist sectionId → tab id (for tab-switching on click) */
export const SECTION_TO_TAB: Record<string, string> = {
  "trip-section": "trip",
  "price-section": "price",
  "assign-section": "assignment",
  "driver-pay-section": "assignment",
  "approval-section": "approval",
  "payment-section": "payment",
};

/**
 * In stacked (non-tab) mode some merged sectionIds redirect to the
 * combined section's actual DOM id so scroll-to still works.
 */
export const SECTION_STACKED_REDIRECT: Record<string, string> = {
  "driver-pay-section": "assign-section",
};

type BookingTabsContextValue = {
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  tabsEnabled: boolean;
  setTabsEnabled: React.Dispatch<React.SetStateAction<boolean>>;
};

const BookingTabsContext = createContext<BookingTabsContextValue>({
  activeTabId: "",
  setActiveTabId: () => {},
  tabsEnabled: true,
  setTabsEnabled: () => {},
});

export function useBookingTabs() {
  return useContext(BookingTabsContext);
}

export function BookingTabsProvider({
  children,
  defaultTabId,
}: {
  children: React.ReactNode;
  defaultTabId: string;
}) {
  const [activeTabId, setActiveTabId] = useState(defaultTabId);
  const [tabsEnabled, setTabsEnabled] = useState(true);

  return (
    <BookingTabsContext.Provider
      value={{ activeTabId, setActiveTabId, tabsEnabled, setTabsEnabled }}
    >
      {children}
    </BookingTabsContext.Provider>
  );
}
