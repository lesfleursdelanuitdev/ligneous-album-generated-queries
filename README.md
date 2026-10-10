# @ligneous/album-generated-queries

Prisma queries that work out which photos and documents belong to a generated album in a genealogy tree, and what that album should be called.

**Architecture:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

A generated album is not stored anywhere. It is defined by a record in the tree: "Media for Maria Silva", "Media from the marriage of João Silva and Ana Costa", "Media from Lisbon", "Media tagged “Weddings”". This package takes that definition, follows the GEDCOM links in Postgres, and returns the media ids, a readable title and the preferred cover image. The admin app and the public site both call it, so an album has the same contents and title in both places.

## What it does

`collectMediaIdsForGenerated(prisma, fileUuid, source)` handles seven kinds of source. `fileUuid` scopes every query to one tree.

| Source | Media it collects | Title |
| --- | --- | --- |
| `individual` | Media linked to the person, plus their profile image | `Media for Maria Silva` |
| `family` | Media linked to the family, plus its profile image | `Media for the Silva family`, or both spouses' names |
| `event` | Media linked to the event, plus its profile image | `Media from the marriage of X and Y`, `Media from the baptism of Z` |
| `place` | Media linked to the place, and media of every event held there | `Media from <place>` |
| `date` | Media linked to the date, and media of every event on that date | Built from the GEDCOM date |
| `tag` | Media carrying an app tag, plus the tag's profile image for this tree | `Media tagged “<tag>”` |
| `note` | Media of every person, family, event and source the note is attached to | `Media from “<first line of note>”` |

Curated albums (`{ type: "album" }`) are excluded by the type, because their members are stored in a table.

The result:

```ts
type GeneratedAlbumCollectResult = {
  title: string;
  mediaIds: string[];                   // de-duplicated, profile image first
  preferredCoverMediaId: string | null; // explicit profile/cover image, if set
};
```

`countGeneratedMediaForSource(prisma, fileUuid, source)` applies the same rules and returns only the number of media rows, for badges and lists.

The title helpers (`buildEventMediaTitle`, `familyPairLabel`, `individualLabel`) are exported too. They turn GEDCOM event tags (`MARR`, `BAPM`, `IMMI`, ...) and names like `Maria /Silva/` into readable titles.

## Where it fits in Ligneous

Ligneous is a genealogy platform. A Go library parses GEDCOM files; the data lives in Postgres and is read through Prisma by Next.js apps.

Used by:

- `the-gonsalves-family` (private): public album pages and the media tabs on person and family pages (`lib/album/resolve-public-album-view-model.ts`, `src/app/api/tree/individuals/[xref]/detail/media/route.ts`, `src/app/api/tree/families/[id]/media/route.ts`).
- `the-gonsalves-family-admin` (private): album views and media counts (`lib/album/resolve-album-view-model.ts`, `src/app/api/admin/media-set-count/route.ts`).

### Data it consumes

Postgres through the Prisma client from `@ligneous/prisma`. The models it reads are `gedcomIndividual`, `gedcomFamily`, `gedcomEvent`, `gedcomPlace`, `gedcomDate`, `gedcomNote`, `gedcomMedia` and their junction models (`gedcomIndividualMedia`, `gedcomEventMedia`, `gedcomMediaPlace`, `gedcomSourceMedia`, the `*ProfileMedia` tables, and others), plus the app's `tag` and `gedcomMediaAppTag`.

It does not read the Go parser's intermediate representation in memory. The `gedcom_*_v2` tables behind these models are the database form of the parser's `EnrichedDocument`; `docs/INTERMEDIATE_FORMAT.md` in [ligneous-gedcom-lib](https://github.com/lesfleursdelanuitdev/ligneous-gedcom-lib) maps each IR field to its table. Profile images and app tags are app-side tables with no GEDCOM equivalent.

The `source` argument uses the `MediaQualifier` type (exported as `AlbumViewSource`) from [@ligneous/album-view](https://github.com/lesfleursdelanuitdev/ligneous-album-view).

## Install

The package is not published to npm (`"private": true`). It ships TypeScript source (`exports` points at `src/index.ts`).

It depends on two sibling packages by path:

```json
{
  "dependencies": {
    "@ligneous/album-view": "file:../ligneous-album-view",
    "@ligneous/prisma": "file:../ligneous-prisma"
  }
}
```

`@ligneous/prisma` (the shared Prisma schema and client) is in a private repository. Without it, this package will not type-check or run. Clone it next to [ligneous-album-view](https://github.com/lesfleursdelanuitdev/ligneous-album-view) and the Prisma package, or point the dependencies at your own builds.

## Usage

```ts
import type { PrismaClient } from "@ligneous/prisma";
import {
  collectMediaIdsForGenerated,
  countGeneratedMediaForSource,
} from "@ligneous/album-generated-queries";
import { resolveAlbumCoverMedia } from "@ligneous/album-view";

declare const prisma: PrismaClient; // your app's Prisma client instance

const { title, mediaIds, preferredCoverMediaId } = await collectMediaIdsForGenerated(
  prisma,
  treeFileUuid,
  { type: "place", placeId },
);

const count = await countGeneratedMediaForSource(prisma, treeFileUuid, {
  type: "individual",
  individualId,
});

// Load summaries for `mediaIds`, then pick a cover:
// resolveAlbumCoverMedia(preferredCoverMediaId, summaries, `place:${placeId}`)
```

## API summary

| Export | Purpose |
| --- | --- |
| `collectMediaIdsForGenerated(prisma, fileUuid, source)` | Title, media ids and preferred cover for a generated album |
| `countGeneratedMediaForSource(prisma, fileUuid, source)` | Media count for the same rules |
| `GeneratedAlbumCollectResult` | Return type of the collector |
| `buildEventMediaTitle(args)` | Title for an event album |
| `familyPairLabel(args)`, `individualLabel(name, xref)` | Readable labels for couples and people |

## Build and test

`package.json` has no scripts and the repo has no tests or `tsconfig.json` yet. Next step: add a tsconfig and tests, for example against a seeded test database.

## Known limits

The `note` source runs one query per linked person, family, event and source. That is fine for typical notes but may be slow for a note attached to hundreds of records.

## Stack

TypeScript, Prisma (PostgreSQL).

## Related repos

- [Ligneous](https://github.com/lesfleursdelanuitdev/Ligneous): project overview
- [ligneous-album-view](https://github.com/lesfleursdelanuitdev/ligneous-album-view): album view model and cover selection
- [ligneous-gedcom-lib](https://github.com/lesfleursdelanuitdev/ligneous-gedcom-lib): Go GEDCOM parser and the IR-to-table mapping

## License

No license file: all rights reserved.

Part of Ligneous: https://github.com/lesfleursdelanuitdev/Ligneous
