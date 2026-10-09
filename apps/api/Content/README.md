# Empire content

Every empire in the game is one file in `empires/`, named after its slug (`mongol-empire.json`). These files are the source of truth: on startup the API validates all of them and syncs the database.

- **Add an empire:** copy an existing file, rename it and fill it in. `empire.schema.json` gives autocomplete and inline errors in VS Code.
- **Edit an empire:** change the file and restart the API.
- **Remove an empire:** delete the file. The empire is deactivated (it leaves the guess list and the schedule) but stays in the database, since past challenges point to it.
- **Never rename a slug** after launch.

## Fields

| Field | Notes |
|---|---|
| `name` | Shown in the guess list and the answer. Must be unique in both languages. |
| `peak` | Year of greatest territorial extent, the moment the map shows. The era clue is computed from it. |
| `start`, `end` | Lifespan. `peak` must fall between them. |
| `durationNotes` | Optional caveat shown with the duration. |
| `area.km2` | Area at the peak. |
| `mapAccuracy` | `Precise`, `Approximate` or `Speculative` (shown as High, Medium, Low). |
| `continents`, `primaryContinent` | The primary one must be in the list. |
| `capital`, `language`, `religion` | Short texts. |
| `curiosities` | Exactly 3, least obvious first. |
| `map` | Optional until the map is ready. `parts`: the Cliopatria polities (exact `Name`) and year the shape is made of; more than one when the dataset lists part of the empire apart (e.g. the British Empire plus Australia). See "Maps" below. |

**Years:** negative for BCE, as historians write them (`-27` is 27 BCE). There is no year 0. `precision` is `Exact`, `Approximate` or `Century`.

**Texts:** every text needs `en` and `pt`. No em dashes or `--`; use a comma, colon, period or parentheses.

## Daily schedule

The API picks each day's empire on its own: every active empire appears once, in random order, before any repeats. To pin an empire to a date, insert that `DailyChallenges` row ahead of time and the scheduler leaves it alone.

## Maps

Each empire's map is a shape drawn over today's world: the borders come from [Cliopatria](https://github.com/Seshat-Global-History-Databank/cliopatria) (Bennett et al., Seshat Global History Databank, CC BY 4.0) and the land, continents and countries from [Natural Earth](https://www.naturalearthdata.com/) (public domain).

- `shapes/<slug>.json` holds the shape: a GeoJSON `MultiPolygon` with coordinates only (no name, so it can't give the answer away). The API validates it on startup and serves it only for days up to today.
- To build or rebuild shapes, download Cliopatria (`cliopatria.geojson.zip` from its repository) and, in `apps/web`, run `node scripts/maps/build-shapes.mjs <path to cliopatria geojson> [slug ...]`. It merges the `map.parts`, clips them by the game's land (so the coast matches the map exactly) and writes the file.
- Hand edits to a shape (e.g. in geojson.io) are fine, but rebuilding that slug overwrites them.
- `public/geo/world.json` and `world-light.json` (the world map) come from `node scripts/maps/build-world.mjs <ne_50m_admin_0_countries.geojson>`.
