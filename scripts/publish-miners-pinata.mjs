import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import https from "node:https";
import path from "node:path";

const PINATA_UPLOAD_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const ORIGINAL_IMAGE_ROOT = "bafybeiafhkzyazlibvcp2s26j7f6dnxeu23yrlhfn5zvvb55dc53en5rwe";
const imageDirectory = path.resolve("public/assets/miners");
const metadataDirectory = path.resolve("metadata/miners");
const dryRun = process.argv.includes("--dry-run");

async function filesIn(directory, extension) {
  const names = (await readdir(directory)).filter((name) => name.endsWith(extension)).sort();
  return Promise.all(names.map(async (name) => ({ name, bytes: await readFile(path.join(directory, name)) })));
}

function buildFolderBody(files, folderName, pinName) {
  const boundary = `minegame-${randomUUID()}`;
  const chunks = [];
  const addText = (name, value) => {
    chunks.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
    ));
  };

  for (const file of files) {
    const filename = `${folderName}/${file.name}`;
    chunks.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`,
    ));
    chunks.push(file.bytes, Buffer.from("\r\n"));
  }
  addText("pinataMetadata", JSON.stringify({ name: pinName }));
  addText("pinataOptions", JSON.stringify({ cidVersion: 1 }));
  chunks.push(Buffer.from(`--${boundary}--\r\n`));

  return {
    body: Buffer.concat(chunks),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

async function uploadFolder(files, folderName, pinName, jwt) {
  const { body: requestBody, contentType } = buildFolderBody(files, folderName, pinName);
  const { status, body } = await new Promise((resolve, reject) => {
    const request = https.request(PINATA_UPLOAD_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": contentType,
        "Content-Length": requestBody.length,
      },
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({
        status: response.statusCode ?? 0,
        body: Buffer.concat(chunks).toString("utf8"),
      }));
    });
    request.setTimeout(120_000, () => request.destroy(new Error(`Pinata ${pinName} upload timed out.`)));
    request.on("error", reject);
    request.end(requestBody);
  });
  if (status < 200 || status >= 300) throw new Error(`Pinata ${pinName} upload failed (${status}): ${body}`);

  const parsed = JSON.parse(body);
  if (typeof parsed.IpfsHash !== "string" || !parsed.IpfsHash.startsWith("bafy")) {
    throw new Error(`Pinata returned an invalid CID for ${pinName}.`);
  }
  return parsed;
}

async function findGatewayPath(cid, filename, folderName) {
  const candidates = [filename, `${folderName}/${filename}`];
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    for (const candidate of candidates) {
      const url = `https://gateway.pinata.cloud/ipfs/${cid}/${candidate}`;
      const response = await fetch(url, { redirect: "follow" });
      if (response.ok) {
        return {
          pathPrefix: candidate.slice(0, -filename.length),
          url,
          status: response.status,
        };
      }
    }
    if (attempt < 10) await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
  throw new Error(`Pinned content was not retrievable for ${cid}/${filename}.`);
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
  const multipart = buildFolderBody(images, "miners", "MineGame miner images").body.toString("latin1");
  const filepathParts = multipart.match(/filename="miners\/[^"]+"/g) ?? [];
  console.log(JSON.stringify({
    ready: filepathParts.length === images.length,
    images: images.length,
    metadata: sourceMetadata.length,
    multipartFilepathParts: filepathParts.length,
  }, null, 2));
  if (filepathParts.length !== images.length) process.exit(1);
  process.exit(0);
}

const jwt = process.env.PINATA_JWT;
if (!jwt) throw new Error("Set PINATA_JWT in the current shell. Do not commit it or paste it into chat.");

const imageUpload = await uploadFolder(images, "miners", "MineGame miner images", jwt);
const imagePath = await findGatewayPath(imageUpload.IpfsHash, images[0].name, "miners");
const metadata = sourceMetadata.map((file) => ({
  name: file.name,
  bytes: Buffer.from(file.bytes.toString("utf8").replaceAll(
    `ipfs://${ORIGINAL_IMAGE_ROOT}/`,
    `ipfs://${imageUpload.IpfsHash}/${imagePath.pathPrefix}`,
  )),
}));
const metadataUpload = await uploadFolder(metadata, "metadata", "MineGame miner metadata", jwt);
const metadataPath = await findGatewayPath(metadataUpload.IpfsHash, metadata[0].name, "metadata");

const [lastImage, lastMetadata] = await Promise.all([
  findGatewayPath(imageUpload.IpfsHash, images.at(-1).name, "miners"),
  findGatewayPath(metadataUpload.IpfsHash, metadata.at(-1).name, "metadata"),
]);

console.log(JSON.stringify({
  pass: true,
  imageRootCid: imageUpload.IpfsHash,
  imagePathPrefix: imagePath.pathPrefix,
  metadataRootCid: metadataUpload.IpfsHash,
  metadataPathPrefix: metadataPath.pathPrefix,
  imagePinSize: imageUpload.PinSize,
  metadataPinSize: metadataUpload.PinSize,
  gatewayChecks: [imagePath, lastImage, metadataPath, lastMetadata],
}, null, 2));
