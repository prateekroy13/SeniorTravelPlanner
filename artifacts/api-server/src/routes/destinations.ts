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
    imageUrl: null,
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
    imageUrl: null,
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
    imageUrl: null,
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
    imageUrl: null,
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
    imageUrl: null,
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
    imageUrl: null,
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
    imageUrl: null,
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
    imageUrl: null,
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
    imageUrl: null,
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
    imageUrl: null,
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
    imageUrl: null,
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
    imageUrl: null,
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

export default router;
