import { ListPlus, SearchCheck, Gauge, FileText } from "lucide-react";
import { Reveal } from "@/components/motion";

const STEPS = [
  {
    icon: ListPlus,
    title: "دریافت لیست نمایشگاه",
    desc: "شرکت‌های غرفه‌دار از دیتای «نمایشگاه درب و پنجره تهران ۱۴۰۴» وارد می‌شود.",
  },
  {
    icon: SearchCheck,
    title: "ردیابی در گوگل",
    desc: "هر شرکت برای کلیدواژه‌های اصلی صنعت چک می‌شود؛ کدام‌ها در صفحه اول نیستند؟",
  },
  {
    icon: Gauge,
    title: "تحلیل سلامت سئو",
    desc: "سایت، SSL، موبایل، سرعت، تگ‌ها و محتوا — امتیاز ۰ تا ۱۰۰ می‌گیرند.",
  },
  {
    icon: FileText,
    title: "تولید گزارش پیشنهادی",
    desc: "برنامه اقدام + پیشنهاد طراحی وب‌سایت + نقشه راه رسیدن به ۱۰ نتیجه اول.",
  },
];

export default function Pipeline() {
  return (
    <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-x-8 top-14 hidden h-10 w-[calc(100%-4rem)] lg:block"
        viewBox="0 0 100 10"
        preserveAspectRatio="none"
      >
        <line
          x1="0"
          y1="5"
          x2="100"
          y2="5"
          stroke="rgba(242,169,59,0.35)"
          strokeWidth="0.4"
          className="dash-flow"
        />
      </svg>
      {STEPS.map((s, i) => (
        <Reveal key={s.title} delay={i * 0.1} className="relative">
          <div className="card-surface h-full rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="grid size-11 place-items-center rounded-xl border border-gold-400/25 bg-gold-400/10 text-gold-400">
                <s.icon className="size-5" />
              </span>
              <span className="text-xs font-black text-fog-500">مرحله {(i + 1).toLocaleString("fa-IR")}</span>
            </div>
            <h3 className="mt-4 text-[15px] font-black">{s.title}</h3>
            <p className="mt-1.5 text-[12.5px] leading-6 text-fog-500">{s.desc}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
