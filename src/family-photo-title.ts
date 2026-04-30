import { stripSlashesFromName } from "./gedcom-mini";

/** Best-effort surname from GEDCOM `INDI.NAME` style `John /Smith/`. */
export function gedcomSurnameFromFullName(fullName: string | null | undefined): string | null {
  const s = (fullName ?? "").trim();
  const m = s.match(/\/([^/]+)\//);
  const g = m?.[1]?.trim();
  return g || null;
}

/**
 * **Media for the Smith family** when a surname can be inferred; otherwise **Family media** (mixed / unknown).
 */
export function buildFamilyMediaTitle(args: {
  husbandFullName: string | null | undefined;
  wifeFullName: string | null | undefined;
  familyXref: string | null | undefined;
}): string {
  const hSur = gedcomSurnameFromFullName(args.husbandFullName);
  const wSur = gedcomSurnameFromFullName(args.wifeFullName);
  if (hSur && wSur && hSur.toLowerCase() === wSur.toLowerCase()) {
    return `Media for the ${hSur} family`;
  }
  if (hSur && !wSur) return `Media for the ${hSur} family`;
  if (wSur && !hSur) return `Media for the ${wSur} family`;
  const h = stripSlashesFromName(args.husbandFullName);
  const w = stripSlashesFromName(args.wifeFullName);
  if (h && w) return `Media for the family of ${h} and ${w}`;
  if (h || w) return `Media for the family of ${h || w}`;
  const xr = args.familyXref?.trim();
  if (xr) return `Media for family ${xr}`;
  return "Family media";
}
