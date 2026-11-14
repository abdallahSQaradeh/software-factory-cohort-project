import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { courses, lessons, modules, notes } from "~/db/schema";
import type { Db } from "~/lib/comments.server";

// ─── Notes ───
// A Student's own writing about a Lesson, one per Student per Lesson, private
// to the Student who wrote it. Stored and shown as plain text, never Markdown.
// See GLOSSARY.md.
//
// Every function takes the database first, so tests can hand in an in-memory
// one. Uses positional parameters (project convention).

export const MAX_NOTE_LENGTH = 2000;

/** The rule for an incoming Note body: trimmed, at most MAX_NOTE_LENGTH. */
export const noteBodySchema = z.string().trim().max(MAX_NOTE_LENGTH);

function ownNote(userId: number, lessonId: number) {
  return and(eq(notes.userId, userId), eq(notes.lessonId, lessonId));
}

export function getNote(db: Db, userId: number, lessonId: number) {
  return db.select().from(notes).where(ownNote(userId, lessonId)).get();
}

/**
 * Writes the Student's Note on a Lesson: creates it, or replaces the body and
 * moves `updatedAt` on, keeping `createdAt`. An empty body deletes the Note,
 * since clearing the box is how a Student removes it. `body` must already
 * have passed noteBodySchema.
 */
export function saveNote(
  db: Db,
  userId: number,
  lessonId: number,
  body: string,
  now: Date
) {
  if (body.length === 0) {
    db.delete(notes).where(ownNote(userId, lessonId)).run();
    return;
  }

  const timestamp = now.toISOString();
  db.insert(notes)
    .values({ userId, lessonId, body, createdAt: timestamp, updatedAt: timestamp })
    .onConflictDoUpdate({
      target: [notes.userId, notes.lessonId],
      set: { body, updatedAt: timestamp },
    })
    .run();
}

/** The Student's Notes with the Lesson and Course they belong to, most recently edited first. */
export function listNotes(db: Db, userId: number) {
  return db
    .select({
      id: notes.id,
      body: notes.body,
      updatedAt: notes.updatedAt,
      lessonId: lessons.id,
      lessonTitle: lessons.title,
      courseTitle: courses.title,
      courseSlug: courses.slug,
    })
    .from(notes)
    .innerJoin(lessons, eq(notes.lessonId, lessons.id))
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .innerJoin(courses, eq(modules.courseId, courses.id))
    .where(eq(notes.userId, userId))
    .orderBy(desc(notes.updatedAt), desc(notes.id))
    .all();
}
