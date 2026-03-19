import { db } from "./storage";
import { sql } from "drizzle-orm";

interface AnalyticsSnippets {
  headScripts: string;
  bodyNoscript: string;
}

let cached: AnalyticsSnippets | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60_000;

export async function getAnalyticsSnippets(): Promise<AnalyticsSnippets> {
  if (cached !== null && Date.now() < cacheExpiry) {
    return cached;
  }

  try {
    const result = await db.execute(
      sql`SELECT key, value FROM app_settings WHERE key IN ('ga4_measurement_id', 'fb_pixel_id') AND value IS NOT NULL AND value != ''`
    );
    const settings: Record<string, string> = {};
    for (const row of result.rows as any[]) {
      settings[row.key] = row.value;
    }

    let headScripts = "";
    let bodyNoscript = "";

    const ga4Id = settings["ga4_measurement_id"];
    if (ga4Id) {
      headScripts += `\n  <!-- Google Analytics (GA4) -->\n`;
      headScripts += `  <script async src="https://www.googletagmanager.com/gtag/js?id=${ga4Id}"></script>\n`;
      headScripts += `  <script>\n`;
      headScripts += `    window.dataLayer = window.dataLayer || [];\n`;
      headScripts += `    function gtag(){dataLayer.push(arguments);}\n`;
      headScripts += `    gtag('js', new Date());\n`;
      headScripts += `    gtag('config', '${ga4Id}');\n`;
      headScripts += `  </script>\n`;
    }

    const fbPixelId = settings["fb_pixel_id"];
    if (fbPixelId) {
      headScripts += `\n  <!-- Facebook Pixel -->\n`;
      headScripts += `  <script>\n`;
      headScripts += `    !function(f,b,e,v,n,t,s)\n`;
      headScripts += `    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?\n`;
      headScripts += `    n.callMethod.apply(n,arguments):n.queue.push(arguments)};\n`;
      headScripts += `    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';\n`;
      headScripts += `    n.queue=[];t=b.createElement(e);t.async=!0;\n`;
      headScripts += `    t.src=v;s=b.getElementsByTagName(e)[0];\n`;
      headScripts += `    s.parentNode.insertBefore(t,s)}(window, document,'script',\n`;
      headScripts += `    'https://connect.facebook.net/en_US/fbevents.js');\n`;
      headScripts += `    fbq('init', '${fbPixelId}');\n`;
      headScripts += `    fbq('track', 'PageView');\n`;
      headScripts += `  </script>\n`;

      bodyNoscript += `<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${fbPixelId}&ev=PageView&noscript=1"/></noscript>\n`;
    }

    cached = { headScripts, bodyNoscript };
    cacheExpiry = Date.now() + CACHE_TTL_MS;
    return cached;
  } catch {
    return { headScripts: "", bodyNoscript: "" };
  }
}

export function invalidateAnalyticsCache() {
  cached = null;
  cacheExpiry = 0;
}

export function injectAnalytics(html: string, snippets: AnalyticsSnippets): string {
  let result = html;
  if (snippets.headScripts) {
    result = result.replace("</head>", `${snippets.headScripts}</head>`);
  }
  if (snippets.bodyNoscript) {
    result = result.replace("<body>", `<body>\n${snippets.bodyNoscript}`);
  }
  return result;
}


