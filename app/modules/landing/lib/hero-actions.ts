export type HeroAction = { label: string; to: string };

export type HeroActions = {
  primary: HeroAction;
  secondary: HeroAction;
};

/**
 * The two calls to action in the landing page hero. A visitor is asked to
 * browse and sign up; someone signed in is sent back to their own learning.
 */
export function getHeroActions(signedIn: boolean): HeroActions {
  if (signedIn) {
    return {
      primary: { label: "Continue learning", to: "/dashboard" },
      secondary: { label: "Browse courses", to: "/courses" },
    };
  }
  return {
    primary: { label: "Browse courses", to: "/courses" },
    secondary: { label: "Create a free account", to: "/signup" },
  };
}
