import { and, desc, eq } from "drizzle-orm";
import { bookmarks, courses, lessons, modules } from "~/db/schema";
import type { Db } from "~/lib/comments.server";

// ─── Bookmarks ───
// A Student's flag on a Lesson, one per Student per Lesson, seen only by that
// Student. See GLOSSARY.md.
//
// Every function takes the database first, so tests can hand in an in-memory
// one. Uses positional parameters (project convention).

function ownBookmark(userId: number, lessonId: number) {
  return and(eq(bookmarks.userId, userId), eq(bookmarks.lessonId, lessonId));
}

export function isBookmarked(db: Db, userId: number, lessonId: number) {
  return !!db
    .select({ id: bookmarks.id })
    .from(bookmarks)
    .where(ownBookmark(userId, lessonId))
    .get();
}

/**
 * Adds the Bookmark if the Lesson has none, removes it if it has one, and
 * returns whether the Lesson is now bookmarked. The unique index on
 * (user, lesson) means two requests racing can never leave two rows.
 */
export function toggleBookmark(db: Db, userId: number, lessonId: number) {
  const removed = db
    .delete(bookmarks)
    .where(ownBookmark(userId, lessonId))
    .returning({ id: bookmarks.id })
    .all();
  if (removed.length > 0) return false;

  db.insert(bookmarks)
    .values({ userId, lessonId })
    .onConflictDoNothing({ target: [bookmarks.userId, bookmarks.lessonId] })
    .run();
  return true;
}

/** The Student's Bookmarks with the Lesson and Course they point at, newest first. */
export function listBookmarks(db: Db, userId: number) {
  return db
    .select({
      id: bookmarks.id,
      createdAt: bookmarks.createdAt,
      lessonId: lessons.id,
      lessonTitle: lessons.title,
      moduleTitle: modules.title,
      courseTitle: courses.title,
      courseSlug: courses.slug,
    })
    .from(bookmarks)
    .innerJoin(lessons, eq(bookmarks.lessonId, lessons.id))
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .innerJoin(courses, eq(modules.courseId, courses.id))
    .where(eq(bookmarks.userId, userId))
    .orderBy(desc(bookmarks.createdAt), desc(bookmarks.id))
    .all();
}
