"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addBookingNote,
  deleteBookingNote,
} from "../../../../../actions/admin/bookings";
import Button from "@/components/shared/Button/Button";
import styles from "./AdminBookingDetailPage.module.css";

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
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  function formatDate(dateStr: string) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(dateStr));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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

  return (
    <div className={styles.notesSection}>
      {/* Add note form */}
      <form onSubmit={handleSubmit} className={styles.noteForm}>
        <textarea
          className='inputBorder'
          placeholder='Add an internal note (e.g., VIP client, special instructions, follow-up needed)...'
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          disabled={isPending}
        />
        <div className={styles.noteFormActions}>
          <Button
            text={isPending ? "Adding..." : "Add Note"}
            btnType='black'
            type='submit'
            plus
            disabled={isPending || !content.trim()}
          />
        </div>
        {error && <p className={styles.errorText}>{error}</p>}
      </form>

      {/* Notes list */}
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
