import { RfqBoard } from "@/components/rfq-board";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "مناقصه محرمانه سئو — لیدفِر",
  description:
    "استعلام قیمت محرمانه از ارائه‌دهندگان سئو بدون افشای نام شرکت لید تا قبل از امانت/پورسانت",
};

export default function RfqPage() {
  return <RfqBoard />;
}
