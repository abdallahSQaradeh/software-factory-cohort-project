import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb, seedBaseData, type TestDb } from "~/test/setup";
import * as schema from "~/db/schema";
import { CourseStatus } from "~/db/schema";
import { markdown } from "~/lib/text";
import { createLanding, FEATURED_COURSE_LIMIT } from "../index.server";
import { getHeroActions } from "../index";

let db: TestDb;
let base: ReturnType<typeof seedBaseData>;

beforeEach(() => {
  db = createTestDb();
  base = seedBaseData(db);
});

// ─── Fixtures ───
// The landing module only reads, and no module writes courses or lessons yet,
// so rows go in directly. Kept here so a schema change touches one block.

let slugCounter = 0;

function addCourse(
  title: string,
  createdAt: string,
  status = CourseStatus.Published
) {
  return db
    .insert(schema.courses)
    .values({
      title,
      slug: `course-${++slugCounter}`,
      description: `About ${title}`,
      salesCopy: markdown(`## ${title}`),
      instructorId: base.instructor.id,
      categoryId: base.category.id,
      status,
      createdAt,
    })
    .returning()
    .get();
}

function addLessons(courseId: number, perModule: number[]) {
  perModule.forEach((lessonCount, moduleIndex) => {
    const module = db
      .insert(schema.modules)
      .values({
        courseId,
        title: `Module ${moduleIndex}`,
        position: moduleIndex,
      })
      .returning()
      .get();
    for (let position = 0; position < lessonCount; position++) {
      db.insert(schema.lessons)
        .values({ moduleId: module.id, title: `Lesson ${position}`, position })
        .run();
    }
  });
}

function catalogue() {
  return createLanding(db).catalogue();
}

describe("landing catalogue", () => {
  it("features the newest published courses, newest first", () => {
    db.delete(schema.courses).run();
    addCourse("Oldest", "2026-01-01T00:00:00.000Z");
    addCourse("Newest", "2026-04-01T00:00:00.000Z");
    addCourse("Middle", "2026-02-01T00:00:00.000Z");
    addCourse("Draft", "2026-05-01T00:00:00.000Z", CourseStatus.Draft);
    addCourse("Archived", "2026-06-01T00:00:00.000Z", CourseStatus.Archived);

    const titles = catalogue().featuredCourses.map((course) => course.title);

    expect(titles).toEqual(["Newest", "Middle", "Oldest"]);
    expect(FEATURED_COURSE_LIMIT).toBe(3);
  });

  it("breaks a tie on creation time by the later course", () => {
    db.delete(schema.courses).run();
    addCourse("First", "2026-01-01T00:00:00.000Z");
    addCourse("Second", "2026-01-01T00:00:00.000Z");

    const titles = catalogue().featuredCourses.map((course) => course.title);

    expect(titles).toEqual(["Second", "First"]);
  });

  it("describes each featured course for its card", () => {
    db.delete(schema.courses).run();
    const course = addCourse("Only", "2026-01-01T00:00:00.000Z");

    expect(catalogue().featuredCourses).toEqual([
      {
        id: course.id,
        title: "Only",
        slug: course.slug,
        description: "About Only",
        coverImageUrl: null,
        instructorName: "Test Instructor",
        categoryName: "Programming",
        lessonCount: 0,
      },
    ]);
  });

  it("counts the lessons of each featured course across its modules", () => {
    db.delete(schema.courses).run();
    const big = addCourse("Big", "2026-02-01T00:00:00.000Z");
    const small = addCourse("Small", "2026-01-01T00:00:00.000Z");
    addLessons(big.id, [2, 3]);
    addLessons(small.id, [1]);

    const counts = catalogue().featuredCourses.map((c) => [
      c.title,
      c.lessonCount,
    ]);

    expect(counts).toEqual([
      ["Big", 5],
      ["Small", 1],
    ]);
  });

  it("counts published courses, all categories and published lessons", () => {
    addCourse("Second", "2026-01-01T00:00:00.000Z");
    const draft = addCourse(
      "Draft",
      "2026-01-01T00:00:00.000Z",
      CourseStatus.Draft
    );
    db.insert(schema.categories)
      .values({ name: "Design", slug: "design" })
      .run();
    addLessons(base.course.id, [4]);
    addLessons(draft.id, [7]);

    const { publishedCourseCount, categoryCount, publishedLessonCount } =
      catalogue();

    expect(publishedCourseCount).toBe(2);
    expect(categoryCount).toBe(2);
    expect(publishedLessonCount).toBe(4);
  });

  it("is empty when nothing is published", () => {
    db.delete(schema.courses).run();
    addCourse("Draft", "2026-01-01T00:00:00.000Z", CourseStatus.Draft);

    expect(catalogue()).toMatchObject({
      featuredCourses: [],
      publishedCourseCount: 0,
      publishedLessonCount: 0,
    });
  });
});

describe("getHeroActions", () => {
  it("asks a visitor to browse, then to sign up", () => {
    expect(getHeroActions(false)).toEqual({
      primary: { label: "Browse courses", to: "/courses" },
      secondary: { label: "Create a free account", to: "/signup" },
    });
  });

  it("sends someone signed in back to their learning", () => {
    expect(getHeroActions(true)).toEqual({
      primary: { label: "Continue learning", to: "/dashboard" },
      secondary: { label: "Browse courses", to: "/courses" },
    });
  });
});
