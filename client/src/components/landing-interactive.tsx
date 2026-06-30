import { useEffect, useRef, useState, ReactNode } from "react";
import { motion, useInView, useMotionValue, useSpring, useTransform, animate } from "framer-motion";

/* ───── Mouse-tracking spotlight (used inside hero) ───── */
export function MouseSpotlight({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(50);
  const y = useMotionValue(50);
  const sx = useSpring(x, { stiffness: 120, damping: 20 });
  const sy = useSpring(y, { stiffness: 120, damping: 20 });
  const bg = useTransform(
    [sx, sy] as any,
    ([px, py]: number[]) =>
      `radial-gradient(600px circle at ${px}% ${py}%, hsl(22 95% 60% / 0.18), hsl(280 85% 65% / 0.12) 30%, transparent 60%)`,
  );
  useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      x.set(((e.clientX - r.left) / r.width) * 100);
      y.set(((e.clientY - r.top) / r.height) * 100);
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, [x, y]);
  return (
    <motion.div
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute inset-0 z-0 ${className}`}
      style={{ background: bg as any }}
    />
  );
}

/* ───── Animated count-up number ───── */
export function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [text, setText] = useState(value);
  const match = value.match(/^([\d.]+)(.*)$/);
  useEffect(() => {
    if (!inView || !match) return;
    const end = parseFloat(match[1]);
    const suffix = match[2];
    const controls = animate(0, end, {
      duration: 1.4,
      ease: "easeOut",
      onUpdate: (v) => {
        const formatted = end >= 100 ? Math.round(v).toLocaleString() : v.toFixed(1);
        setText(formatted + suffix);
      },
    });
    return () => controls.stop();
  }, [inView]);
  return <span ref={ref}>{match ? text : value}</span>;
}

/* ───── 3D Tilt card on mouse hover ───── */
export function TiltCard({
  children,
  className = "",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  [k: string]: any;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const srx = useSpring(rx, { stiffness: 200, damping: 18 });
  const sry = useSpring(ry, { stiffness: 200, damping: 18 });
  const glow = useTransform(
    [gx, gy] as any,
    ([px, py]: number[]) =>
      `radial-gradient(280px circle at ${px}% ${py}%, hsl(0 0% 100% / 0.22), transparent 65%)`,
  );

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry.set((px - 0.5) * 10);
    rx.set(-(py - 0.5) * 10);
    gx.set(px * 100);
    gy.set(py * 100);
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 900, transformStyle: "preserve-3d" }}
      className={`relative ${className}`}
      {...rest}
    >
      {children}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: glow as any }}
      />
    </motion.div>
  );
}

/* ───── Scroll-reveal wrapper ───── */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ───── Orbit rings + floating dots around the hero phone ───── */
export function OrbitRings() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
      <motion.div
        className="absolute w-[420px] h-[420px] rounded-full border border-primary/15"
        animate={{ rotate: 360 }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      >
        <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[hsl(22_95%_60%)] shadow-[0_0_18px_hsl(22_95%_60%)]" />
      </motion.div>
      <motion.div
        className="absolute w-[560px] h-[560px] rounded-full border border-primary/10"
        animate={{ rotate: -360 }}
        transition={{ duration: 44, repeat: Infinity, ease: "linear" }}
      >
        <span className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[hsl(280_85%_70%)] shadow-[0_0_18px_hsl(280_85%_70%)]" />
        <span className="absolute -bottom-1.5 left-1/3 w-2 h-2 rounded-full bg-[hsl(244_85%_65%)] shadow-[0_0_18px_hsl(244_85%_65%)]" />
      </motion.div>
      <motion.div
        className="absolute w-[700px] h-[700px] rounded-full border border-primary/5"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

/* ───── Magnetic button wrapper ───── */
export function Magnetic({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 250, damping: 18 });
  const sy = useSpring(y, { stiffness: 250, damping: 18 });
  const onMove = (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect();
    x.set(((e.clientX - r.left) / r.width - 0.5) * 14);
    y.set(((e.clientY - r.top) / r.height - 0.5) * 14);
  };
  const onLeave = () => {
    x.set(0);
    y.set(0);
  };
  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ x: sx, y: sy }}
      className={`inline-block ${className}`}
    >
      {children}
    </motion.div>
  );
}
