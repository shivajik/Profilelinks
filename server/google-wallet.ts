import jwt from "jsonwebtoken";

// Google Wallet configuration from environment
const GOOGLE_WALLET_ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID || "";
const GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL || "";
const GOOGLE_WALLET_PRIVATE_KEY = (process.env.GOOGLE_WALLET_PRIVATE_KEY || "").replace(/\\n/g, "\n");

const CLASS_ID = `${GOOGLE_WALLET_ISSUER_ID}.visicardly_business_card`;

export function isGoogleWalletConfigured(): boolean {
  return !!(GOOGLE_WALLET_ISSUER_ID && GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL && GOOGLE_WALLET_PRIVATE_KEY);
}

interface BusinessCardData {
  objectId: string;
  name: string;
  jobTitle?: string;
  companyName?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  profileImage?: string;
  profileUrl: string;
}

export function createGoogleWalletPassUrl(data: BusinessCardData): string {
  if (!isGoogleWalletConfigured()) {
    throw new Error("Google Wallet is not configured");
  }

  const genericObject: Record<string, any> = {
    id: `${GOOGLE_WALLET_ISSUER_ID}.${data.objectId}`,
    classId: CLASS_ID,
    genericType: "GENERIC_TYPE_UNSPECIFIED",
    hexBackgroundColor: "#1a1a2e",
    cardTitle: {
      defaultValue: { language: "en", value: (data.companyName || "VisiCardly").substring(0, 40) },
    },
    ...(data.jobTitle ? {
      subheader: {
        defaultValue: { language: "en", value: data.jobTitle.substring(0, 40) },
      },
    } : {}),
    header: {
      defaultValue: { language: "en", value: (data.name || "Contact").substring(0, 40) },
    },
    textModulesData: [
      ...(data.phone ? [{ id: "phone", header: "Phone", body: data.phone.substring(0, 30) }] : []),
      ...(data.email ? [{ id: "email", header: "Email", body: data.email.substring(0, 50) }] : []),
    ],
    linksModuleData: {
      uris: [
        {
          uri: data.profileUrl,
          description: "View Digital Card",
          id: "profile_link",
        },
      ],
    },
    barcode: {
      type: "QR_CODE",
      value: data.profileUrl,
    },
  };

  // Only add logo if it's a short URL (not a data URI or very long URL)
  if (data.profileImage && data.profileImage.startsWith("http") && data.profileImage.length < 200) {
    genericObject.logo = {
      sourceUri: { uri: data.profileImage },
      contentDescription: { defaultValue: { language: "en", value: data.name.substring(0, 30) } },
    };
  }

  const claims = {
    iss: GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL,
    aud: "google",
    typ: "savetowallet",
    payload: {
      genericObjects: [genericObject],
    },
  };

  const token = jwt.sign(claims, GOOGLE_WALLET_PRIVATE_KEY, { algorithm: "RS256" });
  return `https://pay.google.com/gp/v/save/${token}`;
}
