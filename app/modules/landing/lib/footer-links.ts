export type FooterLink = { label: string; to: string };

/** Someone signed in has no use for the log-in and sign-up links. */
export function getFooterLinks(signedIn: boolean): FooterLink[] {
  if (signedIn) {
    return [
      { label: "Courses", to: "/courses" },
      { label: "Dashboard", to: "/dashboard" },
    ];
  }
  return [
    { label: "Courses", to: "/courses" },
    { label: "Log In", to: "/login" },
    { label: "Sign Up", to: "/signup" },
  ];
}
