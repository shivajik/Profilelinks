export interface DefaultServiceItem {
  title: string;
  description?: string;
  price?: string;
}

export const DEFAULT_SALON_SERVICES: DefaultServiceItem[] = [
  { title: "Haircut & Styling", description: "Professional haircut and blow-dry styling for all hair types", price: "₹499" },
  { title: "Hair Coloring", description: "Full hair color with premium ammonia-free products", price: "₹1,999" },
  { title: "Hair Spa Treatment", description: "Deep conditioning hair spa for smooth, shiny hair", price: "₹999" },
  { title: "Keratin Treatment", description: "Smoothing keratin treatment for frizz-free hair", price: "₹3,499" },
  { title: "Bridal Makeup", description: "Complete bridal makeup with HD finish and accessories", price: "₹7,999" },
  { title: "Party Makeup", description: "Glamorous party look with professional makeup", price: "₹2,499" },
  { title: "Facial Treatment", description: "Deep cleansing facial with skin-type analysis", price: "₹799" },
  { title: "Manicure & Pedicure", description: "Classic manicure and pedicure with nail art options", price: "₹599" },
  { title: "Waxing (Full Body)", description: "Full body waxing with soothing post-wax care", price: "₹1,499" },
  { title: "Threading & Shaping", description: "Eyebrow threading and facial hair removal", price: "₹149" },
  { title: "Head Massage", description: "Relaxing oil head massage for stress relief", price: "₹399" },
  { title: "Nail Extensions", description: "Gel or acrylic nail extensions with design options", price: "₹1,299" },
  { title: "Mehndi / Henna", description: "Beautiful henna designs for hands and feet", price: "₹999" },
  { title: "Skin Brightening Facial", description: "Advanced facial for glowing, radiant skin", price: "₹1,299" },
  { title: "Beard Grooming", description: "Beard trim, shaping, and conditioning treatment", price: "₹299" },
];
