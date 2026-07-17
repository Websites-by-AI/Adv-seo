import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "رادار لید | اتوماسیون شکار شرکت‌های غایب از صفحه اول گوگل",
  description:
    "اتوماسیون تحلیل شرکت‌های نمایشگاه: کشف کسب‌وکارهایی که در صفحه اول گوگل نیستند، تولید گزارش سئو و پیشنهاد طراحی وب‌سایت ورود به ۱۰ نتیجه اول.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-ink antialiased">{children}</body>
    </html>
  );
}
