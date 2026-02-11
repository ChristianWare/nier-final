// src/components/shared/DirtyFormProvider/DirtyFormProvider.tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/shared/Modal/Modal";
import Button from "@/components/shared/Button/Button";
import styles from "./DirtyFormProvider.module.css";

type DirtyFormContextType = {
  register: (id: string, dirty: boolean, scrollTo?: string) => void;
  unregister: (id: string) => void;
};

const DirtyFormContext = createContext<DirtyFormContextType>({
  register: () => {},
  unregister: () => {},
});

export function useDirtyForm(id: string, isDirty: boolean, scrollTo?: string) {
  const { register, unregister } = useContext(DirtyFormContext);

  useEffect(() => {
    register(id, isDirty, scrollTo);
    return () => unregister(id);
  }, [id, isDirty, scrollTo, register, unregister]);
}

export default function DirtyFormProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [dirtyMap, setDirtyMap] = useState<
    Record<string, { dirty: boolean; scrollTo?: string }>
  >({});
  const [showModal, setShowModal] = useState(false);
  const pendingHref = useRef<string | null>(null);
  const router = useRouter();

  const register = useCallback(
    (id: string, dirty: boolean, scrollTo?: string) => {
      setDirtyMap((prev) => ({ ...prev, [id]: { dirty, scrollTo } }));
    },
    [],
  );

  const unregister = useCallback((id: string) => {
    setDirtyMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const dirtyForms = Object.entries(dirtyMap).filter(
    ([, entry]) => entry.dirty,
  );
  const hasDirty = dirtyForms.length > 0;
  const hasDirtyRef = useRef(hasDirty);

  useEffect(() => {
    hasDirtyRef.current = hasDirty;
  }, [hasDirty]);

  // Native browser prompt for tab close / browser back / refresh
  useEffect(() => {
    if (!hasDirty) return;

    const handle = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handle);
    return () => window.removeEventListener("beforeunload", handle);
  }, [hasDirty]);

  // Intercept in-app link clicks
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!hasDirtyRef.current) return;

      // Walk up from target to find an <a> tag
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Only intercept internal navigation (same origin, not new tab)
      const isInternal =
        href.startsWith("/") || href.startsWith(window.location.origin);
      const isNewTab =
        anchor.target === "_blank" || e.ctrlKey || e.metaKey || e.shiftKey;

      if (!isInternal || isNewTab) return;

      // Block navigation and show modal
      e.preventDefault();
      e.stopPropagation();
      pendingHref.current = href;
      setShowModal(true);
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  // Intercept browser back/forward via popstate
  useEffect(() => {
    if (!hasDirty) return;

    // Push a duplicate entry so we can catch the back button
    const currentUrl = window.location.href;
    window.history.pushState({ dirtyGuard: true }, "", currentUrl);

    function handlePopState() {
      if (!hasDirtyRef.current) return;

      // Re-push to stay on the page and show modal
      window.history.pushState({ dirtyGuard: true }, "", currentUrl);
      pendingHref.current = null;
      setShowModal(true);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [hasDirty]);

  function handleDiscardAndLeave() {
    // Clear all dirty state so navigation isn't blocked again
    setDirtyMap({});
    setShowModal(false);

    if (pendingHref.current) {
      router.push(pendingHref.current);
    } else {
      // Browser back — go back in history
      router.back();
    }

    pendingHref.current = null;
  }

  function handleStay() {
    setShowModal(false);
    pendingHref.current = null;
  }

  function handleScrollTo(scrollTarget: string) {
    setShowModal(false);
    pendingHref.current = null;

    setTimeout(() => {
      const el = document.getElementById(scrollTarget);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  }

  // Format form IDs for display
  function formatFormName(id: string): string {
    return id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return (
    <DirtyFormContext.Provider value={{ register, unregister }}>
      {children}

      <Modal isOpen={showModal} onClose={handleStay}>
        <div className={styles.modalContent}>
          <div className='cardTitle h5'>Unsaved Changes</div>

          <p className='paragraph'>
            You have <strong>unsaved changes</strong> that will be lost if you
            leave this page.
          </p>

          <div className={styles.warningBox}>
            <strong>⚠️ Unsaved forms:</strong>
            <ul className={styles.warningList}>
              {dirtyForms.map(([id, entry]) => (
                <li key={id}>
                  {entry.scrollTo ? (
                    <button
                      type='button'
                      className={styles.scrollLink}
                      onClick={() => handleScrollTo(entry.scrollTo!)}
                    >
                      {formatFormName(id)} →
                    </button>
                  ) : (
                    formatFormName(id)
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.modalActions}>
            <Button
              type='button'
              text='Stay on Page'
              btnType='grayReg'
              onClick={handleStay}
            />
            <Button
              type='button'
              text='Discard & Leave'
              btnType='redReg'
              onClick={handleDiscardAndLeave}
            />
          </div>
        </div>
      </Modal>
    </DirtyFormContext.Provider>
  );
}
