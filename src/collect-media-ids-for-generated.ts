import type { PrismaClient } from "@ligneous/prisma";
import type { AlbumViewSource } from "@ligneous/album-view";
import { stripSlashesFromName } from "./gedcom-mini";
import { buildDateMediaTitle } from "./date-photo-title";
import { buildEventMediaTitle, familyPairLabel, individualLabel } from "./event-photo-title";
import { buildFamilyMediaTitle } from "./family-photo-title";

export type GeneratedAlbumCollectResult = {
  title: string;
  mediaIds: string[];
  /** Explicit profile/cover GedcomMedia id for individual/family/event sources, when set. */
  preferredCoverMediaId: string | null;
};

function mergeMediaIds(...groups: string[][]): string[] {
  const set = new Set<string>();
  for (const g of groups) {
    for (const id of g) {
      if (id) set.add(id);
    }
  }
  return [...set];
}

/** Title fragment with typographic double quotes (UI-safe). */
function doubleQuotedLabel(inner: string): string {
  const safe = inner.replace(/"/g, "\u201d").trim();
  return `\u201c${safe}\u201d`;
}

/**
 * Resolves title + OBJE ids for a **MediaSetView** (virtual qualifier).
 * Copy uses **Media for / Media from / Media tagged** — not “photos” or “album”.
 */
export async function collectMediaIdsForGenerated(
  prisma: PrismaClient,
  fileUuid: string,
  source: Exclude<AlbumViewSource, { type: "album" }>,
): Promise<GeneratedAlbumCollectResult> {
  switch (source.type) {
    case "individual": {
      const ind = await prisma.gedcomIndividual.findFirst({
        where: { id: source.individualId, fileUuid },
        select: { fullName: true },
      });
      const name = stripSlashesFromName(ind?.fullName) || "Unknown";
      const [links, profile] = await Promise.all([
        prisma.gedcomIndividualMedia.findMany({
          where: { individualId: source.individualId, fileUuid },
          select: { mediaId: true },
        }),
        prisma.gedcomIndividualProfileMedia.findUnique({
          where: { individualId: source.individualId },
          select: { mediaId: true },
        }),
      ]);
      const preferredCoverMediaId = profile?.mediaId ?? null;
      const mediaIds = mergeMediaIds(
        preferredCoverMediaId ? [preferredCoverMediaId] : [],
        links.map((l) => l.mediaId),
      );
      return { title: `Media for ${name}`, mediaIds, preferredCoverMediaId };
    }
    case "family": {
      const fam = await prisma.gedcomFamily.findFirst({
        where: { id: source.familyId, fileUuid },
        select: {
          xref: true,
          husband: { select: { fullName: true } },
          wife: { select: { fullName: true } },
        },
      });
      const title = buildFamilyMediaTitle({
        husbandFullName: fam?.husband?.fullName,
        wifeFullName: fam?.wife?.fullName,
        familyXref: fam?.xref ?? null,
      });
      const [links, profile] = await Promise.all([
        prisma.gedcomFamilyMedia.findMany({
          where: { familyId: source.familyId, fileUuid },
          select: { mediaId: true },
        }),
        prisma.gedcomFamilyProfileMedia.findUnique({
          where: { familyId: source.familyId },
          select: { mediaId: true },
        }),
      ]);
      const preferredCoverMediaId = profile?.mediaId ?? null;
      const mediaIds = mergeMediaIds(
        preferredCoverMediaId ? [preferredCoverMediaId] : [],
        links.map((l) => l.mediaId),
      );
      return { title, mediaIds, preferredCoverMediaId };
    }
    case "event": {
      const ev = await prisma.gedcomEvent.findFirst({
        where: { id: source.eventId, fileUuid },
        select: {
          eventType: true,
          customType: true,
          familyEvents: {
            take: 1,
            select: {
              family: {
                select: {
                  husband: { select: { fullName: true, xref: true } },
                  wife: { select: { fullName: true, xref: true } },
                },
              },
            },
          },
          individualEvents: {
            take: 1,
            select: {
              individual: { select: { fullName: true, xref: true } },
            },
          },
        },
      });
      const fam = ev?.familyEvents?.[0]?.family;
      const familyPair = fam
        ? familyPairLabel({
            husbandFullName: fam.husband?.fullName,
            wifeFullName: fam.wife?.fullName,
            husbandXref: fam.husband?.xref ?? null,
            wifeXref: fam.wife?.xref ?? null,
          })
        : null;
      const ind = ev?.individualEvents?.[0]?.individual;
      const individualName = ind
        ? individualLabel(ind.fullName, ind.xref ?? null)
        : null;
      const title = buildEventMediaTitle({
        eventType: ev?.eventType ?? "EVEN",
        customType: ev?.customType ?? null,
        familyPair,
        individualName,
      });
      const [links, profile] = await Promise.all([
        prisma.gedcomEventMedia.findMany({
          where: { eventId: source.eventId, fileUuid },
          select: { mediaId: true },
        }),
        prisma.gedcomEventProfileMedia.findUnique({
          where: { eventId: source.eventId },
          select: { mediaId: true },
        }),
      ]);
      const preferredCoverMediaId = profile?.mediaId ?? null;
      const mediaIds = mergeMediaIds(
        preferredCoverMediaId ? [preferredCoverMediaId] : [],
        links.map((l) => l.mediaId),
      );
      return { title, mediaIds, preferredCoverMediaId };
    }
    case "place": {
      const pl = await prisma.gedcomPlace.findFirst({
        where: { id: source.placeId, fileUuid },
        select: { name: true, original: true },
      });
      const placeLabel = (pl?.name ?? pl?.original ?? "this place").trim() || "this place";

      const eventsHere = await prisma.gedcomEvent.findMany({
        where: { fileUuid, placeId: source.placeId },
        select: { id: true },
      });
      const eventIds = eventsHere.map((e) => e.id);
      const fromEvents =
        eventIds.length > 0
          ? await prisma.gedcomEventMedia.findMany({
              where: { fileUuid, eventId: { in: eventIds } },
              select: { mediaId: true },
            })
          : [];
      const fromDirect = await prisma.gedcomMediaPlace.findMany({
        where: { placeId: source.placeId, fileUuid },
        select: { mediaId: true },
      });
      const mediaIds = mergeMediaIds(
        fromEvents.map((r) => r.mediaId),
        fromDirect.map((r) => r.mediaId),
      );
      return { title: `Media from ${placeLabel}`, mediaIds, preferredCoverMediaId: null };
    }
    case "date": {
      const d = await prisma.gedcomDate.findFirst({
        where: { id: source.dateId, fileUuid },
        select: {
          original: true,
          year: true,
          month: true,
          day: true,
          endYear: true,
          endMonth: true,
          endDay: true,
        },
      });

      const eventsOnDate = await prisma.gedcomEvent.findMany({
        where: { fileUuid, dateId: source.dateId },
        select: { id: true },
      });
      const eventIds = eventsOnDate.map((e) => e.id);
      const fromEvents =
        eventIds.length > 0
          ? await prisma.gedcomEventMedia.findMany({
              where: { fileUuid, eventId: { in: eventIds } },
              select: { mediaId: true },
            })
          : [];
      const fromDirect = await prisma.gedcomMediaDate.findMany({
        where: { dateId: source.dateId, fileUuid },
        select: { mediaId: true },
      });
      const mediaIds = mergeMediaIds(
        fromEvents.map((r) => r.mediaId),
        fromDirect.map((r) => r.mediaId),
      );

      const title = buildDateMediaTitle({
        original: d?.original,
        year: d?.year,
        month: d?.month,
        day: d?.day,
        endYear: d?.endYear,
        endMonth: d?.endMonth,
        endDay: d?.endDay,
      });
      return { title, mediaIds, preferredCoverMediaId: null };
    }
    case "tag": {
      const tag = await prisma.tag.findFirst({ where: { id: source.tagId }, select: { name: true } });
      const label = tag?.name?.trim() || "tag";
      const [links, profile] = await Promise.all([
        prisma.gedcomMediaAppTag.findMany({
          where: { tagId: source.tagId, gedcomMedia: { fileUuid } },
          select: { gedcomMediaId: true },
        }),
        prisma.tagProfileMedia.findUnique({
          where: { tagId_fileUuid: { tagId: source.tagId, fileUuid } },
          select: { mediaId: true },
        }),
      ]);
      const preferredCoverMediaId = profile?.mediaId ?? null;
      const mediaIds = mergeMediaIds(
        preferredCoverMediaId ? [preferredCoverMediaId] : [],
        links.map((l) => l.gedcomMediaId),
      );
      return {
        title: `Media tagged ${doubleQuotedLabel(label)}`,
        mediaIds,
        preferredCoverMediaId,
      };
    }
    case "note": {
      const note = await prisma.gedcomNote.findFirst({
        where: { id: source.noteId, fileUuid },
        select: { content: true, xref: true },
      });
      const line = (note?.content ?? "").split(/\r?\n/)[0]?.replace(/\s+/g, " ").trim() ?? "";
      const preview = line.slice(0, 56);
      const core = preview
        ? `${preview}${line.length > 56 ? "…" : ""}`
        : note?.xref?.trim() || "this story";
      const title = `Media from ${doubleQuotedLabel(core)}`;

      const [indN, famN, evN, srcN] = await Promise.all([
        prisma.gedcomIndividualNote.findMany({
          where: { noteId: source.noteId, fileUuid },
          select: { individualId: true },
        }),
        prisma.gedcomFamilyNote.findMany({
          where: { noteId: source.noteId, fileUuid },
          select: { familyId: true },
        }),
        prisma.gedcomEventNote.findMany({
          where: { noteId: source.noteId, fileUuid },
          select: { eventId: true },
        }),
        prisma.gedcomSourceNote.findMany({
          where: { noteId: source.noteId, fileUuid },
          select: { sourceId: true },
        }),
      ]);
      const mediaIdSets = await Promise.all([
        ...indN.map((r) =>
          prisma.gedcomIndividualMedia.findMany({
            where: { individualId: r.individualId, fileUuid },
            select: { mediaId: true },
          }),
        ),
        ...famN.map((r) =>
          prisma.gedcomFamilyMedia.findMany({
            where: { familyId: r.familyId, fileUuid },
            select: { mediaId: true },
          }),
        ),
        ...evN.map((r) =>
          prisma.gedcomEventMedia.findMany({
            where: { eventId: r.eventId, fileUuid },
            select: { mediaId: true },
          }),
        ),
        ...srcN.map((r) =>
          prisma.gedcomSourceMedia.findMany({
            where: { sourceId: r.sourceId, fileUuid },
            select: { mediaId: true },
          }),
        ),
      ]);
      const idSet = new Set<string>();
      for (const rows of mediaIdSets) {
        for (const row of rows) idSet.add(row.mediaId);
      }
      return { title, mediaIds: [...idSet], preferredCoverMediaId: null };
    }
    default: {
      return { title: "Media", mediaIds: [], preferredCoverMediaId: null };
    }
  }
}
