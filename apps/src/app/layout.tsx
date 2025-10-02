import { headers } from "next/headers";
import type { ReactNode } from "react";
import { defaultLocale } from "../i18n/config";
import ThemeProvider from "../providers/theme-provider";
import "./globals.css";

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const headersList = await headers();
  const locale = headersList.get("x-next-intl-locale") ?? defaultLocale;
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
