export interface DefaultMenuItem {
  name: string;
  description?: string;
  price?: string;
}

export interface DefaultMenuCategory {
  name: string;
  description?: string;
  items: DefaultMenuItem[];
}

export const DEFAULT_MENU_CATEGORIES: DefaultMenuCategory[] = [
  {
    name: "Appetizers",
    description: "Start your meal with our delicious appetizers",
    items: [
      { name: "Caesar Salad", description: "Fresh romaine lettuce with parmesan and croutons", price: "₹249" },
      { name: "Bruschetta", description: "Toasted bread with tomatoes, garlic and basil", price: "₹199" },
      { name: "Soup of the Day", description: "Chef's special daily soup", price: "₹179" },
      { name: "Spring Rolls", description: "Crispy vegetable spring rolls with sweet chili sauce", price: "₹229" },
      { name: "Garlic Bread", description: "Freshly baked bread with garlic butter", price: "₹149" },
    ],
  },
  {
    name: "Main Course",
    description: "Our signature main dishes",
    items: [
      { name: "Grilled Chicken", description: "Herb-marinated grilled chicken with seasonal vegetables", price: "₹449" },
      { name: "Pasta Arrabbiata", description: "Penne pasta in spicy tomato sauce", price: "₹399" },
      { name: "Margherita Pizza", description: "Classic pizza with mozzarella, tomato and basil", price: "₹349" },
      { name: "Fish & Chips", description: "Beer-battered fish with crispy fries and tartar sauce", price: "₹499" },
      { name: "Paneer Tikka", description: "Spiced cottage cheese grilled in tandoor", price: "₹379" },
      { name: "Butter Chicken", description: "Tender chicken in creamy tomato-butter sauce", price: "₹429" },
    ],
  },
  {
    name: "Desserts",
    description: "Sweet endings to your meal",
    items: [
      { name: "Tiramisu", description: "Classic Italian coffee-flavored dessert", price: "₹299" },
      { name: "Chocolate Brownie", description: "Warm chocolate brownie with vanilla ice cream", price: "₹249" },
      { name: "Gulab Jamun", description: "Soft milk dumplings in sugar syrup", price: "₹179" },
      { name: "Ice Cream Sundae", description: "Three scoops with chocolate sauce and nuts", price: "₹229" },
    ],
  },
  {
    name: "Beverages",
    description: "Refreshing drinks and beverages",
    items: [
      { name: "Fresh Lime Soda", description: "Lime juice with soda water", price: "₹99" },
      { name: "Mango Lassi", description: "Creamy yogurt-based mango drink", price: "₹149" },
      { name: "Cold Coffee", description: "Iced coffee with cream", price: "₹179" },
      { name: "Masala Chai", description: "Traditional Indian spiced tea", price: "₹79" },
      { name: "Fresh Juice", description: "Orange, watermelon, or pineapple", price: "₹129" },
    ],
  },
  {
    name: "Sides",
    description: "Perfect additions to your meal",
    items: [
      { name: "French Fries", description: "Crispy golden potato fries", price: "₹149" },
      { name: "Onion Rings", description: "Beer-battered crispy onion rings", price: "₹179" },
      { name: "Coleslaw", description: "Fresh cabbage and carrot slaw", price: "₹99" },
      { name: "Naan Bread", description: "Freshly baked Indian flatbread", price: "₹69" },
      { name: "Steamed Rice", description: "Fluffy basmati rice", price: "₹99" },
    ],
  },
];
