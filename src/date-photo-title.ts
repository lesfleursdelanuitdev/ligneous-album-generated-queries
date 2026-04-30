const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function monthName(m: number | null | undefined): string | null {
  if (m == null || m < 1 || m > 12) return null;
  return MONTHS[m - 1] ?? null;
}

/**
 * Human fragment after **Media from …** for a canonical `gedcom_dates_v2` row.
 * Examples: **the 1890s**, **1945**, **March 1891**, **1890–1910**, or trimmed `original`.
 */
export function buildDateMediaFragment(args: {
  original: string | null | undefined;
  year: number | null | undefined;
  month: number | null | undefined;
  day: number | null | undefined;
  endYear: number | null | undefined;
  endMonth: number | null | undefined;
  endDay: number | null | undefined;
}): string {
  const orig = args.original?.trim();
  if (orig) {
    if (/^\d{3,4}s$/i.test(orig)) return `the ${orig}`;
    if (orig.length <= 48) return orig;
  }

  const y = args.year ?? null;
  const ey = args.endYear ?? null;
  const m = args.month ?? null;
  const d = args.day ?? null;
  const em = args.endMonth ?? null;
  const ed = args.endDay ?? null;

  if (y != null && ey != null && ey !== y && m == null && d == null && em == null && ed == null) {
    const decadeY = Math.floor(y / 10) * 10;
    const decadeEy = Math.floor(ey / 10) * 10;
    if (decadeY === decadeEy) return `the ${decadeY}s`;
    return `${y}–${ey}`;
  }

  if (y != null && ey == null && m == null && d == null) {
    return `${y}`;
  }

  if (y != null && m != null && d != null && ey == null) {
    const mn = monthName(m);
    if (mn) return `${mn} ${y}`;
  }

  if (y != null && m != null && ey == null) {
    const mn = monthName(m);
    if (mn) return `${mn} ${y}`;
  }

  if (orig) return orig.slice(0, 48).trim();
  if (y != null) return `${y}`;
  return "this time period";
}

export function buildDateMediaTitle(dateArgs: Parameters<typeof buildDateMediaFragment>[0]): string {
  const frag = buildDateMediaFragment(dateArgs);
  if (frag.startsWith("the ")) return `Media from ${frag}`;
  return `Media from ${frag}`;
}
