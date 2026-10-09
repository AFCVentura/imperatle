import { notFound } from "next/navigation";
import "../globals.css";

// Dev-only pages (map prototypes), outside the game's [locale] layout so they
// don't need the API running. 404 in production.
export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <html lang="pt">
      <body className="bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
