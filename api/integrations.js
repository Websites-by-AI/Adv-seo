function has(...keys) {
  return keys.every((key) => Boolean(process.env[key]));
}

export default function handler(_request, response) {
  const integrations = [
    {
      channel: "whatsapp",
      ok: has("WHATSAPP_TOKEN", "WHATSAPP_PHONE_ID"),
      label: "WhatsApp Business (Meta Cloud API)",
      note: has("WHATSAPP_TOKEN", "WHATSAPP_PHONE_ID")
        ? "کلیدها تنظیم شده است"
        : "WHATSAPP_TOKEN و WHATSAPP_PHONE_ID تنظیم نشده",
    },
    {
      channel: "telegram",
      ok: has("TELEGRAM_BOT_TOKEN"),
      label: "Telegram Bot API",
      note: has("TELEGRAM_BOT_TOKEN") ? "توکن ربات فعال است" : "TELEGRAM_BOT_TOKEN تنظیم نشده",
    },
    {
      channel: "bale",
      ok: has("BALE_BOT_TOKEN"),
      label: "Bale Bot API (bale.ai)",
      note: has("BALE_BOT_TOKEN") ? "توکن ربات بله فعال است" : "BALE_BOT_TOKEN تنظیم نشده — انتقال دستی از web.bale.ai فعال است",
    },
    {
      channel: "rubika",
      ok: has("RUBIKA_BOT_TOKEN"),
      label: "Rubika Bot API (rubika.ir)",
      note: has("RUBIKA_BOT_TOKEN") ? "توکن ربات روبیکا فعال است" : "RUBIKA_BOT_TOKEN تنظیم نشده — انتقال دستی از web.rubika.ir فعال است",
    },
    {
      channel: "soroush",
      ok: has("SOROUSH_BOT_TOKEN"),
      label: "Soroush Plus Bot (soroushplus.com)",
      note: has("SOROUSH_BOT_TOKEN") ? "توکن ربات سروش پلاس فعال است" : "SOROUSH_BOT_TOKEN تنظیم نشده — انتقال دستی از web.splus.ir فعال است",
    },
    {
      channel: "eitaa",
      ok: has("EITAA_TOKEN"),
      label: "Eitaa Yar Webhook (eitaa.com)",
      note: has("EITAA_TOKEN") ? "دسترسی ایتایار فعال است" : "EITAA_TOKEN تنظیم نشده — انتقال دستی از web.eitaa.com فعال است",
    },
    {
      channel: "divar-chat",
      ok: has("DIVAR_CHAT_TOKEN"),
      label: "Divar Chat API (divar.ir)",
      note: has("DIVAR_CHAT_TOKEN")
        ? "دسترسی چت Divar فعال است"
        : "DIVAR_CHAT_TOKEN تنظیم نشده — گفت‌وگو باید از داخل divar.ir ادامه یابد",
    },
    {
      channel: "email",
      ok: has("SMTP_HOST", "SMTP_USER"),
      label: "SMTP / Email سرور",
      note: has("SMTP_HOST", "SMTP_USER") ? "سرور SMTP تنظیم شده" : "SMTP_HOST و SMTP_USER تنظیم نشده",
    },
    {
      channel: "sms",
      ok: has("SMS_WEBHOOK_URL", "SMS_API_KEY"),
      label: "SMS Provider Webhook",
      note: has("SMS_WEBHOOK_URL", "SMS_API_KEY")
        ? "وبهوک اپراتور فعال است"
        : "SMS_WEBHOOK_URL و SMS_API_KEY تنظیم نشده",
    },
    {
      channel: "divar",
      ok: has("DIVAR_PARTNER_URL", "DIVAR_API_KEY"),
      label: "Divar Partner Webhook",
      note: has("DIVAR_PARTNER_URL", "DIVAR_API_KEY")
        ? "دسترسی شریک Divar فعال است"
        : "دسترسی رسمی Divar Partner تنظیم نشده — حالت انتقال دستی فعال است",
    },
  ];

  response.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
  response.status(200).json({
    dryRunDefault: (process.env.DRY_RUN ?? "true").toLowerCase() !== "false",
    sendEnabled: (process.env.SEND_ENABLED ?? "false").toLowerCase() === "true",
    integrations,
  });
}
