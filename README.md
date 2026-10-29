# LinkSaver 🔖

Save, tag, and search links. Zero-dependency Node.js app with a file-based JSON store — built to be run, read, and extended with an AI coding assistant.

## Why this project

A personal tool I actively use and iterate on: I save dev/design/AI links daily and needed fast search + tags without signing up for another SaaS.

## Stack

- Backend: Node 20+ built-in `http` (no framework)
- Store: local JSON file (`data/links.json`)
- Frontend: vanilla HTML/CSS/JS, no build step
- Tests: `node:test` + `assert` (no deps)

## Run it

```sh
npm start          # http://localhost:3000
npm run dev        # with --watch
npm test           # runs all tests
PORT=4000 npm start
```

## Features

- Save links with title, URL, tags, notes
- Full-text search + tag filtering
- Tag counts, JSON export, bulk import
- Validation (`src/validate.js`), file store (`src/store.js`), REST API (`src/server.js`)

## API

```
GET    /api/links?q=&tag=
POST   /api/links            { title, url, tags, notes }
GET    /api/links/:id
PATCH  /api/links/:id        (partial)
DELETE /api/links/:id
GET    /api/tags             [{ tag, count }]
GET    /api/export
POST   /api/import           [ {...}, ... ]
```

## Roadmap

- [ ] Bookmarklet / share-target import
- [ ] Per-link read-later flag + archive view
- [ ] SQLite backend when `links.json` outgrows ~5k entries

## License

MIT
