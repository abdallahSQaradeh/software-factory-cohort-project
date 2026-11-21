import { db } from "~/db";
import { getLandingCatalogue, type Db } from "./lib/catalogue";

export type { FeaturedCourse, LandingCatalogue } from "./lib/catalogue";
export { FEATURED_COURSE_LIMIT } from "./lib/catalogue";

/**
 * What the landing page shows about the catalogue, bound to a database. The
 * app uses `landing`; tests build their own against a test database.
 */
export function createLanding(database: Db) {
  return {
    /** The featured courses and the catalogue figures, in five queries. */
    catalogue() {
      return getLandingCatalogue(database);
    },
  };
}

// Pure so a route importing this only for its loader doesn't pull the
// database into the client bundle (see `~/db`).
export const landing = /* @__PURE__ */ createLanding(db);
