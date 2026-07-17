import Link from "next/link";
import { Radar, LayoutDashboard, Building2 } from "lucide-react";

export default function Navbar() {
  return (
    <header className="no-print sticky top-0 z-50 border-b border-line/60 bg-ink/80 backdrop-blur-xl">
      <div className="h-0.5 w-full bg-gradient-to-l from-gold-400/70 via-gold-400/20 to-transparent" />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl border border-gold-400/30 bg-gold-400/10 text-gold-400 transition group-hover:rotate-12">
            <Radar className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-black tracking-tight">رادار لید</span>
            <span className="block text-[10px] font-medium text-fog-500">
              اتوماسیون شکار لید نمایشگاهی
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-fog-300 transition hover:bg-white/5 hover:text-white"
          >
            <LayoutDashboard className="size-4" />
            داشبورد
          </Link>
          <Link
            href="/companies"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-fog-300 transition hover:bg-white/5 hover:text-white"
          >
            <Building2 className="size-4" />
            شرکت‌ها
          </Link>
          <span className="mr-2 hidden items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1.5 text-[11px] font-medium text-gold-300 sm:flex">
            <span className="size-1.5 animate-pulse rounded-full bg-gold-400" />
            نمایشگاه درب و پنجره تهران ۱۴۰۴
          </span>
        </nav>
      </div>
    </header>
  );
}
