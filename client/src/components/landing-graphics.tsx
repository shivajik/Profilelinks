import { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link2, QrCode, CreditCard, Palette, Users, Globe, UtensilsCrossed, LayoutGrid, Zap, Star } from "lucide-react";
import { SiInstagram, SiFacebook, SiX, SiPinterest, SiTumblr, SiYoutube, SiTiktok, SiLinkedin, SiSpotify, SiGithub } from "react-icons/si";

/* ───── Animated mesh-gradient blob (SVG) ───── */
export function MeshBlob({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 600 600"
      className={`pointer-events-none absolute ${className}`}
    >
      <defs>
        <radialGradient id="mb1" cx="30%" cy="30%">
          <stop offset="0%" stopColor="hsl(252 95% 70%)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="hsl(252 95% 70%)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="mb2" cx="70%" cy="60%">
          <stop offset="0%" stopColor="hsl(322 95% 70%)" stopOpacity="0.85" />
          <stop offset="100%" stopColor="hsl(322 95% 70%)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="mb3" cx="50%" cy="80%">
          <stop offset="0%" stopColor="hsl(38 95% 65%)" stopOpacity="0.8" />
          <stop offset="100%" stopColor="hsl(38 95% 65%)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <motion.path
        fill="url(#mb1)"
        animate={{
          d: [
            "M421.5,322.5Q412,395,346,427.5Q280,460,209,431Q138,402,118.5,331Q99,260,131,193Q163,126,232,107.5Q301,89,365,128Q429,167,432,213.5Q435,260,421.5,322.5Z",
            "M438,316Q424,372,376,415Q328,458,260,449Q192,440,140,394Q88,348,98,272Q108,196,158,153Q208,110,275,113Q342,116,397,156Q452,196,449,228Q446,260,438,316Z",
            "M421.5,322.5Q412,395,346,427.5Q280,460,209,431Q138,402,118.5,331Q99,260,131,193Q163,126,232,107.5Q301,89,365,128Q429,167,432,213.5Q435,260,421.5,322.5Z",
          ],
        }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.path
        fill="url(#mb2)"
        animate={{
          d: [
            "M450,300Q450,360,400,400Q350,440,290,430Q230,420,180,380Q130,340,140,275Q150,210,200,170Q250,130,310,145Q370,160,410,200Q450,240,450,300Z",
            "M420,290Q430,355,380,395Q330,435,265,430Q200,425,160,375Q120,325,140,260Q160,195,220,165Q280,135,340,160Q400,185,410,237Q420,290,420,290Z",
            "M450,300Q450,360,400,400Q350,440,290,430Q230,420,180,380Q130,340,140,275Q150,210,200,170Q250,130,310,145Q370,160,410,200Q450,240,450,300Z",
          ],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.path
        fill="url(#mb3)"
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "300px 300px" }}
        d="M420,290Q430,355,380,395Q330,435,265,430Q200,425,160,375Q120,325,140,260Q160,195,220,165Q280,135,340,160Q400,185,410,237Q420,290,420,290Z"
      />
    </svg>
  );
}

/* ───── Floating sparkle dots ───── */
export function SparkleField({ count = 22, className = "" }: { count?: number; className?: string }) {
  const dots = Array.from({ length: count });
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {dots.map((_, i) => {
        const left = (i * 53) % 100;
        const top = (i * 37) % 100;
        const size = 2 + (i % 4);
        const dur = 4 + (i % 5);
        const colors = ["hsl(252 95% 65%)", "hsl(322 95% 70%)", "hsl(38 95% 60%)", "hsl(174 80% 55%)"];
        return (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: size,
              height: size,
              background: colors[i % colors.length],
              boxShadow: `0 0 ${size * 3}px ${colors[i % colors.length]}`,
            }}
            animate={{ y: [0, -20, 0], opacity: [0.2, 0.9, 0.2] }}
            transition={{ duration: dur, repeat: Infinity, delay: (i % 7) * 0.4, ease: "easeInOut" }}
          />
        );
      })}
    </div>
  );
}

/* ───── Isometric 3D link card stack ───── */
const LINK_CARDS = [
  { icon: SiInstagram, label: "Instagram", meta: "@you", grad: "from-[hsl(330_90%_65%)] to-[hsl(22_95%_60%)]" },
  { icon: SiYoutube, label: "YouTube", meta: "Subscribe", grad: "from-[hsl(0_85%_60%)] to-[hsl(14_95%_60%)]" },
  { icon: SiSpotify, label: "Latest Track", meta: "Listen now", grad: "from-[hsl(158_75%_45%)] to-[hsl(174_80%_45%)]" },
  { icon: Link2, label: "Portfolio", meta: "see.work", grad: "from-[hsl(252_85%_62%)] to-[hsl(280_85%_62%)]" },
  { icon: QrCode, label: "vCard", meta: "Save contact", grad: "from-[hsl(230_35%_18%)] to-[hsl(244_40%_28%)]" },
];

export function LinkStack3D() {
  return (
    <div className="relative w-full max-w-sm mx-auto" style={{ perspective: 1400 }}>
      <div className="relative h-[420px]" style={{ transformStyle: "preserve-3d" }}>
        {LINK_CARDS.map((c, i) => (
          <div
            key={i}
            className="absolute left-1/2 top-1/2 w-72"
            style={{
              transform: `translate(-50%, calc(-50% + ${(i - 2) * 64}px)) rotateX(22deg) rotateZ(${(i - 2) * -3}deg)`,
              zIndex: 10 - Math.abs(i - 2),
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: i * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/95 border border-white shadow-[0_24px_50px_-20px_hsl(252_60%_40%/0.35)] backdrop-blur"
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${c.grad} flex items-center justify-center shrink-0 shadow-md`}>
                  <c.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground truncate">{c.label}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{c.meta}</p>
                </div>
                <div className="text-[10px] landing-mono uppercase text-muted-foreground">tap</div>
              </motion.div>
            </motion.div>
          </div>
        ))}

      </div>
    </div>
  );
}

/* ───── Animated SVG analytics chart ───── */
export function AnalyticsGraphic() {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const bars = [42, 68, 55, 82, 70, 95, 78];
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <div className="relative rounded-3xl bento-tile p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] landing-mono uppercase text-muted-foreground">Live · this week</p>
          <p className="text-2xl font-semibold text-foreground mt-1">
            12,847 <span className="text-sm font-normal text-muted-foreground">profile views</span>
          </p>
        </div>
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[hsl(158_75%_42%/0.15)] text-[hsl(158_75%_28%)] text-[11px] font-semibold">
          <Zap className="w-3 h-3" /> +24.6%
        </div>
      </div>
      <svg ref={ref} viewBox="0 0 320 140" className="w-full h-36">
        <defs>
          <linearGradient id="barG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(252 90% 65%)" />
            <stop offset="100%" stopColor="hsl(322 90% 68%)" />
          </linearGradient>
          <linearGradient id="lineG" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(38 95% 60%)" />
            <stop offset="100%" stopColor="hsl(14 95% 60%)" />
          </linearGradient>
        </defs>
        {bars.map((h, i) => (
          <motion.rect
            key={i}
            x={20 + i * 40}
            width={22}
            rx={6}
            fill="url(#barG)"
            initial={{ height: 0, y: 120 }}
            animate={inView ? { height: h, y: 120 - h } : {}}
            transition={{ delay: 0.1 + i * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
        <motion.path
          d={bars.map((h, i) => `${i === 0 ? "M" : "L"}${31 + i * 40},${120 - h - 8}`).join(" ")}
          fill="none"
          stroke="url(#lineG)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={inView ? { pathLength: 1 } : {}}
          transition={{ duration: 1.4, delay: 0.6, ease: "easeInOut" }}
        />
        {bars.map((h, i) => (
          <motion.circle
            key={`d${i}`}
            cx={31 + i * 40}
            cy={120 - h - 8}
            r={3.5}
            fill="white"
            stroke="hsl(14 95% 60%)"
            strokeWidth={2}
            initial={{ scale: 0 }}
            animate={inView ? { scale: 1 } : {}}
            transition={{ delay: 1.4 + i * 0.05 }}
          />
        ))}
        {days.map((d, i) => (
          <text
            key={d + i}
            x={31 + i * 40}
            y={135}
            textAnchor="middle"
            className="text-[9px]"
            fill="hsl(240 8% 50%)"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {d}
          </text>
        ))}
      </svg>
      <div className="grid grid-cols-3 gap-3 mt-5">
        {[
          { l: "Clicks", v: "8.2k", c: "hsl(252 85% 62%)" },
          { l: "Scans", v: "2.4k", c: "hsl(322 85% 62%)" },
          { l: "Saves", v: "1.1k", c: "hsl(38 95% 55%)" },
        ].map((s) => (
          <div key={s.l} className="rounded-xl bg-white/70 border border-border/60 px-3 py-2">
            <p className="text-[10px] landing-mono uppercase text-muted-foreground">{s.l}</p>
            <p className="text-sm font-semibold mt-0.5" style={{ color: s.c }}>
              {s.v}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───── Rotating platform orbit ───── */
const ORBIT_ICONS = [SiInstagram, SiYoutube, SiTiktok, SiLinkedin, SiSpotify, SiFacebook, SiX, SiPinterest, SiGithub, SiTumblr];
export function PlatformOrbit() {
  const inner = 5;
  const outer = ORBIT_ICONS.length - inner;
  return (
    <div className="relative w-[340px] h-[340px] md:w-[420px] md:h-[420px] mx-auto">
      {/* Concentric rings */}
      <div className="absolute inset-0 rounded-full border border-primary/15" />
      <div className="absolute inset-10 rounded-full border border-primary/10" />
      <div className="absolute inset-20 rounded-full border border-primary/10" />

      {/* Outer ring */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 36, repeat: Infinity, ease: "linear" }}
      >
        {ORBIT_ICONS.slice(0, outer).map((Ic, i) => {
          const angle = (i / outer) * 360;
          return (
            <div
              key={i}
              className="absolute top-1/2 left-1/2"
              style={{ transform: `rotate(${angle}deg) translate(170px) rotate(-${angle}deg)` }}
            >
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 36, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white border border-border/60 shadow-[0_12px_30px_-10px_hsl(252_60%_40%/0.3)] flex items-center justify-center"
              >
                <Ic className="w-5 h-5 text-foreground/80" />
              </motion.div>
            </div>
          );
        })}
      </motion.div>

      {/* Inner ring (counter-rotate) */}
      <motion.div
        className="absolute inset-16"
        animate={{ rotate: -360 }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
      >
        {ORBIT_ICONS.slice(outer).map((Ic, i) => {
          const angle = (i / inner) * 360;
          return (
            <div
              key={i}
              className="absolute top-1/2 left-1/2"
              style={{ transform: `rotate(${angle}deg) translate(110px) rotate(-${angle}deg)` }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
                className="w-10 h-10 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-gradient-to-br from-white to-secondary border border-border/60 shadow-md flex items-center justify-center"
              >
                <Ic className="w-4 h-4 text-primary" />
              </motion.div>
            </div>
          );
        })}
      </motion.div>

      {/* Core */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-[hsl(252_95%_62%)] via-[hsl(280_85%_62%)] to-[hsl(322_95%_65%)] shadow-[0_20px_50px_-15px_hsl(280_85%_55%/0.6)] flex items-center justify-center"
        >
          <Globe className="w-9 h-9 text-white" />
          <span className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-[hsl(252_95%_62%)] to-[hsl(322_95%_65%)] blur-2xl opacity-50 -z-10" />
        </motion.div>
      </div>
    </div>
  );
}

/* ───── Wavy section divider (SVG) ───── */
export function WaveDivider({ flip = false, color = "hsl(var(--card))" }: { flip?: boolean; color?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1440 80"
      preserveAspectRatio="none"
      className={`block w-full h-12 ${flip ? "rotate-180" : ""}`}
    >
      <path
        d="M0,32 C240,80 480,0 720,32 C960,64 1200,16 1440,40 L1440,80 L0,80 Z"
        fill={color}
      />
    </svg>
  );
}

/* ───── Decorative geometric shape cluster ───── */
export function ShapeCluster({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute ${className}`}>
      <motion.div
        animate={{ rotate: 360, y: [0, -10, 0] }}
        transition={{ rotate: { duration: 26, repeat: Infinity, ease: "linear" }, y: { duration: 5, repeat: Infinity, ease: "easeInOut" } }}
        className="absolute w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(252_90%_70%)] to-[hsl(280_85%_70%)] opacity-80 shadow-xl"
      />
      <motion.div
        animate={{ rotate: -360, x: [0, 8, 0] }}
        transition={{ rotate: { duration: 30, repeat: Infinity, ease: "linear" }, x: { duration: 4, repeat: Infinity, ease: "easeInOut" } }}
        className="absolute top-16 left-20 w-10 h-10 rounded-full bg-gradient-to-br from-[hsl(38_95%_65%)] to-[hsl(22_95%_60%)] opacity-90 shadow-lg"
      />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        className="absolute top-2 left-32"
        style={{ width: 0, height: 0, borderLeft: "16px solid transparent", borderRight: "16px solid transparent", borderBottom: "28px solid hsl(322 90% 68%)", filter: "drop-shadow(0 8px 14px hsl(322 80% 50% / 0.45))" }}
      />
    </div>
  );
}

/* ───── Vertical connecting line for steps ───── */
export function StepConnector() {
  return (
    <svg aria-hidden viewBox="0 0 200 40" className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-24 h-10 hidden md:block">
      <motion.path
        d="M100,0 C100,20 100,20 100,40"
        stroke="hsl(252 85% 62%)"
        strokeWidth="2"
        strokeDasharray="4 6"
        fill="none"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2 }}
      />
    </svg>
  );
}
