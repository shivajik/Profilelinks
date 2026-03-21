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

  const genericClass = {
    id: CLASS_ID,
    classTemplateInfo: {
      cardTemplateOverride: {
        cardRowTemplateInfos: [
          {
            twoItems: {
              startItem: {
                firstValue: {
                  fields: [{ fieldPath: "object.textModulesData['phone']" }],
                },
              },
              endItem: {
                firstValue: {
                  fields: [{ fieldPath: "object.textModulesData['email']" }],
                },
              },
            },
          },
          {
            oneItem: {
              item: {
                firstValue: {
                  fields: [{ fieldPath: "object.textModulesData['website']" }],
                },
              },
            },
          },
        ],
      },
    },
  };

  const genericObject: Record<string, any> = {
    id: `${GOOGLE_WALLET_ISSUER_ID}.${data.objectId}`,
    classId: CLASS_ID,
    genericType: "GENERIC_TYPE_UNSPECIFIED",
    hexBackgroundColor: "#1a1a2e",
    cardTitle: {
      defaultValue: { language: "en", value: data.companyName || "VisiCardly" },
    },
    subheader: {
      defaultValue: { language: "en", value: data.jobTitle || "" },
    },
    header: {
      defaultValue: { language: "en", value: data.name },
    },
    textModulesData: [
      ...(data.phone ? [{ id: "phone", header: "Phone", body: data.phone }] : []),
      ...(data.email ? [{ id: "email", header: "Email", body: data.email }] : []),
      ...(data.website ? [{ id: "website", header: "Website", body: data.website }] : []),
      ...(data.address ? [{ id: "address", header: "Address", body: data.address }] : []),
    ],
    linksModuleData: {
      uris: [
        {
          uri: data.profileUrl,
          description: "View Digital Card",
          id: "profile_link",
        },
        ...(data.website
          ? [{ uri: data.website.startsWith("http") ? data.website : `https://${data.website}`, description: "Website", id: "website_link" }]
          : []),
      ],
    },
    barcode: {
      type: "QR_CODE",
      value: data.profileUrl,
      alternateText: data.profileUrl,
    },
  };

  if (data.profileImage) {
    genericObject.logo = {
      sourceUri: { uri: data.profileImage },
      contentDescription: { defaultValue: { language: "en", value: data.name } },
    };
    genericObject.heroImage = {
      sourceUri: { uri: data.profileImage },
      contentDescription: { defaultValue: { language: "en", value: data.name } },
    };
  }

  const claims = {
    iss: GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL,
    aud: "google",
    origins: ["http://localhost:5000"],
    typ: "savetowallet",
    payload: {
      genericObjects: [genericObject],
    },
  };

  const token = jwt.sign(claims, GOOGLE_WALLET_PRIVATE_KEY, { algorithm: "RS256" });
  return `https://pay.google.com/gp/v/save/${token}`;
}
