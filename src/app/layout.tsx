import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "اتوماسیون شناسایی و بهبود سئوی شرکت‌های نمایشگاهی",
  description:
    "ابزار خودکار برای بررسی شرکت‌های شرکت‌کننده در نمایشگاه‌ها، شناسایی مواردی که در Google Maps ثبت نشده‌اند و تولید پیشنهاد بهبود سئو برای آن‌ها.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa-IR" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased" style={{ fontFamily: "'Vazirmatn', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
