import { defineRouting } from "next-intl/routing";
import { LOCALES } from "./locales";

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: "en",
});
