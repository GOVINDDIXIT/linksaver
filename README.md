# LinkSaver 🔖

Save, tag, favorite, and search links. Zero-dependency Node.js app with a file-based JSON store — built to be run, read, and extended with an AI coding assistant.

## Why this project

A personal tool I actively use and iterate on: I save dev/design/AI links daily and needed fast search + tags + read-later triage without signing up for another SaaS. Every feature here came from real usage (duplicate guard after saving the same tutorial twice, archive view after the list grew past 100).

## Stack

- Backend: Node 20+ built-in `http` (no framework, no deps at all)
- Store: local JSON file (`data/links.json`, git-ignored — your data stays yours)
- Frontend: vanilla HTML/CSS/JS, no build step, dark UI, responsive cards
- Tests: `node:test` + `assert` (12 tests, no deps)

## Run it

```sh
npm start          # http://localhost:3000
npm run dev        # with --watch
npm run seed       # load 12 demo links into data/links.json
npm test           # runs all tests
PORT=4000 npm start
```

## Features

- Save links with title, URL, tags, notes
- Duplicate-URL guard (409 with the existing entry)
- Full-text search + tag filtering + All / ★ Favorites / Archived views
- Sort (newest, oldest, title A–Z) and pagination (`limit`, `offset`)
- ★ favorites, archive/unarchive, delete with confirm
- Library stats (totals + top domains), tag counts
- JSON export + bulk import (dedupes, reports added/duplicates/skips)
- Input validation + normalization shared between client and server code paths

## Project structure

```
src/
  server.js      # HTTP server + REST API (no framework)
  store.js       # file-backed CRUD, search/filter/sort, stats
  validate.js    # shared validation + tag/boolean normalization
public/
  index.html     # layout: form sidebar + filterable card feed
  app.js         # fetch wiring, views, fav/archive actions
  styles.css     # dark theme, card grid, responsive
scripts/
  seed.js        # `npm run seed` — 12 realistic demo links
test/
  store.test.js  # store: CRUD, dupes, filters, sort, stats
  validate.test.js
  api.test.js    # HTTP round-trips: 201/400/404/409, filters, stats
```

## API

| Method | Route | Notes |
|---|---|---|
| `GET` | `/api/links?q=&tag=&sort=&limit=&offset=&favorites=1&archived=hide\|only\|all` | archived hidden by default |
| `POST` | `/api/links` | `{ title, url, tags, notes }` → `201`, duplicate → `409 { link }` |
| `GET` | `/api/links/:id` | `404` when missing |
| `PATCH` | `/api/links/:id` | partial: any of `title, url, tags, notes, favorite, archived` |
| `DELETE` | `/api/links/:id` | `404` when missing |
| `GET` | `/api/tags` | `[{ tag, count }]`, excludes archived |
| `GET` | `/api/stats` | `{ total, favorites, archived, topDomains }` |
| `GET` | `/api/export` | full library JSON |
| `POST` | `/api/import` | array (or `{ links }`) → `{ added, duplicates, skipped }` |

## Roadmap

- [ ] Bookmarklet / share-target import
- [ ] Read-later reminders (stale `read-later` digests)
- [ ] SQLite backend when `links.json` outgrows ~5k entries
- [ ] Single-user token auth when hosted multi-user

## License

MIT
