// Starter catalogue for the storefront: same structure as a classic stencil shop (calligraphy, mandala, floral,
// carpet, furniture, fabric, wall décor, supplies). Names, copy and prices are original; photos are free-licence
// (CC0 / public domain) images saved in /public/catalog — see /public/catalog/credits.json.

export type Group = "calligraphy" | "mandala" | "floral" | "birds" | "pattern" | "border" | "tribal" | "carpet" | "furniture" | "fabric" | "wall" | "supplies";

export type CollectionDef = { slug: string; name: string; description: string };
export type ProductDef = { name: string; collection: string; group: Group; price: number; kind?: "stencil" | "single"; blurb: string };

/** Every menu entry gets a collection (parents like "Calligraphy Stencils" list their sub-collections' products). */
export const COLLECTIONS: CollectionDef[] = [
  { slug: "all-calligraphy-stencils", name: "All Calligraphy Stencils", description: "Islamic and Arabic calligraphy stencils for walls, canvas, wood and glass — each design checked against the original text." },
  { slug: "entire-surah", name: "Entire Surah", description: "Complete surahs laid out as one stencil, ready to paint." },
  { slug: "tasbih", name: "Tasbih", description: "Tasbih and dhikr calligraphy stencils." },
  { slug: "quran-verses", name: "Quran Verses", description: "Popular Quran verses in graceful calligraphy." },
  { slug: "sacred-names", name: "Sacred Names", description: "Allah, Muhammad and the Beautiful Names in classic scripts." },
  { slug: "ayat-ul-kursi", name: "Ayat ul Kursi", description: "Ayat ul Kursi in circular, panel and framed layouts." },
  { slug: "4-qul", name: "4 Qul", description: "The four Quls as single panels and sets." },
  { slug: "quranic-panels", name: "Quranic Panels", description: "Arch, strip and door-frame panels with Quranic text." },
  { slug: "kaaba-inspired-calligraphy", name: "Kaaba-Inspired Calligraphy", description: "Patterns and calligraphy inspired by the Kiswa." },
  { slug: "wall-and-canvas-stencils", name: "Wall & Canvas Stencils", description: "Reusable stencils for feature walls and canvas art." },
  { slug: "mandala-designs", name: "Mandala Designs", description: "Radial mandala stencils with built-in bridges for clean cuts." },
  { slug: "floral-and-motif-designs", name: "Floral & Motif Designs", description: "Botanical motifs, vines and corner florals." },
  { slug: "animals-and-birds", name: "Animals & Birds", description: "Birds, deer and butterflies for nurseries and feature walls." },
  { slug: "pattern-and-texture", name: "Pattern & Texture", description: "Allover repeats — lattices, diamonds and damask." },
  { slug: "borders-and-corners", name: "Borders & Corners", description: "Border strips and corner flourishes." },
  { slug: "stencil-packs", name: "Stencil Packs", description: "Multi-design packs at a lower price." },
  { slug: "tribal-and-ancient-art", name: "Tribal & Ancient Art", description: "Tribal, kilim and ancient-art inspired designs." },
  { slug: "carpet-design-stencils", name: "Carpet Design Stencils", description: "Elegant designs inspired by traditional rugs, ideal for canvas, walls and furniture." },
  { slug: "all-art-and-craft-stencils", name: "All Art & Craft Stencils", description: "Stencils for furniture, fabric and craft projects." },
  { slug: "furniture-stencils", name: "Furniture Stencils", description: "Sized for small DIY projects — stencil your own custom furniture design." },
  { slug: "fabric-stencils", name: "Fabric Stencils", description: "Stencils for tote bags, cushions, tees and table linen." },
  { slug: "acrylic-wall-decoration", name: "Acrylic Wall Decoration", description: "Ready-to-hang acrylic wall art and decals." },
  { slug: "art-supplies", name: "Art Supplies", description: "Brushes, paint, rollers and adhesive for stencilling." },
];

const S = (collection: string, group: Group, price: number, names: string[], blurb: string): ProductDef[] =>
  names.map((name) => ({ name, collection, group, price, blurb }));

export const PRODUCTS: ProductDef[] = [
  ...S("ayat-ul-kursi", "calligraphy", 1800, ["Ayat ul Kursi Circular Calligraphy Stencil", "Ayat ul Kursi Rectangle Panel Stencil", "Ayat ul Kursi Floral Frame Stencil", "Ayat ul Kursi Kufic Square Stencil"], "Ayat ul Kursi laid out for a blessed focal wall, prayer room or canvas."),
  ...S("4-qul", "calligraphy", 2200, ["4 Qul Four-Panel Calligraphy Stencil Set", "4 Qul Motif Grid Stencil", "Surah Ikhlas Calligraphy Stencil"], "The Quls in clean calligraphy, built to be painted again and again."),
  ...S("tasbih", "calligraphy", 1500, ["Tasbih Beads Circle Calligraphy Stencil", "SubhanAllah Alhamdulillah Allahu Akbar Stencil", "Tasbih Fatima Stencil Panel"], "Dhikr calligraphy that looks beautiful above a bed, desk or doorway."),
  ...S("quran-verses", "calligraphy", 1700, ["Surah Rahman Verse Wall Stencil", "Rabbi Zidni Ilma Verse Stencil", "Fabi Ayyi Ala Calligraphy Stencil", "Verse of Light Calligraphy Stencil"], "A well-loved Quran verse in flowing script."),
  ...S("sacred-names", "calligraphy", 1600, ["Allah and Muhammad Name Pair Stencil", "Asma ul Husna Circular Stencil", "Bismillah Thuluth Calligraphy Stencil", "Ya Allah Square Calligraphy Stencil"], "Sacred names in classic Thuluth and Kufic styles."),
  ...S("entire-surah", "calligraphy", 2600, ["Surah Fatiha Full Calligraphy Stencil", "Surah Ikhlas Full Panel Stencil", "Surah Falaq Full Panel Stencil"], "The complete surah as one stencil — large, detailed and ready to paint."),
  ...S("quranic-panels", "calligraphy", 2400, ["Quranic Arch Panel Stencil", "Long Quranic Verse Strip Stencil", "Door-Frame Quranic Border Stencil"], "Panel layouts made for arches, door frames and long walls."),
  ...S("kaaba-inspired-calligraphy", "calligraphy", 2000, ["Kaaba Kiswa-Inspired Pattern Stencil", "Kaaba Door Arch Calligraphy Stencil", "Golden Belt Style Calligraphy Stencil"], "Inspired by the Kiswa — gold-on-black looks beautiful with metallic paint."),
  ...S("mandala-designs", "mandala", 1400, ["Lotus Bloom Mandala Stencil", "Sunburst Mandala Stencil", "Hexa Petal Mandala Stencil", "Eight-Point Star Mandala Stencil", "Peacock Feather Mandala Stencil", "Wave Ring Mandala Stencil"], "A detailed mandala with built-in bridges so every petal stays crisp."),
  ...S("floral-and-motif-designs", "floral", 1200, ["Wild Rose Vine Stencil", "Tulip Garden Motif Stencil", "Jasmine Trellis Stencil", "Paisley Bloom Corner Stencil", "Cherry Blossom Branch Stencil", "Marigold Repeat Stencil"], "A graceful floral motif for walls, cabinets and canvas."),
  ...S("animals-and-birds", "birds", 1300, ["Peacock Pair Stencil", "Flying Cranes Stencil", "Deer in the Forest Stencil", "Butterfly Swarm Stencil"], "A hand-drawn animal design for nurseries and feature walls."),
  ...S("pattern-and-texture", "pattern", 1200, ["Moroccan Lattice Allover Stencil", "Diamond Trellis Stencil", "Hex Tile Repeat Stencil", "Damask Classic Stencil", "Chevron Wave Stencil"], "An allover repeat that turns a plain wall into wallpaper — without the paste."),
  ...S("borders-and-corners", "border", 900, ["Scroll Border Strip Stencil", "Corner Flourish Set Stencil", "Greek Key Border Stencil", "Arabesque Frame Stencil"], "Finish a room with a border or corner detail."),
  ...S("stencil-packs", "mandala", 3200, ["Starter Wall Stencil Pack", "Calligraphy Mini Pack (6 designs)", "Floral Corner Pack"], "Several matching designs in one pack — better value than buying singly."),
  ...S("tribal-and-ancient-art", "tribal", 1300, ["Aztec Step Pattern Stencil", "Tribal Sun Totem Stencil", "Ancient Cave Art Animals Stencil", "Kilim Diamond Border Stencil"], "Bold tribal and ancient-art inspired shapes."),
  ...S("carpet-design-stencils", "carpet", 2000, ["Persian Medallion Carpet Stencil", "Tabriz Garden Carpet Stencil", "Isfahan Arabesque Carpet Stencil", "Kashan Border Carpet Stencil", "Qom Floral Carpet Stencil", "Heriz Geometric Carpet Stencil", "Bukhara Gul Carpet Stencil", "Kilim Stripe Carpet Stencil"], "Inspired by classic rugs — paint a carpet look on canvas, a wall or a floor."),
  ...S("furniture-stencils", "furniture", 700, ["Dresser Drawer Front Motif Stencil", "Table Top Medallion Stencil", "Chair Back Floral Stencil", "Cabinet Door Lattice Stencil", "Headboard Scroll Stencil"], "A small-format stencil sized for DIY furniture makeovers."),
  ...S("fabric-stencils", "fabric", 600, ["Tote Bag Paisley Stencil", "Cushion Cover Block Print Stencil", "Table Runner Border Stencil", "T-Shirt Mandala Chest Stencil", "Curtain Hem Border Stencil"], "Use with fabric paint on cotton, linen and canvas."),
  ...S("acrylic-wall-decoration", "wall", 2200, ["Acrylic Mirror Flower Wall Set", "Acrylic Calligraphy Wall Art Panel", "Acrylic Butterfly Wall Decals", "Acrylic Moon and Stars Set", "Acrylic Tree of Life Wall Art"], "Ready-to-hang acrylic décor — peel, stick and enjoy."),
  ...[
    ["Stencil Brush Set (6 pcs)", 950], ["Acrylic Paint Set (12 colours)", 1800], ["Foam Roller Kit", 750], ["Repositionable Spray Adhesive", 1100], ["Painter's Masking Tape (3 pack)", 650], ["Mixing Palette & Knife Set", 550],
  ].map(([name, price]) => ({ name: name as string, collection: "art-supplies", group: "supplies" as Group, price: price as number, kind: "single" as const, blurb: "A reliable supply for every stencilling project." })),
];

/** Sizes of a stencil (inches) and how the price grows with area. */
export const SIZES: { label: string; w: number; h: number; mult: number }[] = [
  { label: "12x12 inches (LxW)", w: 305, h: 305, mult: 1 },
  { label: "18x18 inches (LxW)", w: 457, h: 457, mult: 1.9 },
  { label: "24x24 inches (LxW)", w: 610, h: 610, mult: 3.2 },
  { label: "36x36 inches (LxW)", w: 914, h: 914, mult: 6.4 },
];
