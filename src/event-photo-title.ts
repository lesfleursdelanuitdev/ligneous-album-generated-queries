import { labelGedcomEventType, stripSlashesFromName } from "./gedcom-mini";

function individualLabel(fullName: string | null | undefined, xref: string | null | undefined): string | null {
  const n = stripSlashesFromName(fullName);
  if (n) return n;
  const x = xref?.trim();
  return x || null;
}

function familyPairLabel(args: {
  husbandFullName: string | null | undefined;
  wifeFullName: string | null | undefined;
  husbandXref: string | null | undefined;
  wifeXref: string | null | undefined;
}): string | null {
  const x = individualLabel(args.husbandFullName, args.husbandXref);
  const y = individualLabel(args.wifeFullName, args.wifeXref);
  if (x && y) return `${x} and ${y}`;
  if (x) return x;
  if (y) return y;
  return null;
}

const EVENT_THE_PHRASE: Record<string, string> = {
  MARR: "the marriage",
  BIRT: "the birth",
  CHR: "the christening",
  CHRA: "the christening",
  BAPM: "the baptism",
  DEAT: "the death",
  BURI: "the burial",
  CREM: "the cremation",
  ADOP: "the adoption",
  DIV: "the divorce",
  ENGA: "the engagement",
  ANUL: "the annulment",
  RESI: "this residence",
  OCCU: "this occupation",
  IMMI: "this immigration",
  EMIG: "this emigration",
  NATU: "this naturalization",
  CENS: "this census",
};

/**
 * Story-first titles, e.g. **Media from the marriage of X and Y**, **Media from the baptism of Maria**.
 */
export function buildEventMediaTitle(args: {
  eventType: string;
  customType: string | null | undefined;
  familyPair: string | null;
  individualName: string | null;
}): string {
  const et = (args.eventType ?? "").toUpperCase().trim();
  const custom = args.customType?.trim() ?? null;

  if (et === "EVEN" && custom) {
    if (args.familyPair) return `Media from ${custom} of ${args.familyPair}`;
    if (args.individualName) return `Media from ${custom} of ${args.individualName}`;
    return `Media from ${custom}`;
  }

  const phrase = EVENT_THE_PHRASE[et];
  if (phrase && args.familyPair) return `Media from ${phrase} of ${args.familyPair}`;
  if (phrase && args.individualName) return `Media from ${phrase} of ${args.individualName}`;

  const head = labelGedcomEventType(args.eventType) + (et === "EVEN" && custom ? ` (${custom})` : "");
  if (args.familyPair) return `Media from ${head} of ${args.familyPair}`;
  if (args.individualName) return `Media from ${head} of ${args.individualName}`;
  return `Media from ${head}`;
}

export { familyPairLabel, individualLabel };
