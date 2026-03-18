import { useEffect } from "react";

export function AnalyticsInjector() {
  useEffect(() => {
    fetch("/api/settings/tracking")
      .then((r) => r.json())
      .then((settings: Record<string, string>) => {
        const ga4Id = settings["ga4_measurement_id"];
        const fbPixelId = settings["fb_pixel_id"];

        if (ga4Id && !document.getElementById("ga4-script")) {
          const s1 = document.createElement("script");
          s1.id = "ga4-script";
          s1.async = true;
          s1.src = `https://www.googletagmanager.com/gtag/js?id=${ga4Id}`;
          document.head.appendChild(s1);

          const s2 = document.createElement("script");
          s2.id = "ga4-config";
          s2.innerHTML = `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${ga4Id}');
          `;
          document.head.appendChild(s2);
        }

        if (fbPixelId && !document.getElementById("fb-pixel-script")) {
          const s = document.createElement("script");
          s.id = "fb-pixel-script";
          s.innerHTML = `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${fbPixelId}');
            fbq('track', 'PageView');
          `;
          document.head.appendChild(s);

          const ns = document.createElement("noscript");
          const img = document.createElement("img");
          img.height = 1;
          img.width = 1;
          img.style.display = "none";
          img.src = `https://www.facebook.com/tr?id=${fbPixelId}&ev=PageView&noscript=1`;
          ns.appendChild(img);
          document.body.insertBefore(ns, document.body.firstChild);
        }
      })
      .catch(() => {});
  }, []);

  return null;
}
