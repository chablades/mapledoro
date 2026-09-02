import type { Metadata } from "next";
import type { ReactNode } from "react";

// Every number renders the same client-side workspace, so leave the archive out
// of the index and keep crawlers on the canonical daily page.
export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function SkillGuesserArchiveLayout({ children }: { children: ReactNode }) {
  return children;
}
