import { notFound } from "next/navigation";

// Any path under /{locale} that no page matches lands here, so it gets the
// localized not-found.tsx (with header and footer) instead of Next's default.
export default function CatchAll() {
  notFound();
}
