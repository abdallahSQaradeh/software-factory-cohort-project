import { describe, it, expect } from "vitest";
import { describeNoteDraft } from "../index";
import { MAX_NOTE_LENGTH } from "~/lib/notes";

describe("describeNoteDraft", () => {
  it("counts characters against the limit", () => {
    expect(describeNoteDraft("hello", null).counter).toBe("5 / 2,000");
  });

  it("formats large counts with a thousands separator", () => {
    expect(describeNoteDraft("a".repeat(1500), null).counter).toBe(
      "1,500 / 2,000"
    );
  });

  it("is not unsaved when the box matches the saved note", () => {
    const draft = describeNoteDraft("my note", "my note");
    expect(draft.unsaved).toBe(false);
    expect(draft.canSave).toBe(false);
  });

  it("is not unsaved when there is no note and the box is empty", () => {
    const draft = describeNoteDraft("", null);
    expect(draft.unsaved).toBe(false);
    expect(draft.canSave).toBe(false);
  });

  it("can save an edited note", () => {
    const draft = describeNoteDraft("my note, edited", "my note");
    expect(draft).toEqual({
      counter: "15 / 2,000",
      tooLong: false,
      unsaved: true,
      canSave: true,
    });
  });

  it("cannot save whitespace", () => {
    const draft = describeNoteDraft("   ", null);
    expect(draft.unsaved).toBe(false);
    expect(draft.canSave).toBe(false);
  });

  it("allows a note exactly at the limit", () => {
    const draft = describeNoteDraft("a".repeat(MAX_NOTE_LENGTH), null);
    expect(draft.tooLong).toBe(false);
    expect(draft.canSave).toBe(true);
  });

  it("refuses a note one character over the limit", () => {
    const draft = describeNoteDraft("a".repeat(MAX_NOTE_LENGTH + 1), null);
    expect(draft.tooLong).toBe(true);
    expect(draft.canSave).toBe(false);
  });

  it("is not unsaved once the trimmed note is saved", () => {
    const draft = describeNoteDraft("my note\n", "my note");
    expect(draft.unsaved).toBe(false);
    expect(draft.canSave).toBe(false);
  });

  it("does not count surrounding whitespace against the limit", () => {
    const draft = describeNoteDraft(`${"a".repeat(MAX_NOTE_LENGTH)}  `, null);
    expect(draft.counter).toBe("2,000 / 2,000");
    expect(draft.tooLong).toBe(false);
    expect(draft.canSave).toBe(true);
  });

  it("cannot save a cleared note, which the server would reject", () => {
    const draft = describeNoteDraft("", "my note");
    expect(draft.unsaved).toBe(true);
    expect(draft.canSave).toBe(false);
  });
});
