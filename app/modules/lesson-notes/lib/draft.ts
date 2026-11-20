import { MAX_NOTE_LENGTH } from "~/lib/notes";

export type NoteDraft = {
  /** e.g. "12 / 2,000" — the same counter the comment form shows. */
  counter: string;
  tooLong: boolean;
  /** The draft differs from what is saved, so Save has something to do. */
  unsaved: boolean;
  canSave: boolean;
};

export function draftOf(body: string, savedBody: string | null): NoteDraft {
  // The server trims before it checks the length and stores the note, so
  // compare what it would store, not what is in the box.
  const stored = body.trim();
  const tooLong = stored.length > MAX_NOTE_LENGTH;
  const unsaved = stored !== (savedBody ?? "");
  const empty = stored.length === 0;

  return {
    counter: `${stored.length.toLocaleString("en")} / ${MAX_NOTE_LENGTH.toLocaleString("en")}`,
    tooLong,
    unsaved,
    canSave: unsaved && !tooLong && !empty,
  };
}
