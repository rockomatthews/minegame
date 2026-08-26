import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const PINATA_UPLOAD_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const ORIGINAL_IMAGE_ROOT = "bafybeibuzymwyegy24yerjxbaz7j2sh7jr6yklg7vbn2r2lz6q323oytjm";
const imageDirectory = path.resolve("public/assets/miners");
const metadataDirectory = path.resolve("metadata/miners");
const dryRun = process.argv.includes("--dry-run");

async function filesIn(directory, extension) {
  const names = (await readdir(directory)).filter((name) => name.endsWith(extension)).sort();
  return Promise.all(names.map(async (name) => ({ name, bytes: await readFile(path.join(directory, name)) })));
}

async function uploadFolder(files, pinName, jwt) {
  const form = new FormData();
  for (const file of files) {
    form.append("file", new File([file.bytes], file.name), file.name);
  }
  form.append("pinataMetadata", JSON.stringify({ name: pinName }));
  form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

  const response = await fetch(PINATA_UPLOAD_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Pinata ${pinName} upload failed (${response.status}): ${body}`);

  const parsed = JSON.parse(body);
  if (typeof parsed.IpfsHash !== "string" || !parsed.IpfsHash.startsWith("bafy")) {
    throw new Error(`Pinata returned an invalid CID for ${pinName}.`);
  }
  return parsed;
}

async function verifyGateway(cid, filename) {
  const url = `https://gateway.pinata.cloud/ipfs/${cid}/${filename}`;
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const response = await fetch(url, { redirect: "follow" });
    if (response.ok) return { url, status: response.status };
    if (attempt < 10) await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
  throw new Error(`Pinned content was not retrievable: ${url}`);
}

const images = await filesIn(imageDirectory, ".png");
const sourceMetadata = await filesIn(metadataDirectory, ".json");
if (images.length !== 10 || sourceMetadata.length !== 10) {
  throw new Error(`Expected 10 images and 10 metadata files; received ${images.length} and ${sourceMetadata.length}.`);
}

for (const file of sourceMetadata) {
  const parsed = JSON.parse(file.bytes.toString("utf8"));
  if (!String(parsed.image).startsWith(`ipfs://${ORIGINAL_IMAGE_ROOT}/`)) {
    throw new Error(`${file.name} does not reference the reviewed image root.`);
  }
}

if (dryRun) {
  console.log(JSON.stringify({ ready: true, images: images.length, metadata: sourceMetadata.length }, null, 2));
  process.exit(0);
}

const jwt = process.env.PINATA_JWT;
if (!jwt) throw new Error("Set PINATA_JWT in the current shell. Do not commit it or paste it into chat.");

const imageUpload = await uploadFolder(images, "MineGame miner images", jwt);
const metadata = sourceMetadata.map((file) => ({
  name: file.name,
  bytes: Buffer.from(file.bytes.toString("utf8").replaceAll(ORIGINAL_IMAGE_ROOT, imageUpload.IpfsHash)),
}));
const metadataUpload = await uploadFolder(metadata, "MineGame miner metadata", jwt);

const [firstImage, lastImage, firstMetadata, lastMetadata] = await Promise.all([
  verifyGateway(imageUpload.IpfsHash, images[0].name),
  verifyGateway(imageUpload.IpfsHash, images.at(-1).name),
  verifyGateway(metadataUpload.IpfsHash, metadata[0].name),
  verifyGateway(metadataUpload.IpfsHash, metadata.at(-1).name),
]);

console.log(JSON.stringify({
  pass: true,
  imageRootCid: imageUpload.IpfsHash,
  metadataRootCid: metadataUpload.IpfsHash,
  imagePinSize: imageUpload.PinSize,
  metadataPinSize: metadataUpload.PinSize,
  gatewayChecks: [firstImage, lastImage, firstMetadata, lastMetadata],
}, null, 2));
