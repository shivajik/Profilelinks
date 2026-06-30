import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Sparkles, Zap, Heart } from "lucide-react";
import templateA from "@/assets/images/template-kunalshah.png";
import templateB from "@/assets/images/template-glamstudio.png";
import templateC from "@/assets/images/template-exploreworld.png";

/**
 * Inspired by Liinks but reworked: three fanned phone cards with a
 * mouse-parallax tilt on the whole cluster, an animated conic glow halo,
 * floating accent chips, and a sharper hover spread.
 */
export function PhoneFanStack() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-1, 1], [8, -8]), { stiffness: 120, damping: 16 });
  const ry = useSpring(useTransform(mx, [-1, 1], [-12, 12]), { stiffness: 120, damping: 16 });

  const onMove = (e: React.MouseEvent) => {
    const r = wrapRef.current!.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width - 0.5) * 2);
    my.set(((e.clientY - r.top) / r.height - 0.5) * 2);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  const cards = [
    { src: templateA, rotate: -12, x: -110, z: 1, hoverRotate: -18, hoverX: -180, hue: "hsl(256 95% 65%)" },
    { src: templateC, rotate: 8,   x: 110,  z: 2, hoverRotate: 14, hoverX: 180,  hue: "hsl(28 95% 60%)" },
    { src: templateB, rotate: -1,  x: 0,    z: 3, hoverRotate: 0,  hoverX: 0,    hue: "hsl(322 90% 62%)" },
  ];

  const chips = [
    { icon: Sparkles, label: "New visit",   pos: "top-6 -left-2",     delay: 0,   tint: "from-violet-500/90 to-fuchsia-500/90" },
    { icon: Heart,    label: "+128 saves",  pos: "top-1/3 -right-4",  delay: 1.2, tint: "from-rose-500/90 to-orange-500/90" },
    { icon: Zap,      label: "Live now",    pos: "bottom-16 -left-6", delay: 2.4, tint: "from-emerald-500/90 to-teal-500/90" },
  ];

  return (
    <motion.div
      ref={wrapRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative w-full max-w-[560px] h-[540px] mx-auto"
      initial="rest"
      whileHover="hover"
      animate="rest"
      style={{ perspective: 1600 }}
    >
      {/* Conic glow halo */}
      <motion.div
        aria-hidden
        className="absolute inset-10 rounded-full blur-3xl opacity-70"
        style={{
          background:
            "conic-gradient(from 0deg, hsl(256 95% 65% / 0.55), hsl(322 90% 62% / 0.5), hsl(28 95% 60% / 0.5), hsl(174 75% 55% / 0.5), hsl(256 95% 65% / 0.55))",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
      />
      {/* Soft ring */}
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] h-[460px] rounded-full border border-white/60"
        animate={{ rotate: -360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      >
        <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[hsl(256_95%_65%)] shadow-[0_0_20px_hsl(256_95%_65%)]" />
        <span className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[hsl(28_95%_60%)] shadow-[0_0_20px_hsl(28_95%_60%)]" />
        <span className="absolute -bottom-1.5 left-1/3 w-2 h-2 rounded-full bg-[hsl(322_90%_62%)] shadow-[0_0_20px_hsl(322_90%_62%)]" />
      </motion.div>

      <motion.div
        className="relative w-full h-full"
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
      >
        {cards.map((c, i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 left-1/2"
            style={{ zIndex: c.z, transformStyle: "preserve-3d" }}
            variants={{
              rest:  { x: c.x - 120, y: -240, rotate: c.rotate,      scale: i === 2 ? 1 : 0.96 },
              hover: { x: c.hoverX - 120, y: i === 2 ? -260 : -240, rotate: c.hoverRotate, scale: i === 2 ? 1.06 : 1.02 },
            }}
            transition={{ type: "spring", stiffness: 150, damping: 18 }}
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5 + i * 0.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
              className="relative w-[230px] md:w-[250px] rounded-[2.2rem] overflow-hidden bg-card border border-white/70"
              style={{
                boxShadow:
                  `0 1px 0 hsl(0 0% 100% / 0.7) inset, 0 30px 70px -22px ${c.hue.replace(")", " / 0.45)")}, 0 10px 24px -10px hsl(230 30% 20% / 0.22)`,
              }}
            >
              {/* Gradient frame highlight */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[2.2rem]"
                style={{
                  background: `linear-gradient(135deg, ${c.hue.replace(")", " / 0.22)")}, transparent 55%)`,
                  mixBlendMode: "screen",
                }}
              />
              <img
                src={c.src}
                alt=""
                className="block w-full h-[480px] object-cover"
                draggable={false}
              />
            </motion.div>
          </motion.div>
        ))}
      </motion.div>

      {/* Floating chips */}
      {chips.map((ch, i) => (
        <motion.div
          key={i}
          className={`absolute ${ch.pos} z-20`}
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut", delay: ch.delay }}
        >
          <div className={`flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-to-r ${ch.tint} text-white text-xs font-semibold shadow-lg backdrop-blur-md`}>
            <ch.icon className="w-3.5 h-3.5" />
            {ch.label}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
