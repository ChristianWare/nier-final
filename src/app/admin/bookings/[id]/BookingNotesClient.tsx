"use client";

import styles from "./AdminBookingDetailPage.module.css";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addBookingNote,
  deleteBookingNote,
} from "../../../../../actions/admin/bookings";
import Button from "@/components/shared/Button/Button";
import { useDirtyForm } from "@/components/shared/DirtyFormProvider/DirtyFormProvider";

type Note = {
  id: string;
  content: string;
  createdAt: string;
  createdBy: {
    name: string | null;
    email: string;
  } | null;
};

export default function BookingNotesClient({
  bookingId,
  notes,
}: {
  bookingId: string;
  notes: Note[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  /* ── Lock / Unlock state ── */
  const [isEditing, setIsEditing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isDirty = isEditing && content.trim().length > 0;

  useDirtyForm("internal-notes", isDirty, "notes-section");

  const wrapperClass = justSaved
    ? `${styles.notesSection} ${styles.sectionSaved}`
    : isEditing
      ? `${styles.notesSection} ${styles.sectionEditing}`
      : styles.notesSection;

  function formatDate(dateStr: string) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(dateStr));
  }

  function handleCancel() {
    setContent("");
    setError(null);
    setIsEditing(false);
  }

  function handleSave() {
    setError(null);

    if (!content.trim()) {
      setError("Note cannot be empty.");
      return;
    }

    const formData = new FormData();
    formData.append("bookingId", bookingId);
    formData.append("content", content.trim());

    startTransition(async () => {
      const result = await addBookingNote(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setContent("");
        setJustSaved(true);
        setTimeout(() => {
          setJustSaved(false);
          setIsEditing(false);
        }, 2000);
        router.refresh();
      }
    });
  }

  async function handleDelete(noteId: string) {
    if (!window.confirm("Delete this note?")) return;

    const formData = new FormData();
    formData.append("noteId", noteId);
    formData.append("bookingId", bookingId);

    startTransition(async () => {
      const result = await deleteBookingNote(formData);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  /* ── Section action buttons ── */
  const renderActions = () => {
    if (justSaved) {
      return (
        <div className={styles.sectionActionsRow}>
          <Button text='Saved ✓' btnType='greenReg' type='button' disabled />
        </div>
      );
    }

    if (isEditing) {
      return (
        <div className={styles.sectionActionsRow}>
          <Button
            text={isPending ? "Saving..." : "Save Changes"}
            btnType='blackReg'
            type='button'
            disabled={isPending || !content.trim()}
            onClick={handleSave}
          />
          {!isPending && (
            <Button
              text='Cancel'
              btnType='redReg'
              type='button'
              onClick={handleCancel}
            />
          )}
        </div>
      );
    }

    return (
      <div className={styles.sectionActionsRow}>
        <Button
          text='Add Note'
          btnType='blackReg'
          type='button'
          onClick={() => setIsEditing(true)}
        />
      </div>
    );
  };

  return (
    <div className={wrapperClass}>
      {/* Textarea only visible when editing */}
      {isEditing && (
        <textarea
          className='inputBorder'
          placeholder='Add an internal note (e.g., VIP client, special instructions, follow-up needed)...'
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          disabled={isPending}
          autoFocus
        />
      )}

      {error && <p className={styles.errorText}>{error}</p>}

      {renderActions()}

      {/* Notes list — always visible, delete always works */}
      {notes.length === 0 ? (
        <p className={styles.muted}>No notes yet.</p>
      ) : (
        <ul className={styles.notesList}>
          {notes.map((note) => (
            <li key={note.id} className={styles.noteItem}>
              <div className={styles.noteHeader}>
                <span className={styles.noteAuthor}>
                  {note.createdBy?.name || note.createdBy?.email || "Unknown"}
                </span>
                <span className={styles.noteTime}>
                  {formatDate(note.createdAt)}
                </span>
              </div>
              <p className={styles.noteContent}>{note.content}</p>
              <button
                type='button'
                className='dangerBtn'
                onClick={() => handleDelete(note.id)}
                disabled={isPending}
              >
                Delete note
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
