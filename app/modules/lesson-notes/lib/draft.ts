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
  const tooLong = body.length > MAX_NOTE_LENGTH;
  const unsaved = body !== (savedBody ?? "");
  // The server trims and rejects an empty note, so whitespace is not worth a round trip.
  const empty = body.trim().length === 0;

  return {
    counter: `${body.length.toLocaleString("en")} / ${MAX_NOTE_LENGTH.toLocaleString("en")}`,
    tooLong,
    unsaved,
    canSave: unsaved && !tooLong && !empty,
  };
}
