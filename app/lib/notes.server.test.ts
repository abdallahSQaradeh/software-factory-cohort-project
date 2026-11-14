import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";
import {
  getNote,
  listNotes,
  MAX_NOTE_LENGTH,
  noteBodySchema,
  saveNote,
} from "./notes.server";

type TestDb = ReturnType<typeof createTestDb>;

const NOW = new Date(2026, 10, 14, 12, 0, 0);
const LATER = new Date(2026, 10, 14, 13, 0, 0);

let db: TestDb;
let base: ReturnType<typeof seedBaseData>;
let lessonIds: number[];

beforeEach(() => {
  db = createTestDb();
  base = seedBaseData(db);

  const module = db
    .insert(schema.modules)
    .values({ courseId: base.course.id, title: "Basics", position: 1 })
    .returning()
    .get();

  lessonIds = [1, 2].map(
    (position) =>
      db
        .insert(schema.lessons)
        .values({ moduleId: module.id, title: `Lesson ${position}`, position })
        .returning()
        .get().id
  );
});

describe("the Note body rule", () => {
  it("trims the body", () => {
    expect(noteBodySchema.parse("  Remember the edge case  ")).toBe(
      "Remember the edge case"
    );
  });

  it("accepts a Note of exactly 2,000 characters", () => {
    expect(noteBodySchema.safeParse("a".repeat(MAX_NOTE_LENGTH)).success).toBe(
      true
    );
  });

  it("refuses a Note over 2,000 characters", () => {
    expect(
      noteBodySchema.safeParse("a".repeat(MAX_NOTE_LENGTH + 1)).success
    ).toBe(false);
  });
});

describe("saving a Note", () => {
  it("creates the Note on a Lesson that has none", () => {
    saveNote(db, base.user.id, lessonIds[0], "Remember the edge case", NOW);

    expect(getNote(db, base.user.id, lessonIds[0])).toMatchObject({
      body: "Remember the edge case",
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    });
  });

  it("replaces the body and moves the last-edited time on, keeping one Note", () => {
    saveNote(db, base.user.id, lessonIds[0], "First draft", NOW);
    saveNote(db, base.user.id, lessonIds[0], "Second draft", LATER);

    expect(listNotes(db, base.user.id)).toHaveLength(1);
    expect(getNote(db, base.user.id, lessonIds[0])).toMatchObject({
      body: "Second draft",
      createdAt: NOW.toISOString(),
      updatedAt: LATER.toISOString(),
    });
  });

  it("deletes the Note when the body is cleared", () => {
    saveNote(db, base.user.id, lessonIds[0], "Something", NOW);
    saveNote(db, base.user.id, lessonIds[0], "", LATER);

    expect(getNote(db, base.user.id, lessonIds[0])).toBeUndefined();
  });
});

describe("listing Notes", () => {
  it("returns the Lesson and Course each Note belongs to", () => {
    saveNote(db, base.user.id, lessonIds[0], "Something", NOW);

    expect(listNotes(db, base.user.id)).toEqual([
      expect.objectContaining({
        body: "Something",
        lessonId: lessonIds[0],
        lessonTitle: "Lesson 1",
        courseTitle: base.course.title,
        courseSlug: base.course.slug,
      }),
    ]);
  });

  it("puts the most recently edited Note first", () => {
    saveNote(db, base.user.id, lessonIds[0], "Older", NOW);
    saveNote(db, base.user.id, lessonIds[1], "Newer", LATER);

    expect(listNotes(db, base.user.id).map((row) => row.body)).toEqual([
      "Newer",
      "Older",
    ]);
  });

  it("only returns the Student's own Notes", () => {
    saveNote(db, base.instructor.id, lessonIds[0], "Not yours", NOW);

    expect(listNotes(db, base.user.id)).toEqual([]);
  });
});
