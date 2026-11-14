import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";
import { isBookmarked, listBookmarks, toggleBookmark } from "./bookmarks.server";

type TestDb = ReturnType<typeof createTestDb>;

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

describe("toggling a Bookmark", () => {
  it("bookmarks a Lesson that has no Bookmark", () => {
    expect(toggleBookmark(db, base.user.id, lessonIds[0])).toBe(true);
    expect(isBookmarked(db, base.user.id, lessonIds[0])).toBe(true);
  });

  it("removes the Bookmark when toggled again", () => {
    toggleBookmark(db, base.user.id, lessonIds[0]);

    expect(toggleBookmark(db, base.user.id, lessonIds[0])).toBe(false);
    expect(isBookmarked(db, base.user.id, lessonIds[0])).toBe(false);
  });

  it("never leaves two Bookmarks on the same Lesson", () => {
    expect(() =>
      db
        .insert(schema.bookmarks)
        .values([
          { userId: base.user.id, lessonId: lessonIds[0] },
          { userId: base.user.id, lessonId: lessonIds[0] },
        ])
        .run()
    ).toThrow();
  });
});

describe("listing Bookmarks", () => {
  it("returns the Lesson and Course each Bookmark points at", () => {
    toggleBookmark(db, base.user.id, lessonIds[0]);

    expect(listBookmarks(db, base.user.id)).toEqual([
      expect.objectContaining({
        lessonId: lessonIds[0],
        lessonTitle: "Lesson 1",
        courseTitle: base.course.title,
        courseSlug: base.course.slug,
      }),
    ]);
  });

  it("puts the newest Bookmark first", () => {
    db.insert(schema.bookmarks)
      .values([
        { userId: base.user.id, lessonId: lessonIds[0], createdAt: "2026-11-01T00:00:00.000Z" },
        { userId: base.user.id, lessonId: lessonIds[1], createdAt: "2026-11-02T00:00:00.000Z" },
      ])
      .run();

    expect(listBookmarks(db, base.user.id).map((row) => row.lessonId)).toEqual([
      lessonIds[1],
      lessonIds[0],
    ]);
  });

  it("only returns the Student's own Bookmarks", () => {
    toggleBookmark(db, base.instructor.id, lessonIds[0]);

    expect(listBookmarks(db, base.user.id)).toEqual([]);
  });
});
