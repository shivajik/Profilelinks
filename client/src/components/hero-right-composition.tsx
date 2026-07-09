import { motion } from "framer-motion";
import {
  User,
  UtensilsCrossed,
  Briefcase,
  Sparkles,
  Link2,
  ArrowUpRight,
  MessageCircle,
} from "lucide-react";
import shivajiTemplate from "@/assets/images/template-ksoftsolution.png";

/**
 * Premium SaaS hero-right composition:
 *  - Large floating phone (image placeholder) in the center
 *  - Glass "One simple link" card on the left
 *  - Vertical timeline of feature cards on the right
 *  - Purple → orange gradient blob + dotted decoration behind
 */
export function HeroRightComposition() {
  const cards = [
    { 
      title: "How it works", 
      subtitle: "Learn the process", 
      icon: User, 
      tint: "from-[#6D4AFF] to-[#8E7BFF]" 
    },
    { 
      title: "Features", 
      subtitle: "Explore capabilities", 
      icon: UtensilsCrossed, 
      tint: "from-[#FF8A4C] to-[#FFB27A]" 
    },
    { 
      title: "Testimonials", 
      subtitle: "Hear from users", 
      icon: Briefcase, 
      tint: "from-[#FF5C8A] to-[#FF8FB1]" 
    },
    { 
      title: "Restaurants", 
      subtitle: "Menu & Services", 
      icon: Sparkles, 
      tint: "from-[#6D4AFF] to-[#FF5C8A]" 
    },
    { 
      title: "Pricing", 
      subtitle: "Plans & packages", 
      icon: MessageCircle, 
      tint: "from-[#FF8A4C] to-[#FF5C8A]" 
    },
    { 
      title: "Docs", 
      subtitle: "Documentation", 
      icon: Link2, 
      tint: "from-[#6D4AFF] to-[#FF8A4C]" 
    },
  ];

  return (
    <div
      className="relative w-full max-w-[680px] mx-auto"
      style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}
    >
      {/* Backdrop: gradient blob + glow */}
      <div aria-hidden className="absolute inset-0 -z-10 pointer-events-none">
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full blur-3xl opacity-70"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, #6D4AFF 0%, transparent 55%), radial-gradient(circle at 75% 70%, #FF8A4C 0%, transparent 55%), radial-gradient(circle at 60% 20%, #FF5C8A 0%, transparent 60%)",
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] rounded-full opacity-40"
          style={{
            background:
              "conic-gradient(from 210deg, #6D4AFF, #FF5C8A, #FF8A4C, #6D4AFF)",
            filter: "blur(60px)",
          }}
        />
        {/* Dotted decoration */}
        <svg className="absolute -top-4 -left-2 opacity-40" width="110" height="110" viewBox="0 0 110 110">
          {Array.from({ length: 8 }).map((_, r) =>
            Array.from({ length: 8 }).map((_, c) => (
              <circle key={`${r}-${c}`} cx={6 + c * 14} cy={6 + r * 14} r="1.6" fill="#6D4AFF" opacity="0.35" />
            )),
          )}
        </svg>
        <svg className="absolute -bottom-2 -right-2 opacity-40" width="110" height="110" viewBox="0 0 110 110">
          {Array.from({ length: 8 }).map((_, r) =>
            Array.from({ length: 8 }).map((_, c) => (
              <circle key={`${r}-${c}`} cx={6 + c * 14} cy={6 + r * 14} r="1.6" fill="#FF8A4C" opacity="0.35" />
            )),
          )}
        </svg>
      </div>

      <div className="relative h-[480px] sm:h-[560px] md:h-[600px] flex items-center justify-center">
        {/* Grid: left card | phone | right rail */}
        <div className="relative w-full h-full flex md:grid md:grid-cols-[minmax(0,180px)_1fr_minmax(0,200px)] lg:grid-cols-[minmax(0,200px)_1fr_minmax(0,220px)] xl:grid-cols-[minmax(0,210px)_260px_minmax(0,230px)] gap-2 md:gap-3 items-center justify-center">

        {/* LEFT GLASS CARD — "One simple link" */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0, y: [0, -8, 0] }}
          transition={{
            opacity: { duration: 0.6, delay: 0.2 },
            x: { duration: 0.6, delay: 0.2 },
            y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.8 },
          }}
          className="justify-self-end relative z-20 hidden md:block"
        >
          <div
            className="w-[170px] md:w-[180px] lg:w-[200px] rounded-[20px] md:rounded-[24px] p-3 md:p-3.5 lg:p-4 backdrop-blur-xl border"
            style={{
              background: "rgba(255,255,255,0.78)",
              borderColor: "rgba(255,255,255,0.9)",
              boxShadow:
                "0 20px 40px -14px rgba(109, 74, 255, 0.28), 0 8px 18px -8px rgba(20,20,60,0.12)",
            }}
          >
            <div className="flex flex-col items-center text-center gap-1.5 md:gap-2">
              <div
                className="w-9 h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, #6D4AFF, #8E7BFF)",
                  boxShadow: "0 8px 20px -6px rgba(109,74,255,0.55)",
                }}
              >
                <Link2 className="w-4 h-4 md:w-4.5 md:h-4.5 lg:w-5 lg:h-5 text-white" />
              </div>
              <p className="text-[13px] md:text-[14px] lg:text-[15px] font-semibold text-[#1a1330] leading-tight whitespace-nowrap">
                One simple link
              </p>
              <p className="text-[10px] md:text-[11px] lg:text-[12px] text-[#5a5675] leading-snug whitespace-nowrap">
                Share once, update anytime.
              </p>
            </div>
          </div>
          {/* Dashed connector to phone */}
          <svg aria-hidden className="hidden lg:block mt-2 ml-auto" width="100" height="40" viewBox="0 0 100 40" fill="none">
            <path d="M4 4 C 30 4, 50 34, 96 34" stroke="#8B5CF6" strokeWidth="1.5" strokeDasharray="4 5" strokeLinecap="round" opacity="0.55" />
            <circle cx="96" cy="34" r="3" fill="#8B5CF6" />
          </svg>
        </motion.div>

        {/* PHONE MOCKUP */}
        <motion.div
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10 justify-self-center"
        >
          <div
            className="relative w-[200px] sm:w-[220px] md:w-[240px] lg:w-[250px] xl:w-[260px] h-[420px] sm:h-[460px] md:h-[500px] lg:h-[520px] xl:h-[540px] rounded-[36px] sm:rounded-[40px] md:rounded-[44px] p-[4px] sm:p-[5px] md:p-[6px]"
            style={{
              background: "linear-gradient(160deg, #1a1130 0%, #2a1a4a 45%, #1a1130 100%)",
              boxShadow:
                "0 40px 80px -20px rgba(109, 74, 255, 0.45), 0 20px 40px -12px rgba(255, 92, 138, 0.25), 0 0 0 1px rgba(255,255,255,0.06) inset",
            }}
          >
            {/* Screen */}
            <div className="relative w-full h-full rounded-[34px] sm:rounded-[38px] overflow-hidden bg-white">
              {/* Status bar strip — matches phone bezel so no white gap flickers above the notch during float animation */}
              <div
                className="absolute top-0 left-0 right-0 h-[26px] sm:h-[28px] z-10"
                style={{ background: "linear-gradient(180deg, #1a1130 0%, #1a1130 70%, rgba(26,17,48,0) 100%)" }}
              />
              {/* Notch — slimmer pill */}
              <div className="absolute top-[6px] left-1/2 -translate-x-1/2 w-[70px] sm:w-[88px] h-[14px] sm:h-[16px] rounded-full bg-black z-20" />
              <img
                src={shivajiTemplate}
                alt="Shivaji Khandagale — VisiCardly profile preview"
                className="block w-full h-full object-cover object-top"
                loading="lazy"
              />
              {/* Fallback gradient behind image */}
              <div
                className="absolute inset-0 -z-10"
                style={{
                  background:
                    "linear-gradient(180deg, #F8F8FD 0%, #EEE8FF 45%, #FFE7D6 100%)",
                }}
              />
            </div>
            {/* Side buttons */}
            <div className="absolute -left-[3px] top-24 w-[3px] h-12 sm:h-14 rounded-l bg-black/60" />
            <div className="absolute -right-[3px] top-32 w-[3px] h-16 sm:h-20 rounded-r bg-black/60" />
          </div>
        </motion.div>

        {/* RIGHT — Timeline of feature cards - FIXED VISIBILITY */}
        <div className="relative z-20 hidden lg:flex flex-col justify-center self-stretch py-2 md:py-3 lg:py-4 overflow-visible">
          <div className="relative flex flex-col gap-1.5 md:gap-2">
            {cards.map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.08 }}
                whileHover={{ y: -2, scale: 1.02 }}
                className="group relative"
              >
                <div
                  className="flex items-center gap-2 md:gap-2.5 w-full rounded-[14px] md:rounded-[16px] lg:rounded-[18px] px-2 md:px-2.5 py-1.5 md:py-2 backdrop-blur-xl border transition-shadow"
                  style={{
                    background: "rgba(255,255,255,0.82)",
                    borderColor: "rgba(255,255,255,0.9)",
                    boxShadow:
                      "0 10px 24px -14px rgba(20,20,60,0.18), 0 2px 6px -2px rgba(20,20,60,0.06)",
                  }}
                >
                  <div
                    className={`w-7 h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 rounded-full bg-gradient-to-br ${c.tint} flex items-center justify-center shrink-0`}
                    style={{ boxShadow: "0 8px 18px -6px rgba(109,74,255,0.45)" }}
                  >
                    <c.icon className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] md:text-[11px] lg:text-[12px] font-semibold text-[#1a1330] leading-tight truncate">
                      {c.title}
                    </p>
                    <p className="text-[8px] md:text-[9px] lg:text-[10px] text-[#6a6685] leading-tight truncate">
                      {c.subtitle}
                    </p>
                  </div>
                  <ArrowUpRight className="w-3 h-3 md:w-3.5 md:h-3.5 text-[#6D4AFF] opacity-60 shrink-0 group-hover:opacity-100 transition-all" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}