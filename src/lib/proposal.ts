// Generates a tailored, Persian-language proposal offering to build / fix a
// company's Google Business Profile and improve its overall online (SEO)
// footprint. The suggestions adapt slightly based on the data we already
// know about the company (whether it has a website, phone number, etc).

export type ProposalCompanyInput = {
  name: string;
  exhibitionTitle?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  category?: string | null;
};

export function generateProposal(company: ProposalCompanyInput): string {
  const {
    name,
    exhibitionTitle,
    phone,
    website,
    address,
    category,
  } = company;

  const hasWebsite = Boolean(website && website.trim().length > 0);
  const hasAddress = Boolean(address && address.trim().length > 0);
  const hasPhone = Boolean(phone && phone.trim().length > 0);

  const suggestions: string[] = [
    "ثبت و تأیید صفحه‌ی «Google Business Profile» به‌نام رسمی شرکت، به همراه انتخاب دسته‌بندی کسب‌وکار دقیق و مرتبط با فعالیت شما.",
    hasAddress
      ? `درج آدرس دقیق (${address}) روی نقشه گوگل و فعال‌سازی مسیر‌یابی، تا مشتریان به‌راحتی محل شرکت را پیدا کنند.`
      : "ثبت یک آدرس دقیق و مکان‌یابی‌شده روی نقشه گوگل (حتی در صورت نبود شعبه فیزیکی، می‌توان «منطقه‌ی خدمات‌رسانی» تعریف کرد).",
    hasPhone
      ? `به‌روزرسانی و تأیید شماره تماس (${phone}) در پروفایل گوگل و هماهنگ‌سازی آن با شماره‌ی درج‌شده در وب‌سایت و شبکه‌های اجتماعی.`
      : "افزودن یک شماره تماس ثابت و پاسخگو به پروفایل گوگل تا مشتریان بالقوه بتوانند مستقیم تماس بگیرند.",
    "بارگذاری حداقل ۱۰ تصویر باکیفیت از محصولات، نمایشگاه، کارخانه یا دفتر شرکت در گالری Google Business برای افزایش اعتماد کاربران.",
    "درخواست فعالانه از مشتریان راضی برای ثبت نظر (Review) در گوگل و پاسخ‌گویی حرفه‌ای به تمام نظرات، مثبت و منفی.",
    hasWebsite
      ? `بهینه‌سازی سئوی وب‌سایت فعلی (${website}) شامل بهبود سرعت بارگذاری، افزودن متادیتای فارسی مناسب و ساختار عنوان‌بندی H1 تا H3.`
      : "طراحی یک وب‌سایت حرفه‌ای حداقل تک‌صفحه‌ای (لندینگ‌پیج) معرفی شرکت با اطلاعات تماس، نمونه‌کار و فرم درخواست مشاوره.",
    `تولید محتوای متنی و تصویری مرتبط با کلمات کلیدی صنعت${category ? ` «${category}»` : ""} برای افزایش رتبه در نتایج جستجوی گوگل.`,
    exhibitionTitle
      ? `انتشار خبر و گزارش تصویری از حضور شرکت در «${exhibitionTitle}» در وب‌سایت و شبکه‌های اجتماعی جهت افزایش اعتبار برند (Brand Authority).`
      : "انتشار اخبار و رویدادهای شرکت (نمایشگاه‌ها، افتخارات، محصولات جدید) به‌صورت منظم برای افزایش اعتبار برند نزد گوگل.",
    "ثبت اطلاعات کسب‌وکار در دایرکتوری‌ها و نقشه‌های داخلی معتبر (مانند نشان، بلد، ویترین‌سیتی) برای ایجاد بک‌لینک و افزایش اعتماد گوگل.",
    "پایش ماهانه‌ی عملکرد پروفایل گوگل و وب‌سایت با ابزارهایی مانند Google Search Console و Google Analytics برای اندازه‌گیری بازدید، تماس و مسیر‌یابی.",
  ];

  const intro = exhibitionTitle
    ? `شرکت «${name}» به‌عنوان یکی از شرکت‌کنندگان «${exhibitionTitle}» شناسایی شد، اما در بررسی انجام‌شده، این کسب‌وکار در حال حاضر در نتایج نقشه و جست‌وجوی گوگل (Google Maps / Google Business) یافت نشد یا اطلاعات آن ناقص است.`
    : `در بررسی انجام‌شده، شرکت «${name}» در حال حاضر در نتایج نقشه و جست‌وجوی گوگل (Google Maps / Google Business) یافت نشد یا اطلاعات آن ناقص است.`;

  const lines: string[] = [];
  lines.push(`# پیشنهاد بهبود حضور آنلاین و سئوی گوگل — ${name}`);
  lines.push("");
  lines.push(intro);
  lines.push(
    "نبود یا ناقص‌بودن پروفایل گوگل باعث از دست رفتن مشتریانی می‌شود که مستقیماً از طریق جست‌وجوی گوگل یا نقشه به دنبال این نوع محصول/خدمت هستند. پیشنهاد می‌شود در ۱۰ مرحله زیر نسبت به بهبود این وضعیت اقدام شود:",
  );
  lines.push("");
  suggestions.forEach((s, i) => {
    lines.push(`${i + 1}. ${s}`);
  });
  lines.push("");
  lines.push(
    "در صورت تمایل، تیم ما آماده است اجرای کامل این ۱۰ مورد (ثبت پروفایل گوگل، طراحی/بهینه‌سازی وب‌سایت و تولید محتوا) را به‌صورت بسته‌ای یکپارچه برای شرکت شما انجام دهد.",
  );

  return lines.join("\n");
}
