import crypto from "crypto";
import path from "path";
import fs from "fs";

// Apple Wallet configuration from environment
const APPLE_WALLET_PASS_TYPE_ID = process.env.APPLE_WALLET_PASS_TYPE_ID || "";
const APPLE_WALLET_TEAM_ID = process.env.APPLE_WALLET_TEAM_ID || "";
const APPLE_WALLET_CERT = (process.env.APPLE_WALLET_CERT || "").replace(/\\n/g, "\n");
const APPLE_WALLET_KEY = (process.env.APPLE_WALLET_KEY || "").replace(/\\n/g, "\n");
const APPLE_WALLET_KEY_PASSPHRASE = process.env.APPLE_WALLET_KEY_PASSPHRASE || "";
const APPLE_WWDR_CERT = (process.env.APPLE_WWDR_CERT || "").replace(/\\n/g, "\n");

export function isAppleWalletConfigured(): boolean {
  return !!(APPLE_WALLET_PASS_TYPE_ID && APPLE_WALLET_TEAM_ID && APPLE_WALLET_CERT && APPLE_WALLET_KEY && APPLE_WWDR_CERT);
}

interface ApplePassData {
  serialNumber: string;
  name: string;
  jobTitle?: string;
  companyName?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  profileUrl: string;
  profileImage?: string;
}

/**
 * Creates an Apple Wallet .pkpass file as a Buffer.
 * 
 * A .pkpass is a ZIP archive containing:
 * - pass.json (the pass definition)
 * - manifest.json (SHA1 hashes of all files)
 * - signature (PKCS7 signature of manifest)
 * - icon.png, logo.png (optional images)
 */
export async function createAppleWalletPass(data: ApplePassData): Promise<Buffer> {
  if (!isAppleWalletConfigured()) {
    throw new Error("Apple Wallet is not configured");
  }

  // Build the pass.json
  const passJson: Record<string, any> = {
    formatVersion: 1,
    passTypeIdentifier: APPLE_WALLET_PASS_TYPE_ID,
    teamIdentifier: APPLE_WALLET_TEAM_ID,
    serialNumber: data.serialNumber,
    organizationName: data.companyName || "VisiCardly",
    description: `${data.name}'s Business Card`,
    backgroundColor: "rgb(26, 26, 46)",
    foregroundColor: "rgb(255, 255, 255)",
    labelColor: "rgb(180, 180, 200)",
    generic: {
      primaryFields: [
        {
          key: "name",
          label: data.jobTitle || "Name",
          value: data.name,
        },
      ],
      secondaryFields: [
        ...(data.companyName ? [{
          key: "company",
          label: "Company",
          value: data.companyName,
        }] : []),
        ...(data.phone ? [{
          key: "phone",
          label: "Phone",
          value: data.phone,
        }] : []),
      ],
      auxiliaryFields: [
        ...(data.email ? [{
          key: "email",
          label: "Email",
          value: data.email,
        }] : []),
      ],
      backFields: [
        {
          key: "profile",
          label: "Digital Profile",
          value: data.profileUrl,
          attributedValue: `<a href="${data.profileUrl}">${data.profileUrl}</a>`,
        },
        ...(data.website ? [{
          key: "website",
          label: "Website",
          value: data.website,
          attributedValue: `<a href="${data.website}">${data.website}</a>`,
        }] : []),
        ...(data.address ? [{
          key: "address",
          label: "Address",
          value: data.address,
        }] : []),
      ],
    },
    barcode: {
      format: "PKBarcodeFormatQR",
      message: data.profileUrl,
      messageEncoding: "iso-8859-1",
    },
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: data.profileUrl,
        messageEncoding: "iso-8859-1",
      },
    ],
  };

  const passJsonStr = JSON.stringify(passJson);

  // Build manifest with SHA1 hashes
  const files: Record<string, Buffer> = {
    "pass.json": Buffer.from(passJsonStr, "utf-8"),
  };

  const manifest: Record<string, string> = {};
  for (const [name, buf] of Object.entries(files)) {
    manifest[name] = crypto.createHash("sha1").update(buf).digest("hex");
  }
  const manifestStr = JSON.stringify(manifest);
  const manifestBuf = Buffer.from(manifestStr, "utf-8");

  // Sign the manifest with PKCS7
  const signature = signManifest(manifestBuf);

  // Build the ZIP (.pkpass) manually
  // Using a simple ZIP builder since we can't guarantee archiver is installed
  const zipParts: Array<{ name: string; data: Buffer }> = [
    { name: "pass.json", data: files["pass.json"] },
    { name: "manifest.json", data: manifestBuf },
    { name: "signature", data: signature },
  ];

  return buildSimpleZip(zipParts);
}

function signManifest(manifestData: Buffer): Buffer {
  const sign = crypto.createSign("SHA256");
  sign.update(manifestData);
  
  // Sign with the pass certificate private key
  const signature = sign.sign({
    key: APPLE_WALLET_KEY,
    passphrase: APPLE_WALLET_KEY_PASSPHRASE || undefined,
  });
  
  return signature;
}

/**
 * Build a minimal ZIP file from parts.
 */
function buildSimpleZip(parts: Array<{ name: string; data: Buffer }>): Buffer {
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let offset = 0;

  for (const part of parts) {
    const nameBuffer = Buffer.from(part.name, "utf-8");
    const dataBuffer = part.data;

    // Local file header
    const localHeader = Buffer.alloc(30 + nameBuffer.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6); // flags
    localHeader.writeUInt16LE(0, 8); // compression (stored)
    localHeader.writeUInt16LE(0, 10); // mod time
    localHeader.writeUInt16LE(0, 12); // mod date
    const crc = crc32(dataBuffer);
    localHeader.writeUInt32LE(crc, 14); // crc32
    localHeader.writeUInt32LE(dataBuffer.length, 18); // compressed size
    localHeader.writeUInt32LE(dataBuffer.length, 22); // uncompressed size
    localHeader.writeUInt16LE(nameBuffer.length, 26); // filename length
    localHeader.writeUInt16LE(0, 28); // extra field length
    nameBuffer.copy(localHeader, 30);

    localHeaders.push(localHeader, dataBuffer);

    // Central directory header
    const centralHeader = Buffer.alloc(46 + nameBuffer.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // signature
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0, 8); // flags
    centralHeader.writeUInt16LE(0, 10); // compression
    centralHeader.writeUInt16LE(0, 12); // mod time
    centralHeader.writeUInt16LE(0, 14); // mod date
    centralHeader.writeUInt32LE(crc, 16); // crc32
    centralHeader.writeUInt32LE(dataBuffer.length, 20); // compressed size
    centralHeader.writeUInt32LE(dataBuffer.length, 24); // uncompressed size
    centralHeader.writeUInt16LE(nameBuffer.length, 28); // filename length
    centralHeader.writeUInt16LE(0, 30); // extra field length
    centralHeader.writeUInt16LE(0, 32); // comment length
    centralHeader.writeUInt16LE(0, 34); // disk number
    centralHeader.writeUInt16LE(0, 36); // internal attrs
    centralHeader.writeUInt32LE(0, 38); // external attrs
    centralHeader.writeUInt32LE(offset, 42); // local header offset
    nameBuffer.copy(centralHeader, 46);

    centralHeaders.push(centralHeader);
    offset += localHeader.length + dataBuffer.length;
  }

  const centralDirSize = centralHeaders.reduce((s, b) => s + b.length, 0);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0); // signature
  endRecord.writeUInt16LE(0, 4); // disk number
  endRecord.writeUInt16LE(0, 6); // central dir disk
  endRecord.writeUInt16LE(parts.length, 8); // entries on disk
  endRecord.writeUInt16LE(parts.length, 10); // total entries
  endRecord.writeUInt32LE(centralDirSize, 12); // central dir size
  endRecord.writeUInt32LE(offset, 16); // central dir offset
  endRecord.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localHeaders, ...centralHeaders, endRecord]);
}

// CRC32 implementation
function crc32(buf: Buffer): number {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
