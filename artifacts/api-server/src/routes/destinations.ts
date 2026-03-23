import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

const DESTINATIONS = [
  {
    id: "lisbon",
    city: "Lisbon",
    country: "Portugal",
    description: "A gentle, sun-drenched capital with trams, pastel architecture, and coastal breezes. Very walkable with many benches and cafes.",
    seniorFriendlyScore: 8.5,
    highlights: ["Historic trams", "Belém Tower", "Pastéis de Belém", "Sintra day trip"],
    bestMonths: ["April", "May", "September", "October"],
    terrain: "Hilly but manageable, many flat areas near the waterfront",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "rome",
    city: "Rome",
    country: "Italy",
    description: "The Eternal City offers world-class history, incredible food, and warm hospitality. Cobblestones in historic areas but most major sights are accessible.",
    seniorFriendlyScore: 7.5,
    highlights: ["Colosseum", "Vatican Museums", "Trevi Fountain", "Trastevere"],
    bestMonths: ["April", "May", "October", "November"],
    terrain: "Mostly flat with some cobblestones in historic center",
    imageUrl: "https://images.unsplash.com/photo-1531572753322-ad063cecc140?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "kyoto",
    city: "Kyoto",
    country: "Japan",
    description: "Japan's cultural heart with thousands of temples, serene bamboo groves, and exceptional cuisine. Excellent public transport makes it very accessible.",
    seniorFriendlyScore: 9.0,
    highlights: ["Fushimi Inari", "Arashiyama Bamboo Grove", "Kinkakuji", "Gion District"],
    bestMonths: ["March", "April", "October", "November"],
    terrain: "Mostly flat, excellent lifts and accessible facilities",
    imageUrl: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "amsterdam",
    city: "Amsterdam",
    country: "Netherlands",
    description: "A compact, beautiful canal city with world-class museums and a relaxed pace. Very flat terrain makes it ideal for senior travelers.",
    seniorFriendlyScore: 8.8,
    highlights: ["Rijksmuseum", "Anne Frank House", "Canal Cruises", "Vondelpark"],
    bestMonths: ["April", "May", "August", "September"],
    terrain: "Extremely flat, excellent accessibility throughout",
    imageUrl: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "barcelona",
    city: "Barcelona",
    country: "Spain",
    description: "Vibrant Catalan capital with stunning Gaudí architecture, world-class food, and a warm Mediterranean climate. Most attractions have excellent accessibility.",
    seniorFriendlyScore: 8.2,
    highlights: ["Sagrada Família", "Park Güell", "Las Ramblas", "Gothic Quarter"],
    bestMonths: ["April", "May", "October", "November"],
    terrain: "Mostly flat along the coast, hilly in some areas",
    imageUrl: "https://images.unsplash.com/photo-1560969184-10fe8719e047?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "vienna",
    city: "Vienna",
    country: "Austria",
    description: "Imperial elegance meets world-class music and coffee culture. Wide boulevards, excellent public transport, and many sit-down cafes make this senior-friendly.",
    seniorFriendlyScore: 9.2,
    highlights: ["Schönbrunn Palace", "St. Stephen's Cathedral", "Vienna State Opera", "Belvedere"],
    bestMonths: ["April", "May", "September", "October"],
    terrain: "Very flat, excellent public transport with full accessibility",
    imageUrl: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "prague",
    city: "Prague",
    country: "Czech Republic",
    description: "A fairytale city with stunning medieval architecture. The cobblestoned Old Town is manageable and the city offers incredible value.",
    seniorFriendlyScore: 7.8,
    highlights: ["Prague Castle", "Charles Bridge", "Old Town Square", "Josefov"],
    bestMonths: ["May", "June", "September", "October"],
    terrain: "Hilly with cobblestones, accessible routes available",
    imageUrl: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "singapore",
    city: "Singapore",
    country: "Singapore",
    description: "Asia's most accessible city-state with world-class healthcare, spotless streets, and incredible food diversity. Everything is air-conditioned and flat.",
    seniorFriendlyScore: 9.5,
    highlights: ["Gardens by the Bay", "Marina Bay Sands", "Hawker Centers", "Orchard Road"],
    bestMonths: ["February", "March", "July", "August"],
    terrain: "Extremely flat, world-class accessibility infrastructure",
    imageUrl: "https://images.unsplash.com/photo-1509356843151-3e7d96241e11?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "edinburgh",
    city: "Edinburgh",
    country: "Scotland",
    description: "Scotland's dramatic capital with a medieval castle, whisky culture, and friendly locals. Some hills but excellent accessible transport options.",
    seniorFriendlyScore: 7.5,
    highlights: ["Edinburgh Castle", "Royal Mile", "Holyrood Palace", "Arthur's Seat"],
    bestMonths: ["May", "June", "July", "August"],
    terrain: "Hilly, but accessible routes and hop-on buses available",
    imageUrl: "https://images.unsplash.com/photo-1596394723269-b2cbca4e6313?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "quebec-city",
    city: "Quebec City",
    country: "Canada",
    description: "North America's most European-feeling city with French charm, incredible cuisine, and a beautiful historic core. A gentle, walkable old town.",
    seniorFriendlyScore: 8.0,
    highlights: ["Château Frontenac", "Old Quebec", "Plains of Abraham", "Montmorency Falls"],
    bestMonths: ["June", "July", "September", "October"],
    terrain: "Upper and lower town with funicular for easy access between them",
    imageUrl: "https://images.unsplash.com/photo-1547234935-80c7145ec969?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "dubrovnik",
    city: "Dubrovnik",
    country: "Croatia",
    description: "The 'Pearl of the Adriatic' with stunning white walls, crystal-clear sea, and excellent seafood. Best visited in shoulder season to avoid crowds.",
    seniorFriendlyScore: 7.2,
    highlights: ["City Walls Walk", "Cable Car", "Lokrum Island", "Old Town"],
    bestMonths: ["May", "June", "September", "October"],
    terrain: "Cobblestones within walls, cable car available for easier access",
    imageUrl: "https://images.unsplash.com/photo-1549180030-48bf079fb38a?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "new-zealand-queenstown",
    city: "Queenstown",
    country: "New Zealand",
    description: "Stunning alpine scenery with countless easy walking tracks, lake cruises, and world-class vineyards. Perfect for those who love nature without harsh terrain.",
    seniorFriendlyScore: 8.3,
    highlights: ["Lake Wakatipu", "Milford Sound Day Trip", "Arrowtown", "Wine Region"],
    bestMonths: ["December", "January", "February", "March"],
    terrain: "Town is flat, many gentle nature walks, scenic drives available",
    imageUrl: "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=600&q=80",
  },
];

const ATTRACTIONS: Record<string, Attraction[]> = {
  lisbon: [
    { id: "belem-tower", name: "Belém Tower", category: "Historic", emoji: "🏰", description: "A 16th-century fortress on the Tagus River — iconic and completely flat access with lifts.", seniorScore: 9, walkingMinutes: 10, steps: 800, gradient: ["#8B4513", "#5D2E0C"] },
    { id: "jeronimos", name: "Jerónimos Monastery", category: "Architecture", emoji: "⛪", description: "Magnificent Manueline masterpiece. Wide interiors, plenty of seating, very accessible.", seniorScore: 8.5, walkingMinutes: 15, steps: 1200, gradient: ["#2E5D8A", "#1A3A5C"] },
    { id: "alfama", name: "Alfama Fado District", category: "Culture", emoji: "🎵", description: "Historic Moorish quarter with live fado music in cozy restaurants. Hilly but tuk-tuks available.", seniorScore: 7.5, walkingMinutes: 20, steps: 2000, gradient: ["#7B3F8A", "#4A2055"] },
    { id: "lx-factory", name: "LX Factory", category: "Food & Shopping", emoji: "🛍️", description: "Trendy indoor market in a former factory. Flat ground, great cafes, no rush atmosphere.", seniorScore: 8.8, walkingMinutes: 8, steps: 600, gradient: ["#C4622D", "#8B3A1A"] },
    { id: "sintra", name: "Sintra Palace Town", category: "Nature & History", emoji: "🌿", description: "Fairytale palaces in forested hills, 40 min by train. Pena Palace has cable car access.", seniorScore: 8.0, walkingMinutes: 30, steps: 3500, gradient: ["#1A7B7B", "#0E4E4E"] },
    { id: "pasteis", name: "Pastéis de Belém", category: "Food", emoji: "🥐", description: "The original pastel de nata bakery since 1837. Always a short queue, well worth the wait.", seniorScore: 9.5, walkingMinutes: 2, steps: 100, gradient: ["#B8860B", "#8B6914"] },
    { id: "tram-28", name: "Tram 28 Ride", category: "Experience", emoji: "🚋", description: "Vintage tram through historic neighborhoods. Seated the whole way — a Lisbon icon.", seniorScore: 9.0, walkingMinutes: 5, steps: 300, gradient: ["#1A6B4A", "#0D4A32"] },
    { id: "oceanarium", name: "Lisbon Oceanarium", category: "Museum", emoji: "🐠", description: "World-class aquarium fully accessible with lifts. Ideal for a slow afternoon.", seniorScore: 9.2, walkingMinutes: 5, steps: 400, gradient: ["#1565C0", "#0D47A1"] },
  ],
  rome: [
    { id: "colosseum", name: "Colosseum", category: "Historic", emoji: "🏛️", description: "The world's most iconic amphitheatre. Accessible entrance, audio guides available.", seniorScore: 8.0, walkingMinutes: 20, steps: 1800, gradient: ["#8B4513", "#5D2E0C"] },
    { id: "vatican", name: "Vatican Museums", category: "Art & Culture", emoji: "🎨", description: "Sistine Chapel and more. Very extensive — consider a golf-cart tour for ease.", seniorScore: 7.5, walkingMinutes: 45, steps: 4500, gradient: ["#7B3F8A", "#4A2055"] },
    { id: "trevi-fountain", name: "Trevi Fountain", category: "Architecture", emoji: "⛲", description: "Rome's most spectacular fountain. Best visited at dawn to avoid crowds.", seniorScore: 8.5, walkingMinutes: 10, steps: 600, gradient: ["#2E5D8A", "#1A3A5C"] },
    { id: "borghese", name: "Villa Borghese Gardens", category: "Nature", emoji: "🌳", description: "Vast parkland with sculptures, a gallery, and lake. Flat paths, many benches.", seniorScore: 9.0, walkingMinutes: 25, steps: 2500, gradient: ["#1A7B7B", "#0E4E4E"] },
    { id: "trastevere", name: "Trastevere Neighbourhood", category: "Food & Culture", emoji: "🍷", description: "Charming cobbled quarter with authentic trattorias. Best explored in the evening.", seniorScore: 8.2, walkingMinutes: 20, steps: 1500, gradient: ["#C4622D", "#8B3A1A"] },
    { id: "pantheon", name: "The Pantheon", category: "Historic", emoji: "🏛️", description: "2,000-year-old temple — free to enter, no steps, miraculous acoustics.", seniorScore: 9.3, walkingMinutes: 10, steps: 700, gradient: ["#5D4037", "#3E2723"] },
    { id: "campo-dei-fiori", name: "Campo de' Fiori Market", category: "Food", emoji: "🍅", description: "Morning food market with fresh produce and cafes surrounding it. Lively and accessible.", seniorScore: 8.8, walkingMinutes: 5, steps: 400, gradient: ["#E65100", "#BF360C"] },
  ],
  kyoto: [
    { id: "fushimi-inari", name: "Fushimi Inari Shrine", category: "Culture", emoji: "⛩️", description: "Thousands of vermillion torii gates. Do just the first 30 min — spectacular without the full hike.", seniorScore: 8.0, walkingMinutes: 30, steps: 3000, gradient: ["#C62828", "#B71C1C"] },
    { id: "arashiyama", name: "Arashiyama Bamboo Grove", category: "Nature", emoji: "🎋", description: "Otherworldly bamboo forest. Flat path, short walk, utterly peaceful in the morning.", seniorScore: 9.2, walkingMinutes: 15, steps: 1200, gradient: ["#1A6B4A", "#0D4A32"] },
    { id: "kinkakuji", name: "Kinkakuji Golden Pavilion", category: "Architecture", emoji: "✨", description: "Japan's most photographed temple, covered in gold leaf. Easy walk around the pond.", seniorScore: 9.5, walkingMinutes: 20, steps: 1500, gradient: ["#F57F17", "#E65100"] },
    { id: "gion", name: "Gion Geisha District", category: "Culture", emoji: "🏮", description: "Traditional machiya townhouses. Best at dusk — spot geiko heading to engagements.", seniorScore: 8.8, walkingMinutes: 25, steps: 2000, gradient: ["#6A1B9A", "#4A148C"] },
    { id: "nishiki", name: "Nishiki Market", category: "Food", emoji: "🍱", description: "'Kyoto's Kitchen' — 400-year-old covered market. Cool, flat, endlessly fascinating.", seniorScore: 9.0, walkingMinutes: 10, steps: 800, gradient: ["#E65100", "#BF360C"] },
    { id: "ryoanji", name: "Ryoanji Rock Garden", category: "Culture", emoji: "🪨", description: "Famous Zen rock garden. Peaceful, mostly flat, wonderful for quiet contemplation.", seniorScore: 9.4, walkingMinutes: 15, steps: 1000, gradient: ["#37474F", "#263238"] },
    { id: "philosopher-path", name: "Philosopher's Path", category: "Nature", emoji: "🌸", description: "Scenic canal-side walk lined with cherry trees. Flat, 2km, dotted with cafes.", seniorScore: 9.1, walkingMinutes: 30, steps: 2500, gradient: ["#F48FB1", "#C2185B"] },
  ],
  amsterdam: [
    { id: "rijksmuseum", name: "Rijksmuseum", category: "Art", emoji: "🖼️", description: "World-class Dutch masters. Fully accessible, wheelchairs available, lovely garden cafe.", seniorScore: 9.5, walkingMinutes: 10, steps: 1000, gradient: ["#1565C0", "#0D47A1"] },
    { id: "anne-frank", name: "Anne Frank House", category: "Historic", emoji: "📖", description: "Deeply moving museum. Pre-book required. Some steep stairs — has accessible route.", seniorScore: 8.0, walkingMinutes: 15, steps: 800, gradient: ["#37474F", "#263238"] },
    { id: "canal-cruise", name: "Canal Boat Cruise", category: "Experience", emoji: "⛵", description: "Sit back and see Amsterdam from the water. 1-hour cruises, fully seated, magical.", seniorScore: 9.8, walkingMinutes: 5, steps: 200, gradient: ["#1A7B7B", "#0E4E4E"] },
    { id: "vondelpark", name: "Vondelpark", category: "Nature", emoji: "🌷", description: "Amsterdam's beloved green lung. Completely flat, cafes throughout, cyclists and walkers.", seniorScore: 9.2, walkingMinutes: 20, steps: 1800, gradient: ["#1A6B4A", "#0D4A32"] },
    { id: "jordaan", name: "Jordaan Neighbourhood", category: "Food & Culture", emoji: "🧀", description: "Picturesque canals, artisan shops, and brown cafes. Flat and endlessly charming.", seniorScore: 9.0, walkingMinutes: 25, steps: 2000, gradient: ["#C4622D", "#8B3A1A"] },
    { id: "van-gogh", name: "Van Gogh Museum", category: "Art", emoji: "🌻", description: "The world's largest Van Gogh collection. Modern building, full accessibility, audio guides.", seniorScore: 9.3, walkingMinutes: 8, steps: 600, gradient: ["#F57F17", "#E65100"] },
  ],
  barcelona: [
    { id: "sagrada-familia", name: "Sagrada Família", category: "Architecture", emoji: "⛪", description: "Gaudí's unfinished masterpiece — one of the world's most extraordinary buildings.", seniorScore: 8.5, walkingMinutes: 15, steps: 1200, gradient: ["#8B4513", "#5D2E0C"] },
    { id: "park-guell", name: "Park Güell", category: "Nature & Architecture", emoji: "🌈", description: "Colourful mosaic park by Gaudí. Pre-book the monumental zone; free areas are lovely too.", seniorScore: 7.8, walkingMinutes: 35, steps: 3000, gradient: ["#1A7B7B", "#0E4E4E"] },
    { id: "gothic-quarter", name: "Gothic Quarter", category: "Historic", emoji: "🏛️", description: "Medieval labyrinth of narrow streets. Very flat overall, full of history and tapas bars.", seniorScore: 8.2, walkingMinutes: 30, steps: 2500, gradient: ["#5D4037", "#3E2723"] },
    { id: "la-boqueria", name: "La Boqueria Market", category: "Food", emoji: "🥑", description: "Barcelona's most famous food market. Arrive early — the best stalls are worth the visit.", seniorScore: 8.0, walkingMinutes: 5, steps: 400, gradient: ["#E65100", "#BF360C"] },
    { id: "barceloneta", name: "Barceloneta Beach", category: "Nature", emoji: "🏖️", description: "City beach with a lovely boardwalk. Perfect for a slow morning stroll or just sitting.", seniorScore: 8.8, walkingMinutes: 20, steps: 1500, gradient: ["#1565C0", "#0D47A1"] },
    { id: "palau-musica", name: "Palau de la Música", category: "Culture", emoji: "🎶", description: "Stunning Art Nouveau concert hall. Guided tours or evening concerts — acoustics are divine.", seniorScore: 9.2, walkingMinutes: 10, steps: 600, gradient: ["#7B3F8A", "#4A2055"] },
  ],
  vienna: [
    { id: "schonbrunn", name: "Schönbrunn Palace", category: "Historic", emoji: "🏰", description: "Imperial palace with beautiful gardens. Accessible throughout, golf cart tours available.", seniorScore: 9.5, walkingMinutes: 30, steps: 2500, gradient: ["#F57F17", "#E65100"] },
    { id: "st-stephens", name: "St. Stephen's Cathedral", category: "Architecture", emoji: "⛪", description: "Vienna's Gothic masterpiece at the heart of the city. Lift to the tower, crypt tours.", seniorScore: 9.0, walkingMinutes: 10, steps: 600, gradient: ["#5D4037", "#3E2723"] },
    { id: "belvedere", name: "Belvedere Palace & Gardens", category: "Art", emoji: "🎨", description: "Baroque palace housing Klimt's The Kiss. Flat gardens, world-class impressionist art.", seniorScore: 9.3, walkingMinutes: 20, steps: 1500, gradient: ["#1565C0", "#0D47A1"] },
    { id: "naschmarkt", name: "Naschmarkt", category: "Food", emoji: "🥨", description: "Vienna's open-air market. Sample Viennese delicacies at a leisurely pace.", seniorScore: 8.8, walkingMinutes: 15, steps: 1000, gradient: ["#C4622D", "#8B3A1A"] },
    { id: "coffee-house", name: "Traditional Coffee House", category: "Culture", emoji: "☕", description: "A Viennese institution — sit for hours with a melange and cake, no one will rush you.", seniorScore: 10.0, walkingMinutes: 2, steps: 100, gradient: ["#6D4C41", "#4E342E"] },
    { id: "prater", name: "Prater Park & Giant Wheel", category: "Experience", emoji: "🎡", description: "Beautiful park with the historic Riesenrad Ferris wheel. Flat, vast, and utterly relaxing.", seniorScore: 9.1, walkingMinutes: 20, steps: 1800, gradient: ["#1A6B4A", "#0D4A32"] },
  ],
  singapore: [
    { id: "gardens-bay", name: "Gardens by the Bay", category: "Nature", emoji: "🌿", description: "Futuristic Supertrees and flower domes. Air-conditioned domes, flat paths, spectacular at night.", seniorScore: 9.8, walkingMinutes: 20, steps: 1500, gradient: ["#1A6B4A", "#0D4A32"] },
    { id: "hawker-centre", name: "Hawker Centre Feast", category: "Food", emoji: "🍜", description: "World-class street food in shaded, seated hawker centres. Maxwell or Lau Pa Sat are iconic.", seniorScore: 9.9, walkingMinutes: 5, steps: 300, gradient: ["#E65100", "#BF360C"] },
    { id: "marina-bay", name: "Marina Bay Sands", category: "Architecture", emoji: "🌃", description: "Iconic skyline landmark. SkyPark observation deck at sunset — unforgettable views.", seniorScore: 9.0, walkingMinutes: 10, steps: 700, gradient: ["#1565C0", "#0D47A1"] },
    { id: "sentosa", name: "Sentosa Island", category: "Experience", emoji: "🏝️", description: "Resort island with cable car, beaches, and easy cable car. Wheelchair-friendly throughout.", seniorScore: 8.8, walkingMinutes: 15, steps: 1000, gradient: ["#F57F17", "#E65100"] },
    { id: "botanic-gardens", name: "Singapore Botanic Gardens", category: "Nature", emoji: "🌺", description: "UNESCO World Heritage tropical garden. Flat, shaded, with a National Orchid Garden.", seniorScore: 9.6, walkingMinutes: 30, steps: 2500, gradient: ["#2E7D32", "#1B5E20"] },
  ],
  prague: [
    { id: "prague-castle", name: "Prague Castle", category: "Historic", emoji: "🏰", description: "World's largest ancient castle complex. Funicular available; stunning city views.", seniorScore: 8.5, walkingMinutes: 30, steps: 2800, gradient: ["#37474F", "#263238"] },
    { id: "charles-bridge", name: "Charles Bridge", category: "Architecture", emoji: "🌉", description: "Iconic 14th-century stone bridge lined with baroque statues. Best at sunrise.", seniorScore: 9.0, walkingMinutes: 15, steps: 1200, gradient: ["#5D4037", "#3E2723"] },
    { id: "old-town-square", name: "Old Town Square", category: "Culture", emoji: "⏰", description: "Medieval square with the famous astronomical clock. Watch the hourly show seated at a cafe.", seniorScore: 9.5, walkingMinutes: 10, steps: 600, gradient: ["#1565C0", "#0D47A1"] },
    { id: "josefov", name: "Jewish Quarter Josefov", category: "Historic", emoji: "✡️", description: "Moving historic Jewish quarter with synagogues and cemetery. Mostly flat, deeply important.", seniorScore: 8.2, walkingMinutes: 20, steps: 1500, gradient: ["#7B3F8A", "#4A2055"] },
    { id: "czech-food", name: "Czech Beer & Dumplings", category: "Food", emoji: "🍺", description: "Sample svíčková and schnitzel in a traditional Czech pub. Warm, hearty, and affordable.", seniorScore: 9.3, walkingMinutes: 3, steps: 200, gradient: ["#8B4513", "#5D2E0C"] },
  ],
};

interface Attraction {
  id: string;
  name: string;
  category: string;
  emoji: string;
  description: string;
  seniorScore: number;
  walkingMinutes: number;
  steps: number;
  gradient: [string, string];
}

function getDefaultAttractions(destination: { city: string; highlights: string[] }): Attraction[] {
  return destination.highlights.map((h, i) => ({
    id: `${destination.city.toLowerCase()}-${i}`,
    name: h,
    category: "Highlight",
    emoji: ["🏛️", "🌿", "🍽️", "🎭"][i % 4],
    description: `A top highlight of ${destination.city} — curated for senior-friendly exploration.`,
    seniorScore: 8.0,
    walkingMinutes: 15,
    steps: 1200,
    gradient: [["#1A6B4A", "#2E5D8A", "#7B3F8A", "#C4622D"][i % 4], ["#0D4A32", "#1A3A5C", "#4A2055", "#8B3A1A"][i % 4]] as [string, string],
  }));
}

router.get("/destinations", (_req: Request, res: Response) => {
  res.json(DESTINATIONS.slice(0, 8));
});

router.get("/destinations/search", (req: Request, res: Response) => {
  const query = ((req.query.query as string) || "").toLowerCase().trim();
  if (!query) {
    res.json(DESTINATIONS.slice(0, 8));
    return;
  }

  const results = DESTINATIONS.filter(
    (d) =>
      d.city.toLowerCase().includes(query) ||
      d.country.toLowerCase().includes(query) ||
      d.description.toLowerCase().includes(query) ||
      d.highlights.some((h) => h.toLowerCase().includes(query))
  );

  res.json(results);
});

router.get("/destinations/:id/attractions", (req: Request, res: Response) => {
  const { id } = req.params;
  const attractions = ATTRACTIONS[id];

  if (attractions) {
    res.json(attractions);
    return;
  }

  const dest = DESTINATIONS.find((d) => d.id === id);
  if (!dest) {
    res.status(404).json({ error: "Destination not found" });
    return;
  }

  res.json(getDefaultAttractions(dest));
});

interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  priceLevel: 1 | 2 | 3;
  specialty: string;
  description: string;
  seniorScore: number;
  mealType: "lunch" | "dinner" | "both";
  emoji: string;
  gradient: [string, string];
}

const RESTAURANTS: Record<string, Restaurant[]> = {
  lisbon: [
    { id: "a-cevicheria", name: "A Cevicheria", cuisine: "Portuguese Fusion", priceLevel: 2, specialty: "Octopus ceviche", description: "Playful, seafood-forward spot in Príncipe Real. No reservations but arrives early — worth every minute.", seniorScore: 8.5, mealType: "lunch", emoji: "🐙", gradient: ["#1A5C7B", "#0D3A4E"] },
    { id: "solar-dos-presuntos", name: "Solar dos Presuntos", cuisine: "Traditional Portuguese", priceLevel: 2, specialty: "Bacalhau à Brás (salted cod)", description: "Beloved family-run Lisbon institution since 1976. Warm, unhurried atmosphere — perfect for a long lunch.", seniorScore: 9.5, mealType: "both", emoji: "🐟", gradient: ["#7B3A1A", "#4E2510"] },
    { id: "tasca-do-chico", name: "Tasca do Chico", cuisine: "Fado & Traditional", priceLevel: 1, specialty: "Caldo verde soup", description: "Tiny tavern with live fado music most evenings. Hearty, affordable Portuguese classics. Book ahead.", seniorScore: 9.0, mealType: "dinner", emoji: "🎵", gradient: ["#6B1A4A", "#4A1035"] },
    { id: "can-the-can", name: "Can the Can", cuisine: "Portuguese Conserva", priceLevel: 1, specialty: "Tinned sardine tasting board", description: "Playful spot dedicated to Portugal's famous tinned fish heritage. Light, shareable, and very easy on the feet.", seniorScore: 8.8, mealType: "lunch", emoji: "🥫", gradient: ["#B8520A", "#8B3A06"] },
    { id: "belcanto", name: "Belcanto", cuisine: "Fine Dining Portuguese", priceLevel: 3, specialty: "Garden of the Goose That Laid the Golden Eggs", description: "Two Michelin stars. Chef José Avillez's temple to modern Portuguese cuisine. An unforgettable evening.", seniorScore: 8.0, mealType: "dinner", emoji: "⭐", gradient: ["#1A4A2E", "#0D3020"] },
    { id: "cervejaria-ramiro", name: "Cervejaria Ramiro", cuisine: "Seafood Beerhouse", priceLevel: 2, specialty: "Tiger prawns & percebes", description: "Lisbon's most celebrated shellfish restaurant. Loud, joyful, and the freshest seafood in the city.", seniorScore: 8.2, mealType: "both", emoji: "🦐", gradient: ["#0D4A6B", "#083044"] },
    { id: "cafe-a-brasileira", name: "Café A Brasileira", cuisine: "Historic Café", priceLevel: 1, specialty: "Bica coffee & pastel de nata", description: "Lisbon's most iconic café since 1905. Sit at the marble counter or terrace and watch the world go by.", seniorScore: 9.8, mealType: "lunch", emoji: "☕", gradient: ["#5C3A1A", "#3A2510"] },
  ],
  rome: [
    { id: "tonnarello", name: "Da Enzo al 29", cuisine: "Roman Trattoria", priceLevel: 1, specialty: "Cacio e pepe", description: "Classic Trastevere trattoria, cash only. Portions are enormous, the cacio e pepe is legendary.", seniorScore: 9.2, mealType: "both", emoji: "🍝", gradient: ["#7B3A1A", "#4E2510"] },
    { id: "il-sorpasso", name: "Il Sorpasso", cuisine: "Roman Bistro", priceLevel: 2, specialty: "Supplì & aperitivo boards", description: "Relaxed, all-day restaurant near the Vatican. Great for a long lunch with no rush.", seniorScore: 8.8, mealType: "lunch", emoji: "🍷", gradient: ["#5C1A3A", "#3A1025"] },
    { id: "pierluigi", name: "Ristorante Pierluigi", cuisine: "Seafood Italian", priceLevel: 3, specialty: "Branzino in salt crust", description: "Elegant Piazza de' Ricci setting. Superb seafood with attentive service and a beautiful terrace.", seniorScore: 9.0, mealType: "dinner", emoji: "🐟", gradient: ["#1A3A5C", "#0D2540"] },
    { id: "flavio-velavevodetto", name: "Flavio al Velavevodetto", cuisine: "Roman Trattoria", priceLevel: 1, specialty: "Abbacchio alla romana (lamb)", description: "Built into the ancient Pyramid of Cestius neighbourhood. Authentic Roman recipes, enormous servings.", seniorScore: 8.5, mealType: "both", emoji: "🍖", gradient: ["#5C3A1A", "#3A2510"] },
    { id: "roscioli", name: "Roscioli", cuisine: "Deli & Wine Bar", priceLevel: 2, specialty: "Truffle pasta & artisan charcuterie", description: "Part deli, part restaurant. Outstanding cured meats, cheese, and pasta in a warm, intimate setting.", seniorScore: 9.3, mealType: "lunch", emoji: "🧀", gradient: ["#4A2E1A", "#2E1C0D"] },
    { id: "la-pergola", name: "La Pergola", cuisine: "Fine Dining Italian", priceLevel: 3, specialty: "Roma-Antica tasting menu", description: "Rome's only three Michelin-star restaurant. Panoramic terrace views. A truly special occasion dinner.", seniorScore: 8.5, mealType: "dinner", emoji: "⭐", gradient: ["#1A4A2E", "#0D3020"] },
  ],
  kyoto: [
    { id: "kikunoi", name: "Kikunoi", cuisine: "Kaiseki", priceLevel: 3, specialty: "Seasonal kaiseki tasting menu", description: "Third-generation kaiseki master Murata Yoshihiro. A transcendent, 3-hour journey through Japanese cuisine.", seniorScore: 8.5, mealType: "dinner", emoji: "🍱", gradient: ["#1A5C3A", "#0D3A22"] },
    { id: "nishiki-dori", name: "Nishiki Market Stalls", cuisine: "Street Food", priceLevel: 1, specialty: "Matcha mochi & grilled tofu", description: "Graze through 400 years of food history. Perfect for a light standing lunch with countless flavours.", seniorScore: 9.0, mealType: "lunch", emoji: "🍡", gradient: ["#5C3A1A", "#3A2510"] },
    { id: "tousuiro", name: "Tousuiro", cuisine: "Tofu Kaiseki", priceLevel: 2, specialty: "Yudofu (hot tofu) course", description: "Exquisite tofu-focused kaiseki in a traditional machiya. Gentle flavours, beautiful presentation, tatami seating with cushion option.", seniorScore: 9.2, mealType: "lunch", emoji: "🫙", gradient: ["#2E5C3A", "#1A3A22"] },
    { id: "ippudo-kyoto", name: "Ippudo Kyoto", cuisine: "Ramen", priceLevel: 1, specialty: "Shiromaru tonkotsu ramen", description: "Reliable, warming tonkotsu ramen. Counter seating, fast service, great when feet are tired.", seniorScore: 8.8, mealType: "both", emoji: "🍜", gradient: ["#7B3A1A", "#4E2510"] },
    { id: "izuju", name: "Izuju", cuisine: "Sushi & Oshizushi", priceLevel: 2, specialty: "Saba oshizushi (pressed mackerel sushi)", description: "Over 100 years old, near Yasaka Shrine. Famous for pressed sushi — a Kyoto specialty rarely seen elsewhere.", seniorScore: 9.4, mealType: "lunch", emoji: "🍣", gradient: ["#1A3A5C", "#0D2540"] },
    { id: "mizai", name: "Mizai", cuisine: "Kaiseki Fine Dining", priceLevel: 3, specialty: "Winter kaiseki with local wagyu", description: "Intimate, deeply personal dining at the edge of Nishiki. Only 12 seats. Pure Kyoto elegance.", seniorScore: 8.8, mealType: "dinner", emoji: "🥩", gradient: ["#3A1A4A", "#25102E"] },
  ],
  amsterdam: [
    { id: "rijsel", name: "Rijsel", cuisine: "French-Belgian Bistro", priceLevel: 2, specialty: "Roast chicken with frites", description: "Long-running Amsterdam favourite. No-fuss French classics, generous portions, perfect for a relaxed dinner.", seniorScore: 9.2, mealType: "dinner", emoji: "🍗", gradient: ["#5C3A1A", "#3A2510"] },
    { id: "de-kas", name: "Restaurant De Kas", cuisine: "Farm-to-Table", priceLevel: 3, specialty: "Seasonal greenhouse tasting menu", description: "Set inside a 1920s greenhouse. Vegetables picked that morning, exquisite preparation, magical atmosphere.", seniorScore: 9.0, mealType: "both", emoji: "🌿", gradient: ["#1A5C3A", "#0D3A22"] },
    { id: "brouwerij-t-ij", name: "Brouwerij 't IJ", cuisine: "Dutch Pub Food", priceLevel: 1, specialty: "Bitterballen & local craft beer", description: "Brewery inside a windmill. Bitterballen (fried beef croquettes) with a local beer — an Amsterdam tradition.", seniorScore: 8.5, mealType: "lunch", emoji: "🍺", gradient: ["#7B5C1A", "#4E3A10"] },
    { id: "han", name: "Han Bing", cuisine: "Chinese-Dutch Fusion", priceLevel: 2, specialty: "Peking duck pancakes", description: "Dutch-born chef's creative take on Chinese cuisine. Calm, seated dining with attentive service.", seniorScore: 8.8, mealType: "dinner", emoji: "🦆", gradient: ["#1A3A5C", "#0D2540"] },
    { id: "pancakes-amsterdam", name: "Pancakes Amsterdam", cuisine: "Dutch Pancakes", priceLevel: 1, specialty: "Stroopwafel & apple pancake", description: "Amsterdam's legendary pancake house. Sweet and savoury options, generous portions, loved by all ages.", seniorScore: 9.5, mealType: "both", emoji: "🥞", gradient: ["#B8520A", "#8B3A06"] },
  ],
  barcelona: [
    { id: "bar-la-mar", name: "Bar La Mar", cuisine: "Catalan Tapas", priceLevel: 1, specialty: "Pan con tomate & jamón ibérico", description: "Neighbourhood gem. Simple, perfect tapas at a marble counter. The pan con tomate is a revelation.", seniorScore: 9.0, mealType: "both", emoji: "🍅", gradient: ["#B8520A", "#8B3A06"] },
    { id: "tickets", name: "Tickets", cuisine: "Avant-Garde Tapas", priceLevel: 3, specialty: "Liquid olive oil spherification", description: "Albert Adrià's legendary tapas bar. Innovative, playful, extraordinary. Book months ahead.", seniorScore: 8.0, mealType: "dinner", emoji: "⭐", gradient: ["#5C1A3A", "#3A1025"] },
    { id: "la-pepita", name: "La Pepita", cuisine: "Modern Catalan", priceLevel: 2, specialty: "Bombas de la Barceloneta", description: "Charming corner restaurant with daily changing Catalan market menu. Relaxed, seated, very senior-friendly.", seniorScore: 9.3, mealType: "lunch", emoji: "🥘", gradient: ["#1A5C3A", "#0D3A22"] },
    { id: "el-xampanyet", name: "El Xampanyet", cuisine: "Catalan Tapas Bar", priceLevel: 1, specialty: "House cava & anchovy montadito", description: "Since 1929, near the Picasso Museum. Stand at the bar or find a table for cava and anchovies.", seniorScore: 8.5, mealType: "lunch", emoji: "🥂", gradient: ["#7B5C1A", "#4E3A10"] },
    { id: "lasarte", name: "Lasarte", cuisine: "Basque Fine Dining", priceLevel: 3, specialty: "Kokotxas with green pil-pil sauce", description: "Three Michelin stars. Martin Berasategui's Barcelona outpost. Extraordinary Basque-inspired haute cuisine.", seniorScore: 8.5, mealType: "dinner", emoji: "🐟", gradient: ["#1A3A5C", "#0D2540"] },
  ],
  vienna: [
    { id: "figlmueller", name: "Figlmüller", cuisine: "Viennese", priceLevel: 2, specialty: "Wiener Schnitzel (the original)", description: "Vienna's most iconic schnitzel since 1905. The schnitzel overhangs the plate. A Viennese institution.", seniorScore: 9.5, mealType: "both", emoji: "🥩", gradient: ["#7B5C1A", "#4E3A10"] },
    { id: "cafe-central", name: "Café Central", cuisine: "Viennese Coffeehouse", priceLevel: 2, specialty: "Melange coffee & Apfelstrudel", description: "Grand palatial café where Freud and Trotsky once argued. Sit for hours — no one will rush you.", seniorScore: 10.0, mealType: "both", emoji: "☕", gradient: ["#5C3A1A", "#3A2510"] },
    { id: "meixner", name: "Gasthaus Meixner", cuisine: "Traditional Viennese", priceLevel: 1, specialty: "Tafelspitz (boiled beef)", description: "Hidden neighbourhood gem. Locals-only prices, massive portions of boiled beef with horseradish and rösti.", seniorScore: 9.0, mealType: "both", emoji: "🍲", gradient: ["#4A3A1A", "#2E2510"] },
    { id: "steirereck", name: "Steirereck im Stadtpark", cuisine: "Austrian Fine Dining", priceLevel: 3, specialty: "Lungauer Almkäse cheese course", description: "Austria's greatest restaurant. Set in Stadtpark, one Michelin star, stunning Austrian produce, full accessibility.", seniorScore: 9.3, mealType: "dinner", emoji: "⭐", gradient: ["#1A5C3A", "#0D3A22"] },
    { id: "zur-herknerin", name: "Zum Wohl", cuisine: "Austrian Wine Bar", priceLevel: 2, specialty: "Grüner Veltliner & charcuterie board", description: "Excellent Austrian natural wine bar in the 1st district. Perfect for an afternoon glass and small plates.", seniorScore: 9.1, mealType: "lunch", emoji: "🍷", gradient: ["#5C1A3A", "#3A1025"] },
  ],
  singapore: [
    { id: "maxwell-hawker", name: "Maxwell Food Centre", cuisine: "Hawker Centre", priceLevel: 1, specialty: "Tian Tian chicken rice", description: "Singapore's most famous hawker centre. Sit anywhere, order from any stall. Chicken rice is unmissable.", seniorScore: 9.9, mealType: "both", emoji: "🍚", gradient: ["#B8520A", "#8B3A06"] },
    { id: "jumbo-seafood", name: "JUMBO Seafood", cuisine: "Singapore Seafood", priceLevel: 2, specialty: "Chilli crab with mantou buns", description: "The definitive Singapore chilli crab experience. Bibs provided. Messy, joyful, and utterly delicious.", seniorScore: 9.2, mealType: "dinner", emoji: "🦀", gradient: ["#7B1A1A", "#4E1010"] },
    { id: "blue-ginger", name: "The Blue Ginger", cuisine: "Peranakan", priceLevel: 2, specialty: "Ayam buah keluak (chicken & black nut)", description: "Best Peranakan (Straits Chinese) restaurant in Singapore. Richly spiced, deeply traditional, a true cultural meal.", seniorScore: 9.0, mealType: "both", emoji: "🌶️", gradient: ["#5C1A3A", "#3A1025"] },
    { id: "odette", name: "Odette", cuisine: "Modern French", priceLevel: 3, specialty: "Seasonal French tasting menu", description: "Asia's best restaurant for several years. Three Michelin stars. Set in the National Gallery — art and cuisine united.", seniorScore: 8.8, mealType: "dinner", emoji: "⭐", gradient: ["#1A4A5C", "#0D2E3A"] },
    { id: "lau-pa-sat", name: "Lau Pa Sat Festival Market", cuisine: "Hawker Satay", priceLevel: 1, specialty: "Satay skewers with peanut sauce", description: "Victorian cast-iron market, evening satay street. Pull up a plastic stool under the stars — pure Singapore magic.", seniorScore: 9.5, mealType: "dinner", emoji: "🍢", gradient: ["#7B5C1A", "#4E3A10"] },
  ],
  prague: [
    { id: "lokál", name: "Lokál", cuisine: "Czech Pub", priceLevel: 1, specialty: "Tank Pilsner Urquell & svíčková", description: "Czech beer-hall perfection. Unpasteurised tank beer, hearty dumplings with beef. Long communal tables, very welcoming.", seniorScore: 9.0, mealType: "both", emoji: "🍺", gradient: ["#5C3A1A", "#3A2510"] },
    { id: "la-degustation", name: "La Degustation Bohême Bourgeoise", cuisine: "Czech Fine Dining", priceLevel: 3, specialty: "7-course Czech heritage tasting menu", description: "Michelin star, historical Czech recipes elevated to haute cuisine. An unforgettable evening in the Old Town.", seniorScore: 8.5, mealType: "dinner", emoji: "⭐", gradient: ["#1A3A5C", "#0D2540"] },
    { id: "eska", name: "Eska", cuisine: "Modern Czech Bakery", priceLevel: 2, specialty: "Sourdough with cultured butter & fermenti", description: "Pioneer of the Prague food scene. Stunning breakfast/lunch with house-fermented everything and exceptional bread.", seniorScore: 9.2, mealType: "lunch", emoji: "🥖", gradient: ["#5C4A1A", "#3A2E10"] },
    { id: "mlejnice", name: "U Mlejnice", cuisine: "Czech Tavern", priceLevel: 1, specialty: "Roasted duck with red cabbage & knedlíky", description: "Medieval cellar tavern near Old Town Square. Dark, atmospheric, incredibly affordable. Duck and dumplings are superb.", seniorScore: 8.8, mealType: "dinner", emoji: "🦆", gradient: ["#3A1A1A", "#250D0D"] },
    { id: "lehka-hlava", name: "Lehká Hlava (Clear Head)", cuisine: "Vegetarian Czech", priceLevel: 2, specialty: "Smoked tofu goulash with bread dumplings", description: "Prague's best vegetarian restaurant. Whimsical décor, creative takes on Czech classics without meat.", seniorScore: 9.0, mealType: "both", emoji: "🌱", gradient: ["#1A5C3A", "#0D3A22"] },
  ],
};

router.get("/destinations/:id/restaurants", (req: Request, res: Response) => {
  const { id } = req.params;
  const budget = (req.query.budget as string) || "mid";
  const restaurants = RESTAURANTS[id];

  if (!restaurants) {
    const dest = DESTINATIONS.find((d) => d.id === id);
    if (!dest) {
      res.status(404).json({ error: "Destination not found" });
      return;
    }
    res.json([]);
    return;
  }

  const priceLevelMap: Record<string, number> = { budget: 1, mid: 2, luxury: 3 };
  const preferredLevel = priceLevelMap[budget] ?? 2;

  const sorted = [...restaurants].sort((a, b) => {
    const aDist = Math.abs(a.priceLevel - preferredLevel);
    const bDist = Math.abs(b.priceLevel - preferredLevel);
    return aDist - bDist;
  });

  res.json(sorted);
});

export default router;
