import { notFound } from "next/navigation";
import { Generator } from "./Generator";

// Empire generator: builds a new empire (map and every clue) from Cliopatria
// and saves it as the API's content files. Development only for now; the
// public version (signed-in subscribers suggesting empires) will reuse it.
export default function GeneratorPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Generator />;
}
