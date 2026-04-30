import type { PrismaClient } from "@ligneous/prisma";
import type { AlbumViewSource } from "@ligneous/album-view";
import { collectMediaIdsForGenerated } from "./collect-media-ids-for-generated";

/**
 * Count of `gedcom_media_v2` rows in this tree for a generated media-set qualifier
 * (same membership rules as {@link collectMediaIdsForGenerated}, without loading summaries).
 */
export async function countGeneratedMediaForSource(
  prisma: PrismaClient,
  fileUuid: string,
  source: Exclude<AlbumViewSource, { type: "album" }>,
): Promise<number> {
  const { mediaIds } = await collectMediaIdsForGenerated(prisma, fileUuid, source);
  const uniqueIds = [...new Set(mediaIds)];
  if (uniqueIds.length === 0) return 0;
  return prisma.gedcomMedia.count({
    where: { fileUuid, id: { in: uniqueIds } },
  });
}
