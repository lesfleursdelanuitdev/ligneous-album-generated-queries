/** Display helpers for generated album titles (shared admin + public). */

export function stripSlashesFromName(s: string | null | undefined): string {
  if (s == null || s === "") return "";
  return s.replace(/\//g, "").replace(/\s+/g, " ").trim();
}

const GEDCOM_EVENT_TYPE_LABELS: Record<string, string> = {
  BIRT: "Birth",
  CHR: "Christening",
  CHRA: "Adult christening",
  BAPM: "Baptism",
  CONF: "Confirmation",
  DEAT: "Death",
  BURI: "Burial",
  CREM: "Cremation",
  ADOP: "Adoption",
  MARR: "Marriage",
  DIV: "Divorce",
  ENGA: "Engagement",
  ANUL: "Annulment",
  RESI: "Residence",
  OCCU: "Occupation",
  EDUC: "Education",
  GRAD: "Graduation",
  IMMI: "Immigration",
  EMIG: "Emigration",
  NATU: "Naturalization",
  CENS: "Census",
  PROP: "Property",
  WILL: "Will",
  EVEN: "Event",
};

export function labelGedcomEventType(eventType: string): string {
  const key = (eventType ?? "").toUpperCase().trim();
  return GEDCOM_EVENT_TYPE_LABELS[key] ?? eventType ?? "Event";
}
