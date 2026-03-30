import { extractMetaArticleBody } from "./lib/meta-body-extractor.mjs";

const url = process.argv[2];

if (!url) {
  console.error("Usage: node scripts/test-meta-extractor.mjs <meta-article-url>");
  process.exit(1);
}

const result = await extractMetaArticleBody(url);

console.log("\n=== META EXTRACTOR RESULT ===\n");
console.log(JSON.stringify(
  {
    source: result.source,
    status: result.status,
    title: result.title,
    description: result.description,
    bodyLength: result.body.length,
    notes: result.notes,
    preview: result.body.slice(0, 1200),
  },
  null,
  2
));
