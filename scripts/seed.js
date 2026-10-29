import { saveLinks } from "../src/store.js";

const now = Date.now();
const day = 86_400_000;
const seed = [
  { title: "Node.js docs — HTTP", url: "https://nodejs.org/api/http.html", tags: ["dev", "node"], notes: "Reference for the built-in server used here." },
  { title: "MDN: Fetch API", url: "https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API", tags: ["dev", "web"], notes: "How the frontend talks to /api." },
  { title: "SQLite when you outgrow JSON", url: "https://www.sqlite.org/whentouse.html", tags: ["dev", "db"], notes: "Read before migrating the store." },
  { title: "Law of Demeter, practically", url: "https://example.com/law-of-demeter", tags: ["dev", "design"], notes: "Example note to show search working." },
  { title: "Transformers, visually explained", url: "https://example.com/transformers-visual", tags: ["ai", "read-later"], notes: "Weekend reading.", favorite: true },
  { title: "A field guide to brutalist web design", url: "https://example.com/brutalist-guide", tags: ["design"], notes: "" },
  { title: "CSS grid cheatsheet", url: "https://example.com/css-grid", tags: ["dev", "css"], notes: "Used for the cards layout.", favorite: true },
  { title: "How DNS works (comic)", url: "https://example.com/how-dns-works", tags: ["dev", "networking"], notes: "", archived: true },
  { title: " Calm productivity system", url: "https://example.com/calm-productivity", tags: ["life"], notes: "Triage weekly." },
  { title: "Sourdough for beginners", url: "https://example.com/sourdough", tags: ["life", "cooking"], notes: "" },
  { title: "Prompt patterns for code review", url: "https://example.com/prompt-patterns", tags: ["ai", "dev"], notes: "Candidate workflow ideas." },
  { title: "Indie hacker pricing teardowns", url: "https://example.com/pricing-teardowns", tags: ["business", "read-later"], notes: "" },
];

const dataPath = process.argv[2] ?? new URL("../data/links.json", import.meta.url).pathname;
const links = seed.map((s, i) => ({
  ...s,
  title: s.title.trim(),
  id: `seed-${String(i + 1).padStart(2, "0")}`,
  createdAt: new Date(now - (seed.length - i) * day).toISOString(),
  updatedAt: new Date(now - (seed.length - i) * day).toISOString(),
}));
await saveLinks(dataPath, links);
console.log(`Seeded ${links.length} links → ${dataPath}`);
