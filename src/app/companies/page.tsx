import { Building2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import CompaniesBoard from "@/components/CompaniesBoard";
import RunPanel from "@/components/RunPanel";
import ImportPanel from "@/components/ImportPanel";
import { Reveal } from "@/components/motion";
import { getLeads } from "@/lib/queries";
import { EXHIBITION_NAME } from "@/lib/data";
import { faInt } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "شرکت‌های نمایشگاه | رادار لید",
};

export default async function CompaniesPage() {
  const leads = await getLeads();

  return (
    <div className="relative min-h-screen">
      <Navbar />
      <main className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-grid opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]" />

        <Reveal>
          <div className="mb-8 flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl border border-gold-400/25 bg-gold-400/10 text-gold-400">
              <Building2 className="size-6" />
            </span>
            <div>
              <h1 className="text-3xl font-black">شرکت‌های {EXHIBITION_NAME}</h1>
              <p className="mt-1 text-[13px] text-fog-500">
                {faInt(leads.length)} شرکت · وضعیت حضور در گوگل و امتیاز سئو هر کدام
              </p>
            </div>
          </div>
        </Reveal>

        {leads.length === 0 && (
          <Reveal className="mb-8">
            <RunPanel serperEnabled={Boolean(process.env.SERPER_API_KEY)} />
          </Reveal>
        )}

        <Reveal className="mb-6">
          <ImportPanel />
        </Reveal>

        <Reveal delay={0.08}>
          <CompaniesBoard rows={leads} />
        </Reveal>
      </main>
    </div>
  );
}
