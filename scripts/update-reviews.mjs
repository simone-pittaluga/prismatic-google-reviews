import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";

const client = process.argv[2];

if (!client) {
  console.error("Usage: node scripts/update-reviews.mjs <client>");
  process.exit(1);
}

const configPath = path.resolve(`clients/${client}.json`);

const config = JSON.parse(
  await fs.readFile(configPath, "utf8")
);

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  throw new Error("GOOGLE_API_KEY non trovata nel file .env");
}

const url = `https://places.googleapis.com/v1/places/${config.placeId}`;

const response = await fetch(url, {
  headers: {
    "X-Goog-Api-Key": apiKey,
    "X-Goog-FieldMask":
      "displayName,rating,userRatingCount,reviews"
  }
});

if (!response.ok) {
  console.error(await response.text());
  process.exit(1);
}

const data = await response.json();

const reviews = (data.reviews || [])
  .slice(0, config.maxReviews)
  .map((review) => ({
    author: review.authorAttribution?.displayName ?? "",
    profilePhoto: review.authorAttribution?.photoUri ?? "",
    profileUrl: review.authorAttribution?.uri ?? "",
    rating: review.rating,
    publishedAt: review.publishTime,
    relativeTime: review.relativePublishTimeDescription,
    text:
      review.originalText?.text ??
      review.text?.text ??
      "",
    language:
      review.originalText?.languageCode ??
      review.text?.languageCode ??
      ""
  }));

const output = {
  updatedAt: new Date().toISOString(),
  place: data.displayName?.text ?? config.name,
  rating: data.rating,
  userRatingCount: data.userRatingCount,
  reviews
};

const outputPath = path.join(
  config.localRepository,
  config.output
);

await fs.writeFile(
  outputPath,
  JSON.stringify(output, null, 2),
  "utf8"
);

console.log("✅ reviews.json aggiornato");
console.log(outputPath);