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

export default router;
