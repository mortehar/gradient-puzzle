import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPublishedCatalogManifest, buildStructuralCatalogManifest } from "../src/game";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const structuralOutputPath = resolve(scriptDirectory, "../src/game/generated/structuralCatalog.generated.ts");
const publishedOutputPath = resolve(scriptDirectory, "../src/game/generated/publishedCatalog.generated.ts");

const structuralManifest = buildStructuralCatalogManifest();
const publishedCatalog = buildPublishedCatalogManifest("v1", structuralManifest.catalog);

writeFileSync(
  structuralOutputPath,
  [
    `export const GENERATED_STRUCTURAL_CATALOG = ${JSON.stringify(structuralManifest.catalog, null, 2)} as const;`,
    `export const GENERATED_STRUCTURAL_DIFFICULTY_BOUNDS = ${JSON.stringify(structuralManifest.bounds, null, 2)} as const;`,
    ""
  ].join("\n"),
  "utf8"
);

writeFileSync(
  publishedOutputPath,
  `export const GENERATED_PUBLISHED_CATALOG = ${JSON.stringify(publishedCatalog, null, 2)} as const;\n`,
  "utf8"
);

console.log(`Wrote ${structuralManifest.catalog.length} structural entries to ${structuralOutputPath}`);
console.log(`Wrote ${publishedCatalog.puzzles.length} published puzzles to ${publishedOutputPath}`);
