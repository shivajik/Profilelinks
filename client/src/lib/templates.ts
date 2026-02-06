export const TEMPLATES = [
  {
    id: "minimal",
    name: "Minimal",
    bg: "bg-[#f5f0eb]",
    cardBg: "bg-[#e8dfd6]",
    textColor: "text-[#4a3f35]",
    cardTextColor: "text-[#4a3f35]",
    accent: "#8b7355",
    description: "Clean and simple",
  },
  {
    id: "ocean",
    name: "Ocean",
    bg: "bg-gradient-to-b from-[#0f2027] via-[#203a43] to-[#2c5364]",
    cardBg: "bg-white/15",
    textColor: "text-white",
    cardTextColor: "text-white",
    accent: "#64ffda",
    description: "Deep blue vibes",
  },
  {
    id: "sunset",
    name: "Sunset",
    bg: "bg-gradient-to-b from-[#f093fb] via-[#f5576c] to-[#fda085]",
    cardBg: "bg-white/20",
    textColor: "text-white",
    cardTextColor: "text-white",
    accent: "#fff",
    description: "Warm gradients",
  },
  {
    id: "dark",
    name: "Midnight",
    bg: "bg-[#0a0a0a]",
    cardBg: "bg-[#1a1a1a]",
    textColor: "text-white",
    cardTextColor: "text-gray-200",
    accent: "#6C5CE7",
    description: "Sleek dark mode",
  },
  {
    id: "forest",
    name: "Forest",
    bg: "bg-gradient-to-b from-[#1a3c2a] to-[#2d5a3e]",
    cardBg: "bg-white/15",
    textColor: "text-white",
    cardTextColor: "text-white",
    accent: "#4ade80",
    description: "Nature inspired",
  },
  {
    id: "lavender",
    name: "Lavender",
    bg: "bg-gradient-to-b from-[#e8dff5] to-[#fce4ec]",
    cardBg: "bg-white/60",
    textColor: "text-[#4a3068]",
    cardTextColor: "text-[#4a3068]",
    accent: "#7c3aed",
    description: "Soft purple tones",
  },
];

export type Template = (typeof TEMPLATES)[0];

export function getTemplate(id: string | null | undefined): Template {
  return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
}
