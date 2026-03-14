export type QRStyle = "circle" | "square" | "stripe" | "full" | "gradient" | "elegant" | "badge" | "modern" | "ticket" | "heart" | "bubble" | "tag" | "poster";

export type QRTemplateCategory = "all" | "business" | "social" | "events" | "food" | "feedback" | "health" | "general";

export interface QRTemplate {
  id: string;
  name: string;
  category: Exclude<QRTemplateCategory, "all">;
  style: QRStyle;
  color: string;
  color2: string;
  borderRadius: number;
  borderWidth: number;
  scanText: boolean;
  icon: string;
}

export const QR_TEMPLATES: QRTemplate[] = [
  // Business
  { id: "corporate-blue", name: "Corporate Blue", category: "business", style: "elegant", color: "#1B3A6B", color2: "#1B3A6B", borderRadius: 12, borderWidth: 3, scanText: true, icon: "🏢" },
  { id: "tech-startup", name: "Tech Startup", category: "business", style: "modern", color: "#2563EB", color2: "#2563EB", borderRadius: 20, borderWidth: 2, scanText: true, icon: "🚀" },
  { id: "executive-black", name: "Executive Black", category: "business", style: "square", color: "#1A1A2E", color2: "#1A1A2E", borderRadius: 4, borderWidth: 3, scanText: false, icon: "💼" },
  { id: "gold-premium", name: "Gold Premium", category: "business", style: "elegant", color: "#B8860B", color2: "#DAA520", borderRadius: 14, borderWidth: 3, scanText: true, icon: "✨" },

  // Social
  { id: "social-neon", name: "Social Neon", category: "social", style: "gradient", color: "#E040FB", color2: "#7C4DFF", borderRadius: 20, borderWidth: 4, scanText: true, icon: "🌈" },
  { id: "sunset-vibes", name: "Sunset Vibes", category: "social", style: "gradient", color: "#FF6B6B", color2: "#FF8E53", borderRadius: 18, borderWidth: 3, scanText: true, icon: "🌅" },
  { id: "ocean-wave", name: "Ocean Wave", category: "social", style: "gradient", color: "#0EA5E9", color2: "#06B6D4", borderRadius: 22, borderWidth: 3, scanText: false, icon: "🌊" },
  { id: "instagram-pink", name: "Instagram Pink", category: "social", style: "modern", color: "#E1306C", color2: "#F77737", borderRadius: 20, borderWidth: 2, scanText: true, icon: "📸" },

  // Events
  { id: "wedding-gold", name: "Wedding Gold", category: "events", style: "elegant", color: "#C9A961", color2: "#C9A961", borderRadius: 16, borderWidth: 3, scanText: false, icon: "💍" },
  { id: "night-club", name: "Night Club", category: "events", style: "full", color: "#7C3AED", color2: "#7C3AED", borderRadius: 16, borderWidth: 0, scanText: true, icon: "🎵" },
  { id: "christmas", name: "Christmas", category: "events", style: "badge", color: "#C41E3A", color2: "#2E8B57", borderRadius: 20, borderWidth: 4, scanText: true, icon: "🎄" },
  { id: "birthday-party", name: "Birthday Party", category: "events", style: "ticket", color: "#FF6F61", color2: "#FF6F61", borderRadius: 16, borderWidth: 3, scanText: true, icon: "🎂" },
  { id: "conference", name: "Conference", category: "events", style: "badge", color: "#334155", color2: "#334155", borderRadius: 16, borderWidth: 3, scanText: true, icon: "🎤" },

  // Food & Dining
  { id: "restaurant-warm", name: "Restaurant Warm", category: "food", style: "badge", color: "#C2571A", color2: "#C2571A", borderRadius: 20, borderWidth: 4, scanText: true, icon: "🍽️" },
  { id: "coffee-shop", name: "Coffee Shop", category: "food", style: "ticket", color: "#6F4E37", color2: "#6F4E37", borderRadius: 16, borderWidth: 3, scanText: true, icon: "☕" },
  { id: "pizza-red", name: "Pizza Place", category: "food", style: "circle", color: "#DC2626", color2: "#DC2626", borderRadius: 0, borderWidth: 4, scanText: true, icon: "🍕" },
  { id: "sushi-zen", name: "Sushi Bar", category: "food", style: "stripe", color: "#1F2937", color2: "#1F2937", borderRadius: 8, borderWidth: 3, scanText: false, icon: "🍣" },

  // Feedback
  { id: "feedback-green", name: "Feedback Green", category: "feedback", style: "modern", color: "#16A34A", color2: "#16A34A", borderRadius: 20, borderWidth: 2, scanText: true, icon: "💬" },
  { id: "review-star", name: "Review Star", category: "feedback", style: "badge", color: "#EAB308", color2: "#EAB308", borderRadius: 20, borderWidth: 3, scanText: true, icon: "⭐" },
  { id: "survey-purple", name: "Survey Purple", category: "feedback", style: "gradient", color: "#8B5CF6", color2: "#A855F7", borderRadius: 16, borderWidth: 3, scanText: true, icon: "📋" },

  // Health
  { id: "healthcare", name: "Healthcare", category: "health", style: "circle", color: "#0D9488", color2: "#0D9488", borderRadius: 0, borderWidth: 3, scanText: true, icon: "🏥" },
  { id: "pharmacy", name: "Pharmacy", category: "health", style: "modern", color: "#059669", color2: "#059669", borderRadius: 18, borderWidth: 2, scanText: true, icon: "💊" },
  { id: "wellness-calm", name: "Wellness Calm", category: "health", style: "elegant", color: "#5EADB0", color2: "#5EADB0", borderRadius: 14, borderWidth: 2, scanText: false, icon: "🧘" },

  // General
  { id: "minimal-black", name: "Minimal Black", category: "general", style: "square", color: "#000000", color2: "#000000", borderRadius: 0, borderWidth: 2, scanText: false, icon: "⬛" },
  { id: "clean-white", name: "Clean Outline", category: "general", style: "square", color: "#6B7280", color2: "#6B7280", borderRadius: 8, borderWidth: 1, scanText: false, icon: "⬜" },
  { id: "retro-orange", name: "Retro Orange", category: "general", style: "ticket", color: "#EA580C", color2: "#EA580C", borderRadius: 12, borderWidth: 3, scanText: true, icon: "🟧" },

  // Heart shapes
  { id: "love-red", name: "Love Red", category: "events", style: "heart", color: "#E11D48", color2: "#E11D48", borderRadius: 0, borderWidth: 4, scanText: true, icon: "❤️" },
  { id: "health-heart", name: "Health Heart", category: "health", style: "heart", color: "#0284C7", color2: "#0891B2", borderRadius: 0, borderWidth: 4, scanText: true, icon: "💙" },
  { id: "valentine", name: "Valentine", category: "events", style: "heart", color: "#EC4899", color2: "#F472B6", borderRadius: 0, borderWidth: 3, scanText: true, icon: "💕" },

  // Speech bubble shapes
  { id: "chat-blue", name: "Chat Blue", category: "social", style: "bubble", color: "#2563EB", color2: "#2563EB", borderRadius: 20, borderWidth: 3, scanText: true, icon: "💬" },
  { id: "promo-yellow", name: "Promo Yellow", category: "business", style: "bubble", color: "#EAB308", color2: "#F59E0B", borderRadius: 20, borderWidth: 4, scanText: true, icon: "📢" },
  { id: "info-bubble", name: "Info Bubble", category: "general", style: "bubble", color: "#6366F1", color2: "#6366F1", borderRadius: 16, borderWidth: 3, scanText: true, icon: "ℹ️" },
  { id: "real-estate", name: "Real Estate", category: "business", style: "bubble", color: "#D97706", color2: "#D97706", borderRadius: 18, borderWidth: 4, scanText: true, icon: "🏠" },

  // Tag shapes
  { id: "pet-tag", name: "Pet Tag", category: "general", style: "tag", color: "#FACC15", color2: "#EAB308", borderRadius: 0, borderWidth: 4, scanText: true, icon: "🐾" },
  { id: "product-tag", name: "Product Tag", category: "business", style: "tag", color: "#10B981", color2: "#10B981", borderRadius: 0, borderWidth: 3, scanText: true, icon: "🏷️" },
  { id: "vip-tag", name: "VIP Tag", category: "events", style: "tag", color: "#7C3AED", color2: "#7C3AED", borderRadius: 0, borderWidth: 4, scanText: true, icon: "👑" },
];

export const QR_TEMPLATE_CATEGORIES: { value: QRTemplateCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "business", label: "Business" },
  { value: "social", label: "Social" },
  { value: "events", label: "Events" },
  { value: "food", label: "Food & Dining" },
  { value: "feedback", label: "Feedback" },
  { value: "health", label: "Health" },
  { value: "general", label: "General" },
];
