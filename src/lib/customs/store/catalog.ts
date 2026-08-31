/**
 * Fieldnote Supply — the demo merchant.
 *
 * 20 products chosen so every trust tier and refusal boundary is exercisable
 * in one live demo: something under ₹500 (unverified happy path), at the ₹5k
 * attested edge, over ₹10k (human approval), and over ₹50k (refused even for
 * a mandated agent — the split-or-human path).
 *
 * Prices are integer paise (AGENTS.md invariant 4).
 */

export interface Product {
  id: string;
  name: string;
  tagline: string;
  category: "audio" | "desk" | "power" | "carry" | "vision" | "field";
  pricePaise: number;
  image: string;
  tags: string[];
  stock: number;
}

export const CATALOG: Product[] = [
  { id: "trail-anc-headphones", name: "Trail ANC Headphones", tagline: "Over-ear, 40h, adaptive noise cancelling", category: "audio", pricePaise: 1899900, image: "/products/trail-anc-headphones.jpg", tags: ["headphones", "anc", "audio", "over-ear", "music", "travel"], stock: 14 },
  { id: "field-mech-65", name: "Field Mech 65", tagline: "65% hot-swap keyboard, gasket mount", category: "desk", pricePaise: 749900, image: "/products/field-mech-65.jpg", tags: ["keyboard", "mechanical", "typing", "desk", "hotswap"], stock: 22 },
  { id: "ridge-mouse", name: "Ridge Mouse", tagline: "8k sensor, 78g, silent switches", category: "desk", pricePaise: 219900, image: "/products/ridge-mouse.jpg", tags: ["mouse", "pointing", "desk", "silent", "lightweight"], stock: 40 },
  { id: "arc-light-bar", name: "Arc Light Bar", tagline: "Asymmetric desk light, zero glare", category: "desk", pricePaise: 349900, image: "/products/arc-light-bar.jpg", tags: ["light", "lamp", "desk", "screen", "bar"], stock: 18 },
  { id: "port-webcam-2k", name: "Port Webcam 2K", tagline: "2K sensor, magnetic privacy shutter", category: "vision", pricePaise: 549900, image: "/products/port-webcam-2k.jpg", tags: ["webcam", "camera", "video", "calls", "meeting"], stock: 16 },
  { id: "vault-ssd-1tb", name: "Vault SSD 1TB", tagline: "USB4, 2,400 MB/s, aluminum shell", category: "power", pricePaise: 899900, image: "/products/vault-ssd-1tb.jpg", tags: ["ssd", "storage", "drive", "usb", "backup", "nvme"], stock: 25 },
  { id: "cell-powerbank-20k", name: "Cell Power Bank 20K", tagline: "20,000mAh, 100W PD, airline-legal", category: "power", pricePaise: 299900, image: "/products/cell-powerbank-20k.jpg", tags: ["powerbank", "battery", "charging", "power", "usb-c", "travel"], stock: 30 },
  { id: "junction-hub-7", name: "Junction Hub 7-in-1", tagline: "USB-C dock: 4k HDMI, 100W passthrough", category: "power", pricePaise: 429900, image: "/products/junction-hub-7.jpg", tags: ["hub", "dock", "usb-c", "adapter", "hdmi", "ports"], stock: 27 },
  { id: "slate-desk-mat", name: "Slate Desk Mat", tagline: "900×400 wool felt, charcoal", category: "desk", pricePaise: 129900, image: "/products/slate-desk-mat.jpg", tags: ["mat", "desk", "felt", "pad", "wool"], stock: 35 },
  { id: "riser-stand", name: "Riser Laptop Stand", tagline: "Machined alloy, folds to 9mm", category: "desk", pricePaise: 289900, image: "/products/riser-stand.jpg", tags: ["stand", "laptop", "riser", "ergonomics", "desk"], stock: 21 },
  { id: "paper-ereader", name: "Paper E-Reader", tagline: "7-inch, 300ppi, warm front light", category: "vision", pricePaise: 1349900, image: "/products/paper-ereader.jpg", tags: ["ereader", "ebook", "reading", "kindle", "paper", "eink"], stock: 12 },
  { id: "bud-pro-earbuds", name: "Bud Pro Earbuds", tagline: "ANC, wireless case, multipoint", category: "audio", pricePaise: 499900, image: "/products/bud-pro-earbuds.jpg", tags: ["earbuds", "buds", "audio", "anc", "music", "wireless"], stock: 44 },
  { id: "beacon-speaker", name: "Beacon Speaker", tagline: "Room-filling, 24h, aux-in", category: "audio", pricePaise: 699900, image: "/products/beacon-speaker.jpg", tags: ["speaker", "audio", "bluetooth", "music", "sound"], stock: 15 },
  { id: "sentry-dashcam", name: "Sentry Dashcam", tagline: "4K dual-channel, parked sentry mode", category: "vision", pricePaise: 949900, image: "/products/sentry-dashcam.jpg", tags: ["dashcam", "camera", "car", "vehicle", "recording"], stock: 9 },
  { id: "pocket-multitool", name: "Pocket Multitool 12", tagline: "12 tools, aircraft steel, pocket clip", category: "field", pricePaise: 189900, image: "/products/pocket-multitool.jpg", tags: ["multitool", "tool", "edc", "knife", "pliers", "pocket"], stock: 33 },
  { id: "traverse-backpack-22", name: "Traverse Backpack 22L", tagline: "Weatherproof, luggage pass-through", category: "carry", pricePaise: 599900, image: "/products/traverse-backpack-22.jpg", tags: ["backpack", "bag", "carry", "travel", "laptop", "commute"], stock: 17 },
  { id: "globe-adapter", name: "Globe Travel Adapter", tagline: "70W, 4 plugs, one brick", category: "field", pricePaise: 44900, image: "/products/globe-adapter.jpg", tags: ["adapter", "travel", "charger", "plug", "international", "power"], stock: 60 },
  { id: "temp-ir-thermometer", name: "Temp IR Thermometer", tagline: "Instant surface temps, laser sight", category: "field", pricePaise: 159900, image: "/products/temp-ir-thermometer.jpg", tags: ["thermometer", "ir", "temperature", "tool", "measure"], stock: 26 },
  { id: "signal-router", name: "Signal Router", tagline: "WiFi 6, mesh-ready, 2.5GbE WAN", category: "power", pricePaise: 329900, image: "/products/signal-router.jpg", tags: ["router", "wifi", "network", "mesh", "internet"], stock: 19 },
  { id: "summit-drone-4k", name: "Summit Drone 4K", tagline: "3-axis gimbal, 34-min flights, sub-249g", category: "vision", pricePaise: 5499900, image: "/products/summit-drone-4k.jpg", tags: ["drone", "camera", "aerial", "4k", "video", "flight"], stock: 4 },
];

export interface CatalogSnapshot {
  byId: Map<string, Product>;
  all: Product[];
  merchantPublicKeyPem: string;
  merchantFingerprint: string;
}

export function catalogSnapshot(
  merchantPublicKeyPem: string,
  merchantFingerprint: string
): CatalogSnapshot {
  return {
    byId: new Map(CATALOG.map((p) => [p.id, p])),
    all: CATALOG,
    merchantPublicKeyPem,
    merchantFingerprint,
  };
}

/** Deterministic search: token overlap scoring, no RNG, no LLM. */
export function searchCatalog(query: string, limit = 3): Product[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const tokens = q.split(/[^a-z0-9]+/).filter((t) => t.length > 1);
  const scored = CATALOG.map((p) => {
    const haystack = `${p.name} ${p.tagline} ${p.category} ${p.tags.join(" ")}`.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (haystack.includes(t)) score += 2;
      if (p.name.toLowerCase().includes(t)) score += 3;
      for (const tag of p.tags) if (tag === t) score += 2;
    }
    return { p, score };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.p.id.localeCompare(b.p.id));
  return scored.slice(0, limit).map((s) => s.p);
}

/** Parse "under ₹3,000" / "below 3k" / "max 3000" → paise; null when absent. */
export function parsePriceCeiling(text: string): number | null {
  const m =
    text.match(/(?:under|below|less than|max|upto|up to|≤)\s*[₹\s]*([\d,]+(?:\.\d+)?)\s*(k)?/i) ??
    text.match(/[₹\s]([\d,]+(?:\.\d+)?)\s*(k)?\s*(?:or less|max|budget)/i);
  if (!m) return null;
  const base = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(base) || base <= 0) return null;
  const paise = m[2] ? base * 1000 * 100 : base * 100;
  return Math.round(paise);
}
