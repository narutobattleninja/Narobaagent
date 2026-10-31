#!/usr/bin/env node
/**
 * Upload generated Naroba images and metadata to Pinata.
 * Required: PINATA_JWT
 * Optional: COLLECTION_DIR=collection
 *
 * The script pins the two folders separately and prints the final base URI.
 */
import fs from "node:fs/promises";
import path from "node:path";

const jwt = process.env.PINATA_JWT;
const collectionDir = process.env.COLLECTION_DIR || "collection";
const externalUrl = process.env.EXTERNAL_URL || "https://narobaagent.example/collection";
if (!jwt) {
  console.error("Missing PINATA_JWT. Create a Pinata JWT and run again without committing it.");
  process.exit(1);
}

async function collectFiles(dir, prefix = "") {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(absolute, relative));
    else files.push({ absolute, relative });
  }
  return files;
}

async function pinFolder(folder, name) {
  const files = await collectFiles(folder);
  const form = new FormData();
  form.append("pinataOptions", JSON.stringify({ cidVersion: 1, wrapWithDirectory: true }));
  form.append("pinataMetadata", JSON.stringify({ name }));
  for (const file of files) {
    const buffer = await fs.readFile(file.absolute);
    form.append("file", new Blob([buffer]), file.relative);
  }
  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  });
  if (!response.ok) throw new Error(`${name} upload failed: ${response.status} ${await response.text()}`);
  return response.json();
}

const images = await pinFolder(path.join(collectionDir, "images"), "naroba-images");
const metadataDir = path.join(collectionDir, "metadata");
const metadataFiles = await collectFiles(metadataDir);
for (const file of metadataFiles) {
  if (!file.relative.endsWith(".json")) continue;
  const metadata = JSON.parse(await fs.readFile(file.absolute, "utf8"));
  metadata.image = `ipfs://${images.IpfsHash}/${file.relative.replace(/\.json$/, ".png")}`;
  metadata.external_url = externalUrl;
  await fs.writeFile(file.absolute, `${JSON.stringify(metadata, null, 2)}\n`);
}
const metadata = await pinFolder(path.join(collectionDir, "metadata"), "naroba-metadata");
const result = {
  network: "BNB Chain",
  images_cid: images.IpfsHash,
  metadata_cid: metadata.IpfsHash,
  base_uri: `ipfs://${metadata.IpfsHash}/`,
  token_uri_pattern: `ipfs://${metadata.IpfsHash}/{{tokenId}}.json`,
  image_uri_pattern: `ipfs://${images.IpfsHash}/{{tokenId}}.png`,
  note: "Use the metadata CID as the contract base URI only if token files are pinned at the metadata root.",
};
await fs.writeFile(path.join(collectionDir, "ipfs-manifest.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
