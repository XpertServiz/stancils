export const STUDIO_USES: Record<string, { title: string; h1: string; intro: string; material?: string; faqs: [string, string][] }> = {
  logo: {
    title: "Custom Logo Stencils — Upload Your Logo",
    h1: "Custom logo stencils",
    intro: "Turn your business logo into a reusable stencil for walls, signage, pavements, packaging and merch. Bridges are added automatically so every letter stays intact.",
    faqs: [["What file should I upload?", "A PNG, JPG or SVG with a clear, high-contrast logo works best. Black on white is ideal."], ["Can you make it bigger than 120 cm?", "Yes — message us and we'll split it into registered panels."]],
  },
  coffee: {
    title: "Custom Coffee Stencils with Your Café Logo",
    h1: "Custom coffee & latte stencils",
    intro: "Put your café logo on every cappuccino. Choose food-safe PET or dishwasher-safe stainless steel, sized for cups and mugs.",
    material: "STEEL",
    faqs: [["What size should I choose?", "9 cm suits most cappuccino cups; 11 cm suits large mugs."], ["Are they food-safe?", "Yes — food-grade PET and 304 stainless steel are both food-safe."]],
  },
  cookie: {
    title: "Custom Cookie & Cake Stencils",
    h1: "Custom cookie & cake stencils",
    intro: "Monograms, names, logos and messages for royal icing, airbrush and dusting — cut from food-grade PET.",
    material: "PET",
    faqs: [["Can I use them with royal icing?", "Yes — use a scraper and a stencil holder for crisp results."]],
  },
  signage: {
    title: "Custom Sign & Pavement Stencils",
    h1: "Custom sign & pavement stencils",
    intro: "Heavy-duty 14 mil stencils for parking bays, warehouse floors, walls and doors. Any wording, any size up to 120 cm.",
    material: "MYLAR",
    faqs: [["Which paint should I use?", "Road-marking or floor paint for concrete and asphalt; spray paint for walls and metal."]],
  },
  "wall-art": {
    title: "Custom Wall Art Stencils",
    h1: "Custom wall art stencils",
    intro: "Turn a sketch, quote or photo into a wall stencil. Preview it on a wall before you order.",
    material: "MYLAR",
    faqs: [["Can I use a photo?", "Yes — the Studio converts it to a two-tone stencil. High-contrast photos work best."]],
  },
};
