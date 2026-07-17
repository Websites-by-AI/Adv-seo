// Parses bulk-pasted exhibitor lists into structured company rows.
//
// Accepted line formats (fields separated by "|", tab, ";", or ","):
//   نام شرکت | تلفن | وبسایت | آدرس | دسته‌بندی | ایمیل
//   نام شرکت
//
// Blank lines are ignored. Extra whitespace is trimmed. Because company
// names, addresses and websites can legitimately contain a comma, we only
// fall back to comma-splitting when no "|"/tab/";" separator is present on
// the line at all (i.e. a plain CSV-style paste from a spreadsheet).

export type ParsedCompany = {
  name: string;
  phone?: string;
  website?: string;
  address?: string;
  category?: string;
  email?: string;
};

const STRONG_SEPARATORS = /\t|\||;/;

function splitLine(line: string): string[] {
  const parts = STRONG_SEPARATORS.test(line) ? line.split(STRONG_SEPARATORS) : line.split(",");
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[\d\s+()-]{6,}$/;
const URL_RE = /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}([/?#].*)?$/i;

export function parseCompaniesText(raw: string): ParsedCompany[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const rows: ParsedCompany[] = [];

  for (const line of lines) {
    const parts = splitLine(line);
    if (parts.length === 0) continue;

    const [name, ...rest] = parts;
    if (!name) continue;

    const row: ParsedCompany = { name };
    const leftovers: string[] = [];

    // Only classify fields that have an unambiguous shape (email/phone/
    // URL). Free-text fields such as address and category look alike
    // (both are just Persian words), so guessing by length is unreliable
    // — instead we keep those in the documented positional order
    // (آدرس سپس دسته‌بندی) among whatever is left over.
    for (const field of rest) {
      if (!row.email && EMAIL_RE.test(field)) {
        row.email = field;
      } else if (!row.phone && PHONE_RE.test(field) && /\d/.test(field)) {
        row.phone = field;
      } else if (!row.website && URL_RE.test(field) && !EMAIL_RE.test(field)) {
        row.website = field;
      } else {
        leftovers.push(field);
      }
    }

    if (leftovers[0]) row.address = leftovers[0];
    if (leftovers[1]) row.category = leftovers[1];

    rows.push(row);
  }

  return rows;
}

// De-duplicates a batch of parsed companies against each other and against
// an existing list of names (case/whitespace/Arabic-Persian-glyph
// insensitive), so re-importing the same list twice — even from a
// different source that uses Arabic-style ي/ك instead of Persian ی/ک —
// doesn't create duplicate rows. Also treats an exact phone-number match
// as a duplicate signal, since the same company is often re-listed under
// slightly different name spellings/prefixes ("شرکت X" vs "گروه X") across
// exhibition sources.
export function dedupeCompanies(
  parsed: ParsedCompany[],
  existing: Iterable<string> | Iterable<{ name: string; phone?: string | null }>,
): { toInsert: ParsedCompany[]; skipped: string[] } {
  const seenNames = new Set<string>();
  const seenPhones = new Set<string>();

  for (const entry of existing) {
    if (typeof entry === "string") {
      seenNames.add(normalizeName(entry));
    } else {
      seenNames.add(normalizeName(entry.name));
      const phone = normalizePhone(entry.phone);
      if (phone) seenPhones.add(phone);
    }
  }

  const toInsert: ParsedCompany[] = [];
  const skipped: string[] = [];

  for (const row of parsed) {
    const key = normalizeName(row.name);
    const phoneKey = normalizePhone(row.phone);

    if (seenNames.has(key) || (phoneKey && seenPhones.has(phoneKey))) {
      skipped.push(row.name);
      continue;
    }

    seenNames.add(key);
    if (phoneKey) seenPhones.add(phoneKey);
    toInsert.push(row);
  }

  return { toInsert, skipped };
}

// Unifies the handful of Arabic/Persian glyph variants that commonly show
// up interchangeably in Persian business names pulled from different
// sources (WordPress pages, PDFs, spreadsheets), so "شرکت‌ي" and "شرکت‌ی"
// are correctly recognized as the same company instead of two different
// ones.
function normalizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\u200c\u200f\u200e]/g, "") // zero-width non-joiner / direction marks
    .replace(/[يى]/g, "ی") // Arabic yeh / alef maksura -> Persian yeh
    .replace(/ك/g, "ک") // Arabic kaf -> Persian kaf
    .replace(/[ةه]$/g, "ه") // trailing teh marbuta -> heh
    .replace(/[أإآ]/g, "ا") // alef variants -> plain alef
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ی")
    .toLowerCase();
}

// Normalizes a phone number to digits-only (converting Persian/Arabic-Indic
// digits to ASCII) so "۰۲۱-۱۱۱۱۲۲۲۲", "021 1111 2222" and "02111112222"
// are all recognized as the same number for duplicate detection.
function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const asciiDigits = phone
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/\D/g, "");
  return asciiDigits.length >= 6 ? asciiDigits : null;
}
