import { Link } from "react-router";
import { useState, useEffect } from "react";
import type { Route } from "./+types/home";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "~/components/ui/card";
import {
  BookOpen,
  GraduationCap,
  Layers,
  ArrowRight,
  User,
  Moon,
  Sun,
  Sparkles,
} from "lucide-react";
import { CourseImage } from "~/components/course-image";
import { DevUI } from "~/components/dev-ui";
import { getCurrentUserId, getDevCountry } from "~/lib/session";
import { getCountryTierInfo, COUNTRIES } from "~/lib/ppp";
import { eq } from "drizzle-orm";
import { db } from "~/db";
import { users } from "~/db/schema";
import { landing } from "~/modules/landing/index.server";
import { getHeroActions } from "~/modules/landing";

function getAllUsers() {
  return db.select().from(users).all();
}

function getUserById(id: number) {
  return db.select().from(users).where(eq(users.id, id)).get();
}

type HomeCourse = Route.ComponentProps["loaderData"]["featuredCourses"][number];

function SpotlightCourse({ course }: { course: HomeCourse }) {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-4 -rotate-2 rounded-3xl bg-primary/5"
      />
      <Link to={`/courses/${course.slug}`} className="group relative block">
        <Card className="overflow-hidden pt-0 shadow-lg transition-shadow group-hover:shadow-xl">
          <CourseImage
            src={course.coverImageUrl}
            alt={course.title}
            className="aspect-video w-full object-cover"
          />
          <CardHeader>
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              New in {course.categoryName}
            </p>
            <h2 className="text-xl font-semibold leading-snug group-hover:text-primary">
              {course.title}
            </h2>
          </CardHeader>
          <CardContent>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {course.description}
            </p>
          </CardContent>
          <CardFooter className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <User className="size-4" />
              {course.instructorName}
            </span>
            <span className="flex items-center gap-1 font-medium text-foreground">
              Start course
              <ArrowRight className="size-4" />
            </span>
          </CardFooter>
        </Card>
      </Link>
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof BookOpen;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="size-6 text-primary" />
      </div>
      <div className="flex flex-col-reverse">
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className="text-2xl font-bold">{value}</dd>
      </div>
    </div>
  );
}

export function meta() {
  return [
    { title: "Cadence — Learn at your own pace" },
    {
      name: "description",
      content:
        "A modern course platform for developers. Browse courses, track your progress, and learn at your own pace.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const catalogue = landing.catalogue();
  const users = getAllUsers();
  const currentUserId = await getCurrentUserId(request);
  const currentUser = currentUserId ? getUserById(currentUserId) : null;
  const devCountry = await getDevCountry(request);
  const countryTierInfo = getCountryTierInfo(devCountry);

  return {
    ...catalogue,
    users: users.map((u) => ({ id: u.id, name: u.name, role: u.role })),
    currentUser: currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : null,
    devCountry,
    countryTierInfo,
    countries: COUNTRIES,
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const {
    featuredCourses,
    publishedCourseCount,
    categoryCount,
    publishedLessonCount,
    users,
    currentUser,
    devCountry,
    countryTierInfo,
    countries,
  } = loaderData;
  const [isDark, setIsDark] = useState(false);
  const heroActions = getHeroActions(currentUser !== null);
  const spotlight = featuredCourses[0];
  const footerLinks = currentUser
    ? [
        { label: "Courses", to: "/courses" },
        { label: "Dashboard", to: "/dashboard" },
      ]
    : [
        { label: "Courses", to: "/courses" },
        { label: "Log In", to: "/login" },
        { label: "Sign Up", to: "/signup" },
      ];

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleDarkMode() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("cadence-theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="text-xl font-bold tracking-tight">
            Cadence
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              to="/courses"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Courses
            </Link>
            <button
              onClick={toggleDarkMode}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </button>
            {currentUser ? (
              <Button asChild size="sm">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Log In
                </Link>
                <Button asChild size="sm">
                  <Link to="/signup">Sign Up</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-[1.1fr_1fr] lg:py-28">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            {publishedCourseCount} courses across {categoryCount} categories
          </p>
          <h1 className="mt-6 text-5xl font-bold tracking-tight sm:text-6xl">
            Learn to code,
            <br />
            <span className="text-muted-foreground">at your own pace</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Structured courses built by experienced instructors. Track your
            progress, take quizzes, and build real-world skills.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Button asChild size="lg">
              <Link to={heroActions.primary.to}>
                {heroActions.primary.label}
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to={heroActions.secondary.to}>
                {heroActions.secondary.label}
              </Link>
            </Button>
          </div>
        </div>

        {spotlight && <SpotlightCourse course={spotlight} />}
      </section>

      <section className="border-y border-border bg-muted/50 py-12">
        <dl className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 sm:grid-cols-3">
          <Stat icon={BookOpen} value={publishedCourseCount} label="Courses" />
          <Stat icon={Layers} value={categoryCount} label="Categories" />
          <Stat
            icon={GraduationCap}
            value={publishedLessonCount}
            label="Lessons to work through"
          />
        </dl>
      </section>

      {featuredCourses.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Featured Courses
              </h2>
              <p className="mt-2 text-muted-foreground">
                The newest additions to the catalogue
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/courses">
                View all
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredCourses.map((course) => (
              <Link
                key={course.id}
                to={`/courses/${course.slug}`}
                className="group"
              >
                <Card className="h-full overflow-hidden pt-0 transition-shadow group-hover:shadow-md">
                  <CourseImage
                    src={course.coverImageUrl}
                    alt={course.title}
                    className="aspect-video w-full object-cover"
                  />
                  <CardHeader>
                    <h3 className="font-semibold leading-snug group-hover:text-primary">
                      {course.title}
                    </h3>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {course.description}
                    </p>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="size-3" />
                      {course.instructorName}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="size-3" />
                      {course.lessonCount} lessons
                    </span>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold tracking-tight">Cadence</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Learn to code, at your own pace.
            </p>
          </div>
          <nav className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            {footerLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>

      <DevUI
        users={users}
        currentUser={currentUser}
        devCountry={devCountry}
        countryTierInfo={countryTierInfo}
        countries={countries}
      />
    </div>
  );
}
