import { count, countDistinct, desc, eq, inArray } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "~/db/schema";
import { CourseStatus } from "~/db/schema";

export type Db = BetterSQLite3Database<typeof schema>;

export type FeaturedCourse = {
  id: number;
  title: string;
  slug: string;
  description: string;
  coverImageUrl: string | null;
  instructorName: string;
  categoryName: string;
  lessonCount: number;
};

export type LandingCatalogue = {
  // The spotlight is kept out of the featured list so the page never shows
  // the same course twice.
  spotlightCourse: FeaturedCourse | null;
  featuredCourses: FeaturedCourse[];
  publishedCourseCount: number;
  publishedCategoryCount: number;
  publishedLessonCount: number;
};

export const FEATURED_COURSE_LIMIT = 3;

const isPublished = eq(schema.courses.status, CourseStatus.Published);

// An aggregate without GROUP BY always returns exactly one row.
function countOf(query: { all(): { total: number }[] }) {
  const [row] = query.all();
  return row.total;
}

function lessonCountsByCourse(db: Db, courseIds: number[]) {
  const rows = db
    .select({ courseId: schema.modules.courseId, lessons: count() })
    .from(schema.lessons)
    .innerJoin(schema.modules, eq(schema.lessons.moduleId, schema.modules.id))
    .where(inArray(schema.modules.courseId, courseIds))
    .groupBy(schema.modules.courseId)
    .all();
  return new Map(rows.map((row) => [row.courseId, row.lessons]));
}

function newestPublishedCourses(db: Db) {
  return (
    db
      .select({
        id: schema.courses.id,
        title: schema.courses.title,
        slug: schema.courses.slug,
        description: schema.courses.description,
        coverImageUrl: schema.courses.coverImageUrl,
        instructorName: schema.users.name,
        categoryName: schema.categories.name,
      })
      .from(schema.courses)
      .innerJoin(schema.users, eq(schema.courses.instructorId, schema.users.id))
      .innerJoin(
        schema.categories,
        eq(schema.courses.categoryId, schema.categories.id)
      )
      .where(isPublished)
      // The id breaks ties between courses created in the same instant.
      .orderBy(desc(schema.courses.createdAt), desc(schema.courses.id))
      .limit(1 + FEATURED_COURSE_LIMIT)
      .all()
  );
}

export function getLandingCatalogue(db: Db): LandingCatalogue {
  const newest = newestPublishedCourses(db);
  const lessonCounts = lessonCountsByCourse(
    db,
    newest.map((course) => course.id)
  );

  const publishedModuleIds = db
    .select({ id: schema.modules.id })
    .from(schema.modules)
    .innerJoin(schema.courses, eq(schema.modules.courseId, schema.courses.id))
    .where(isPublished);

  const [spotlightCourse = null, ...featuredCourses] = newest.map((course) => ({
    ...course,
    lessonCount: lessonCounts.get(course.id) ?? 0,
  }));

  return {
    spotlightCourse,
    featuredCourses,
    publishedCourseCount: countOf(
      db.select({ total: count() }).from(schema.courses).where(isPublished)
    ),
    publishedCategoryCount: countOf(
      db
        .select({ total: countDistinct(schema.courses.categoryId) })
        .from(schema.courses)
        .where(isPublished)
    ),
    publishedLessonCount: countOf(
      db
        .select({ total: count() })
        .from(schema.lessons)
        .where(inArray(schema.lessons.moduleId, publishedModuleIds))
    ),
  };
}
