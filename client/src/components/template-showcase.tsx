import { useRef, useEffect, useCallback } from "react";

import templateSpicegarden from "@/assets/images/template-spicegarden.png";
import templateExploreworld from "@/assets/images/template-exploreworld.png";
import templateGrandstay from "@/assets/images/template-grandstay.png";
import templateGlamstudio from "@/assets/images/template-glamstudio.png";
import templateFitzone from "@/assets/images/template-fitzone.png";
import templateKunalshah from "@/assets/images/template-kunalshah.png";
import templateKsoftsolution from "@/assets/images/template-ksoftsolution.png";
import templatecareplus from "@/assets/images/template-careplus.png";

const TEMPLATES = [
  { name: "Ksoft Solution", image: templateKsoftsolution, url: "https://visicardly.com/ksoft-solution" },
  { name: "Spice Garden", image: templateSpicegarden, url: "https://visicardly.com/spicegarden" },
  { name: "Glam Studio", image: templateGlamstudio, url: "https://visicardly.com/glamstudio" },
  { name: "FitZone", image: templateFitzone, url: "https://visicardly.com/fitzone" },
  { name: "Explore World", image: templateExploreworld, url: "https://visicardly.com/exploreworld" },
  { name: "Grand Stay", image: templateGrandstay, url: "https://visicardly.com/grandstay" },
  { name: "Kunal Shah", image: templateKunalshah, url: "https://visicardly.com/kunalshah" },
  { name: "Care Plus", image: templatecareplus, url: "https://visicardly.com/careplus" },
];

// Triplicate so we always have room in both directions
const items = [...TEMPLATES, ...TEMPLATES, ...TEMPLATES];

export default function TemplateShowcase() {
  const scrollRef = useRef<HTMLDivElement>(null);

  // All drag state in refs to avoid re-renders
  const drag = useRef({
    active: false,
    startX: 0,
    startScroll: 0,
    lastX: 0,
    lastTime: 0,
    velocity: 0,
    wasDragged: false,
  });
  const autoScroll = useRef({ paused: false, speed: 0.8 });
  const rafId = useRef<number>(0);
  const inertiaRaf = useRef<number>(0);

  // Clamp scroll to stay in the middle third so we always have buffer on both sides
  const clampScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const third = el.scrollWidth / 3;
    if (el.scrollLeft < third * 0.1) {
      el.scrollLeft += third;
    } else if (el.scrollLeft > third * 2.1) {
      el.scrollLeft -= third;
    }
  }, []);

  // Auto-scroll loop
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Start in the middle third
    el.scrollLeft = el.scrollWidth / 3;

    const step = () => {
      if (!autoScroll.current.paused && !drag.current.active && el) {
        el.scrollLeft += autoScroll.current.speed;
        clampScroll();
      }
      rafId.current = requestAnimationFrame(step);
    };

    rafId.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId.current);
  }, [clampScroll]);

  // --- Mouse drag ---
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    cancelAnimationFrame(inertiaRaf.current);
    autoScroll.current.paused = true;
    drag.current = {
      active: true,
      startX: e.pageX,
      startScroll: el.scrollLeft,
      lastX: e.pageX,
      lastTime: Date.now(),
      velocity: 0,
      wasDragged: false,
    };
    el.style.cursor = "grabbing";
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drag.current.active) return;
    const el = scrollRef.current;
    if (!el) return;

    const now = Date.now();
    const dt = now - drag.current.lastTime || 1;
    drag.current.velocity = (drag.current.lastX - e.pageX) / dt;
    drag.current.lastX = e.pageX;
    drag.current.lastTime = now;

    const dx = e.pageX - drag.current.startX;
    if (Math.abs(dx) > 4) drag.current.wasDragged = true;
    el.scrollLeft = drag.current.startScroll - dx;
    clampScroll();
  }, [clampScroll]);

  const onMouseUp = useCallback(() => {
    if (!drag.current.active) return;
    const el = scrollRef.current;
    drag.current.active = false;
    if (el) el.style.cursor = "grab";
    startInertia();
  }, []);

  const onMouseLeave = useCallback(() => {
    if (!drag.current.active) return;
    const el = scrollRef.current;
    drag.current.active = false;
    if (el) el.style.cursor = "grab";
    startInertia();
  }, []);

  // --- Touch drag ---
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    cancelAnimationFrame(inertiaRaf.current);
    autoScroll.current.paused = true;
    const touch = e.touches[0];
    drag.current = {
      active: true,
      startX: touch.pageX,
      startScroll: el.scrollLeft,
      lastX: touch.pageX,
      lastTime: Date.now(),
      velocity: 0,
      wasDragged: false,
    };
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!drag.current.active) return;
    const el = scrollRef.current;
    if (!el) return;

    const touch = e.touches[0];
    const now = Date.now();
    const dt = now - drag.current.lastTime || 1;
    drag.current.velocity = (drag.current.lastX - touch.pageX) / dt;
    drag.current.lastX = touch.pageX;
    drag.current.lastTime = now;

    const dx = touch.pageX - drag.current.startX;
    if (Math.abs(dx) > 4) drag.current.wasDragged = true;
    el.scrollLeft = drag.current.startScroll - dx;
    clampScroll();
  }, [clampScroll]);

  const onTouchEnd = useCallback(() => {
    drag.current.active = false;
    startInertia();
  }, []);

  // Inertia after release — decelerates naturally
  function startInertia() {
    const el = scrollRef.current;
    if (!el) return;

    let velocity = drag.current.velocity * 16; // px per frame (~60fps)
    const friction = 0.92;

    const tick = () => {
      if (Math.abs(velocity) < 0.3) {
        autoScroll.current.paused = false;
        return;
      }
      el.scrollLeft += velocity;
      clampScroll();
      velocity *= friction;
      inertiaRaf.current = requestAnimationFrame(tick);
    };

    inertiaRaf.current = requestAnimationFrame(tick);
  }

  return (
    <section className="py-24 pt-4 px-0 overflow-hidden">
      <div className="max-w-5xl mx-auto text-center mb-12 px-6">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">User Showcase</p>
        <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">
          See how our users are using{" "}
          <span className="landing-gradient-text">VisiCardly</span>
        </h2>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Real profiles built by real businesses and professionals on VisiCardly.
        </p>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-hidden cursor-grab px-6 select-none"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {items.map((template, i) => (
          <a
            key={`${template.name}-${i}`}
            href={template.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 group"
            onClick={(e) => { if (drag.current.wasDragged) e.preventDefault(); }}
            draggable={false}
          >
            <div className="w-[260px] h-[460px] rounded-2xl overflow-hidden border border-border bg-card shadow-sm transition-transform duration-300 group-hover:scale-[1.03] group-hover:shadow-lg">
              <img
                src={template.image}
                alt={`${template.name} template`}
                className="w-full h-full object-cover object-top"
                loading="lazy"
                draggable={false}
              />
            </div>
            <p className="text-sm font-semibold text-foreground text-center mt-3">{template.name}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
