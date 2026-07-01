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
    { title: "About Me", subtitle: "Your personal story", icon: User, tint: "from-[#6D4AFF] to-[#8E7BFF]" },
    { title: "Restaurants", subtitle: "Menus & bookings", icon: UtensilsCrossed, tint: "from-[#FF8A4C] to-[#FFB27A]" },
    { title: "Portfolio", subtitle: "Showcase your work", icon: Briefcase, tint: "from-[#FF5C8A] to-[#FF8FB1]" },
    { title: "Services", subtitle: "What you offer", icon: Sparkles, tint: "from-[#6D4AFF] to-[#FF5C8A]" },
    { title: "Let's Connect", subtitle: "All your socials", icon: MessageCircle, tint: "from-[#FF8A4C] to-[#FF5C8A]" },
  ];

  return (
    <div
      className="relative w-full max-w-[620px] mx-auto"
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
        {/* Grid: left card | phone | right rail — collapses to just the phone on mobile */}
        <div className="relative w-full h-full flex md:grid md:grid-cols-[minmax(0,200px)_240px_minmax(0,240px)] lg:grid-cols-[minmax(0,220px)_260px_minmax(0,240px)] gap-4 md:gap-6 items-center justify-center">

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
            className="w-[210px] rounded-[24px] p-4 backdrop-blur-xl border"
            style={{
              background: "rgba(255,255,255,0.78)",
              borderColor: "rgba(255,255,255,0.9)",
              boxShadow:
                "0 20px 40px -14px rgba(109, 74, 255, 0.28), 0 8px 18px -8px rgba(20,20,60,0.12)",
            }}
          >
            <div className="flex flex-col items-center text-center gap-2">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #6D4AFF, #8E7BFF)",
                  boxShadow: "0 8px 20px -6px rgba(109,74,255,0.55)",
                }}
              >
                <Link2 className="w-5 h-5 text-white" />
              </div>
              <p className="text-[15px] font-semibold text-[#1a1330] leading-tight">
                One simple link
              </p>
              <p className="text-[12px] text-[#5a5675] leading-snug">
                Share once, update anytime.
              </p>
            </div>
          </div>
          {/* Dashed connector to phone */}
          <svg aria-hidden className="hidden md:block mt-2 ml-auto" width="120" height="40" viewBox="0 0 120 40" fill="none">
            <path d="M4 4 C 40 4, 60 34, 116 34" stroke="#8B5CF6" strokeWidth="1.5" strokeDasharray="4 5" strokeLinecap="round" opacity="0.55" />
            <circle cx="116" cy="34" r="3" fill="#8B5CF6" />
          </svg>
        </motion.div>

        {/* PHONE MOCKUP */}
        <motion.div
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10 justify-self-center"
        >
          <div
            className="relative w-[220px] h-[460px] sm:w-[240px] sm:h-[500px] md:w-[260px] md:h-[540px] rounded-[40px] md:rounded-[44px] p-[5px] md:p-[6px]"
            style={{
              background: "linear-gradient(160deg, #1a1130 0%, #2a1a4a 45%, #1a1130 100%)",
              boxShadow:
                "0 40px 80px -20px rgba(109, 74, 255, 0.45), 0 20px 40px -12px rgba(255, 92, 138, 0.25), 0 0 0 1px rgba(255,255,255,0.06) inset",
            }}
          >
            {/* Notch */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[100px] h-[26px] rounded-full bg-black/85 z-20" />
            {/* Screen */}
            <div className="relative w-full h-full rounded-[38px] overflow-hidden bg-white">
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
            <div className="absolute -left-[3px] top-24 w-[3px] h-14 rounded-l bg-black/60" />
            <div className="absolute -right-[3px] top-32 w-[3px] h-20 rounded-r bg-black/60" />
          </div>
        </motion.div>

        {/* RIGHT — Timeline of feature cards */}
        <div className="relative z-20 hidden md:flex flex-col justify-center self-stretch py-4">
          {/* Dotted vertical timeline */}
          <div
            aria-hidden
            className="absolute left-[22px] top-4 bottom-4 w-px"
            style={{
              backgroundImage:
                "linear-gradient(to bottom, #6D4AFF 0 4px, transparent 4px 10px)",
              backgroundSize: "1px 10px",
              backgroundRepeat: "repeat-y",
              opacity: 0.55,
            }}
          />
          <div className="relative flex flex-col gap-3 pl-[52px]">
            {cards.map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                whileHover={{ y: -3, scale: 1.02 }}
                className="group relative"
              >
                {/* Timeline dot */}
                <span
                  aria-hidden
                  className="absolute -left-[34px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
                  style={{
                    background: "#6D4AFF",
                    boxShadow: "0 0 0 4px rgba(109,74,255,0.15), 0 0 12px rgba(109,74,255,0.6)",
                  }}
                />
                <div
                  className="flex items-center gap-3 w-[210px] rounded-[20px] px-3.5 py-3 backdrop-blur-xl border transition-shadow"
                  style={{
                    background: "rgba(255,255,255,0.82)",
                    borderColor: "rgba(255,255,255,0.9)",
                    boxShadow:
                      "0 10px 24px -14px rgba(20,20,60,0.18), 0 2px 6px -2px rgba(20,20,60,0.06)",
                  }}
                >
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${c.tint} flex items-center justify-center shrink-0`}
                    style={{ boxShadow: "0 8px 18px -6px rgba(109,74,255,0.45)" }}
                  >
                    <c.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-[#1a1330] leading-tight truncate">
                      {c.title}
                    </p>
                    <p className="text-[11.5px] text-[#6a6685] leading-tight truncate">
                      {c.subtitle}
                    </p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[#6D4AFF] opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
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
