import { useRef, useEffect, useState } from "react";

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

export default function TemplateShowcase() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, scrollLeft: 0 });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let animationId: number;
    let scrollSpeed = 0.8;

    const step = () => {
      if (!isPaused && !isDragging && el) {
        el.scrollLeft += scrollSpeed;
        if (el.scrollLeft >= el.scrollWidth / 2) {
          el.scrollLeft = 0;
        }
      }
      animationId = requestAnimationFrame(step);
    };

    animationId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationId);
  }, [isPaused, isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    setIsDragging(true);
    setIsPaused(true);
    dragStart.current = { x: e.pageX, scrollLeft: el.scrollLeft };
    el.style.cursor = "grabbing";
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const el = scrollRef.current;
    if (!el) return;
    const dx = e.pageX - dragStart.current.x;
    el.scrollLeft = dragStart.current.scrollLeft - dx;
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const el = scrollRef.current;
    if (el) el.style.cursor = "grab";
  };

  // Duplicate templates for infinite scroll effect
  const items = [...TEMPLATES, ...TEMPLATES];

  return (
    <section className="py-24 pt-4 px-0 overflow-hidden">
      <div className="max-w-5xl mx-auto text-center mb-12 px-6">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Templates</p>
        <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">
          Start with a{" "}
          <span className="landing-gradient-text">template</span>
        </h2>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Choose a professionally designed template and make it your own.
        </p>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-hidden cursor-grab px-6 select-none"
        onMouseEnter={() => { if (!isDragging) setIsPaused(true); }}
        onMouseLeave={() => { setIsPaused(false); handleMouseUp(); }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {items.map((template, i) => (
          <a
            key={`${template.name}-${i}`}
            href={template.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 group"
            onClick={(e) => { if (isDragging) e.preventDefault(); }}
            draggable={false}
          >
            <div className="w-[260px] h-[460px] rounded-2xl overflow-hidden border border-border bg-card shadow-sm transition-transform duration-300 group-hover:scale-[1.03] group-hover:shadow-lg">
              <img
                src={template.image}
                alt={`${template.name} template`}
                className="w-full h-full object-cover object-top"
                loading="lazy"
              />
            </div>
            <p className="text-sm font-semibold text-foreground text-center mt-3">{template.name}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
