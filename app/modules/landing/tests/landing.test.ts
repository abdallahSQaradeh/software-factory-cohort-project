import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb, seedBaseData, type TestDb } from "~/test/setup";
import * as schema from "~/db/schema";
import { CourseStatus } from "~/db/schema";
import { markdown } from "~/lib/text";
import { createLanding, FEATURED_COURSE_LIMIT } from "../index.server";
import { getFooterLinks, getHeroActions } from "../index";

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

function addCategory(name: string) {
  return db
    .insert(schema.categories)
    .values({ name, slug: name.toLowerCase() })
    .returning()
    .get();
}

function addCourse(
  title: string,
  createdAt: string,
  {
    status = CourseStatus.Published,
    categoryId = base.category.id,
  }: { status?: CourseStatus; categoryId?: number } = {}
) {
  return db
    .insert(schema.courses)
    .values({
      title,
      slug: `course-${++slugCounter}`,
      description: `About ${title}`,
      salesCopy: markdown(`## ${title}`),
      instructorId: base.instructor.id,
      categoryId,
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

function titles(courses: { title: string }[]) {
  return courses.map((course) => course.title);
}

describe("landing catalogue", () => {
  it("spotlights the newest published course and features the next ones", () => {
    db.delete(schema.courses).run();
    addCourse("Oldest", "2026-01-01T00:00:00.000Z");
    addCourse("Newest", "2026-04-01T00:00:00.000Z");
    addCourse("Middle", "2026-02-01T00:00:00.000Z");
    addCourse("Draft", "2026-05-01T00:00:00.000Z", {
      status: CourseStatus.Draft,
    });
    addCourse("Archived", "2026-06-01T00:00:00.000Z", {
      status: CourseStatus.Archived,
    });

    const { spotlightCourse, featuredCourses } = catalogue();

    expect(spotlightCourse?.title).toBe("Newest");
    expect(titles(featuredCourses)).toEqual(["Middle", "Oldest"]);
  });

  it("features at most the limit, after the spotlight", () => {
    db.delete(schema.courses).run();
    for (let month = 1; month <= FEATURED_COURSE_LIMIT + 2; month++) {
      addCourse(`Month ${month}`, `2026-0${month}-01T00:00:00.000Z`);
    }

    const { spotlightCourse, featuredCourses } = catalogue();

    expect(spotlightCourse?.title).toBe("Month 5");
    expect(titles(featuredCourses)).toEqual(["Month 4", "Month 3", "Month 2"]);
  });

  it("breaks a tie on creation time by the later course", () => {
    db.delete(schema.courses).run();
    addCourse("First", "2026-01-01T00:00:00.000Z");
    addCourse("Second", "2026-01-01T00:00:00.000Z");

    const { spotlightCourse, featuredCourses } = catalogue();

    expect(spotlightCourse?.title).toBe("Second");
    expect(titles(featuredCourses)).toEqual(["First"]);
  });

  it("describes each featured course for its card", () => {
    db.delete(schema.courses).run();
    const course = addCourse("Only", "2026-01-01T00:00:00.000Z");

    expect(catalogue()).toMatchObject({
      spotlightCourse: {
        id: course.id,
        title: "Only",
        slug: course.slug,
        description: "About Only",
        coverImageUrl: null,
        instructorName: "Test Instructor",
        categoryName: "Programming",
        lessonCount: 0,
      },
      featuredCourses: [],
    });
  });

  it("counts the lessons of each featured course across its modules", () => {
    db.delete(schema.courses).run();
    const big = addCourse("Big", "2026-02-01T00:00:00.000Z");
    const small = addCourse("Small", "2026-01-01T00:00:00.000Z");
    addLessons(big.id, [2, 3]);
    addLessons(small.id, [1]);

    const { spotlightCourse, featuredCourses } = catalogue();

    expect(spotlightCourse?.lessonCount).toBe(5);
    expect(featuredCourses.map((c) => c.lessonCount)).toEqual([1]);
  });

  it("counts published courses, their categories and their lessons", () => {
    addCourse("Second", "2026-01-01T00:00:00.000Z");
    const design = addCategory("Design");
    addCourse("Design", "2026-01-01T00:00:00.000Z", { categoryId: design.id });
    const writing = addCategory("Writing");
    const draft = addCourse("Draft", "2026-01-01T00:00:00.000Z", {
      status: CourseStatus.Draft,
      categoryId: writing.id,
    });
    addCategory("Empty");
    addLessons(base.course.id, [4]);
    addLessons(draft.id, [7]);

    const {
      publishedCourseCount,
      publishedCategoryCount,
      publishedLessonCount,
    } = catalogue();

    expect(publishedCourseCount).toBe(3);
    expect(publishedCategoryCount).toBe(2);
    expect(publishedLessonCount).toBe(4);
  });

  it("is empty when nothing is published", () => {
    db.delete(schema.courses).run();
    addCourse("Draft", "2026-01-01T00:00:00.000Z", {
      status: CourseStatus.Draft,
    });

    expect(catalogue()).toEqual({
      spotlightCourse: null,
      featuredCourses: [],
      publishedCourseCount: 0,
      publishedCategoryCount: 0,
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

describe("getFooterLinks", () => {
  it("offers a visitor the courses, log in and sign up", () => {
    expect(getFooterLinks(false)).toEqual([
      { label: "Courses", to: "/courses" },
      { label: "Log In", to: "/login" },
      { label: "Sign Up", to: "/signup" },
    ]);
  });

  it("offers someone signed in the courses and their dashboard", () => {
    expect(getFooterLinks(true)).toEqual([
      { label: "Courses", to: "/courses" },
      { label: "Dashboard", to: "/dashboard" },
    ]);
  });
});
