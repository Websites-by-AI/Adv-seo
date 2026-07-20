const ALLOWED_CHANNELS = new Set([
  "whatsapp",
  "telegram",
  "bale",
  "rubika",
  "soroush",
  "eitaa",
  "divar-chat",
  "email",
  "sms",
  "divar",
]);

async function readBody(request) {
  if (request.body && typeof request.body === "object") return request.body;
  return await new Promise((resolve, reject) => {
    let data = "";
    request.on("data", (chunk) => {
      data += chunk;
      if (data.length > 200_000) {
        reject(new Error("Payload too large"));
      }
    });
    request.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ ok: false, message: "Method not allowed" });
  }

  let body;
  try {
    body = await readBody(request);
  } catch {
    return response.status(400).json({ ok: false, message: "بدنه درخواست نامعتبر است." });
  }

  const { channel, recipient, subject, text, approved, consent } = body ?? {};
  if (!ALLOWED_CHANNELS.has(channel)) {
    return response.status(400).json({ ok: false, message: "کانال مجاز نیست." });
  }
  if (!recipient || typeof recipient !== "string" || !text || typeof text !== "string") {
    return response.status(400).json({ ok: false, message: "مخاطب یا متن پیام معتبر نیست." });
  }
  if (!approved || !consent) {
    return response.status(400).json({ ok: false, message: "تایید انسانی و رضایت مخاطب الزامی است." });
  }

  const sendEnabled = (process.env.SEND_ENABLED ?? "false").toLowerCase() === "true";
  const dryRun = (process.env.DRY_RUN ?? "true").toLowerCase() !== "false";

  if (!sendEnabled || dryRun) {
    return response.status(200).json({
      ok: true,
      status: "dry-run",
      message: sendEnabled ? "حالت Dry Run در سرور فعال است؛ ارسال واقعی انجام نشد." : "SEND_ENABLED=true تنظیم نشده؛ ارسال غیرفعال است.",
    });
  }

  // Placeholder for real provider dispatch. Production deployments should call:
  //   - Meta WhatsApp Cloud API                for channel === "whatsapp"
  //   - Telegram Bot API                       for channel === "telegram"
  //   - Bale Bot API (https://tapi.bale.ai/)   for channel === "bale"
  //   - Rubika Bot API (https://botapi.rubika) for channel === "rubika"
  //   - Soroush Bot API (soroushplus.com)      for channel === "soroush"
  //   - Eitaa Yar Webhook (eitaayar.ir)        for channel === "eitaa"
  //   - Divar Chat API (with partner access)   for channel === "divar-chat"
  //   - SMTP (nodemailer)                      for channel === "email"
  //   - SMS provider webhook                   for channel === "sms"
  //   - Authorized Divar partner webhook       for channel === "divar" (never scraped)
  // Each provider should enforce its own rate limits.
  const preview = { channelUsed: channel, recipientBytes: recipient.length, subject: subject ?? null, textLength: text.length };

  return response.status(200).json({
    ok: true,
    status: "sent",
    message: `ارسال با کانال ${channel} در صف قرار گرفت.`,
    preview,
  });
}
