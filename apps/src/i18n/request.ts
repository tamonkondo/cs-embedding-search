import type { AbstractIntlMessages } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, type Locale, locales } from "./config";

export default getRequestConfig(async ({ locale }) => {
  let messages: AbstractIntlMessages;
  const normalizedLocale = (locale ?? defaultLocale) as Locale;

  if (!locales.includes(normalizedLocale)) {
    throw new Error(`Unsupported locale: ${locale}`);
  }

  if (normalizedLocale === "en") {
    messages = (await import("./messages/en.json")).default;
  } else {
    messages = (await import("./messages/ja.json")).default;
  }

  return {
    locale: normalizedLocale,
    messages,
  };
});
