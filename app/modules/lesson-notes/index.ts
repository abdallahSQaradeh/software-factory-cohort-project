import { draftOf, type NoteDraft } from "./lib/draft";

export type { NoteDraft };

/**
 * What the note editor shows about the text in the box: the character
 * counter, whether it is over the limit, whether it differs from the saved
 * note, and whether Save should be enabled.
 */
export function describeNoteDraft(
  body: string,
  savedBody: string | null
): NoteDraft {
  return draftOf(body, savedBody);
}
