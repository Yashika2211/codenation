import type { SeedItemDefinition } from "./types";

/**
 * Forty-five item definitions.
 *
 * Everything `craftable` sits at or above 3,000 reputation — the database
 * enforces that with a check constraint, so this file cannot drift from the
 * rule. Cost here is the *base*; `lib/forge/craft.ts` multiplies it by the
 * rarity factor (1, 2.5, 6, 15, 40).
 */

const BASE: Record<string, { compute: number; data: number; alloy: number }> = {
  frame: { compute: 900, data: 180, alloy: 8 },
  skin: { compute: 1400, data: 260, alloy: 14 },
  building: { compute: 2600, data: 420, alloy: 30 },
  prop: { compute: 1100, data: 200, alloy: 10 },
  motif: { compute: 1800, data: 340, alloy: 18 },
  banner: { compute: 1500, data: 300, alloy: 15 },
  title: { compute: 2000, data: 500, alloy: 12 },
  landmark: { compute: 9000, data: 2200, alloy: 260 },
};

export const ITEM_DEFINITIONS: SeedItemDefinition[] = [
  // --- avatar frames -------------------------------------------------------
  { slug: "frame-hairline", name: "Hairline Frame", kind: "avatar_frame", rarity: "common", description: "A single-pixel border at low alpha. Restraint as a flex.", craftable: false, cost: {}, requiresRep: 250, requiresTech: [], baseParams: { stroke: 1, glow: 0 } },
  { slug: "frame-notched", name: "Notched Frame", kind: "avatar_frame", rarity: "common", description: "Corners cut at forty-five degrees.", craftable: false, cost: {}, requiresRep: 250, requiresTech: [], baseParams: { stroke: 1.5, notch: true } },
  { slug: "frame-emissive", name: "Emissive Frame", kind: "avatar_frame", rarity: "rare", description: "The border carries its own light.", craftable: true, cost: BASE.frame!, requiresRep: 3000, requiresTech: ["forge-metallurgy"], baseParams: { stroke: 1.5, glow: 0.4 } },
  { slug: "frame-lattice", name: "Lattice Frame", kind: "avatar_frame", rarity: "rare", description: "A woven border that reads as structure, not decoration.", craftable: true, cost: BASE.frame!, requiresRep: 3000, requiresTech: ["forge-metallurgy"], baseParams: { stroke: 2, pattern: "lattice" } },
  { slug: "frame-halo", name: "Halo Frame", kind: "avatar_frame", rarity: "epic", description: "A ring that sits a few pixels clear of the edge.", craftable: true, cost: BASE.frame!, requiresRep: 3000, requiresTech: ["forge-metallurgy", "matrix-methods"], baseParams: { stroke: 2, halo: true, glow: 0.7 } },
  { slug: "frame-orbital", name: "Orbital Frame", kind: "avatar_frame", rarity: "legendary", description: "Two rings at different inclinations, rotating slowly.", craftable: true, cost: BASE.frame!, requiresRep: 5000, requiresTech: ["forge-metallurgy", "computational-geometry"], baseParams: { rings: 2, glow: 0.85 } },
  { slug: "frame-singularity", name: "Singularity Frame", kind: "avatar_frame", rarity: "mythic", description: "Light bends toward the centre. One per player per season.", craftable: true, cost: BASE.frame!, requiresRep: 10000, requiresTech: ["forge-metallurgy", "planarity"], baseParams: { rings: 3, glow: 1, warp: true } },

  // --- workspace skins -----------------------------------------------------
  { slug: "skin-void", name: "Void Workspace", kind: "workspace_skin", rarity: "common", description: "The default ground. Near-black, no ornament.", craftable: false, cost: {}, requiresRep: 500, requiresTech: [], baseParams: { base: "#06070D" } },
  { slug: "skin-terminal", name: "Terminal Workspace", kind: "workspace_skin", rarity: "common", description: "Scanlines at four percent. Just enough.", craftable: false, cost: {}, requiresRep: 500, requiresTech: [], baseParams: { scanlines: 0.04 } },
  { slug: "skin-grid", name: "Measured Workspace", kind: "workspace_skin", rarity: "rare", description: "A forty-eight pixel grid behind the editor.", craftable: true, cost: BASE.skin!, requiresRep: 3000, requiresTech: ["forge-metallurgy"], baseParams: { grid: 48 } },
  { slug: "skin-flux", name: "Flux Workspace", kind: "workspace_skin", rarity: "rare", description: "A spring-cyan pool bleeding in from the top left.", craftable: true, cost: BASE.skin!, requiresRep: 3000, requiresTech: ["forge-metallurgy"], baseParams: { pool: "flux" } },
  { slug: "skin-ion-drift", name: "Ion Drift", kind: "workspace_skin", rarity: "epic", description: "Violet, moving slowly enough that you stop noticing.", craftable: true, cost: BASE.skin!, requiresRep: 3000, requiresTech: ["forge-metallurgy", "matrix-methods"], baseParams: { pool: "ion", drift: 0.3 } },
  { slug: "skin-plasma-storm", name: "Plasma Storm", kind: "workspace_skin", rarity: "legendary", description: "Magenta, and it does not sit still.", craftable: true, cost: BASE.skin!, requiresRep: 5000, requiresTech: ["forge-metallurgy", "randomisation"], baseParams: { pool: "plasma", drift: 0.7 } },
  { slug: "skin-event-horizon", name: "Event Horizon", kind: "workspace_skin", rarity: "mythic", description: "The gutter falls away toward the left margin.", craftable: true, cost: BASE.skin!, requiresRep: 10000, requiresTech: ["forge-metallurgy", "planarity"], baseParams: { warp: true, drift: 1 } },

  // --- building skins ------------------------------------------------------
  { slug: "build-banded", name: "Banded Facade", kind: "building_skin", rarity: "common", description: "Horizontal window bands at even spacing.", craftable: false, cost: {}, requiresRep: 1000, requiresTech: [], baseParams: { facade: "banded" } },
  { slug: "build-ribbed", name: "Ribbed Facade", kind: "building_skin", rarity: "common", description: "Vertical ribs that read taller than the building is.", craftable: false, cost: {}, requiresRep: 1000, requiresTech: [], baseParams: { facade: "ribbed" } },
  { slug: "build-spire", name: "Spire", kind: "building_skin", rarity: "rare", description: "Narrow, tapering, and unmistakable on a skyline.", craftable: true, cost: BASE.building!, requiresRep: 3000, requiresTech: ["forge-metallurgy"], baseParams: { silhouette: "spire", facade: "banded" } },
  { slug: "build-ziggurat", name: "Ziggurat", kind: "building_skin", rarity: "rare", description: "Stepped, heavy, and reads as institutional.", craftable: true, cost: BASE.building!, requiresRep: 3000, requiresTech: ["forge-metallurgy"], baseParams: { silhouette: "ziggurat", facade: "grid" } },
  { slug: "build-arcology", name: "Arcology", kind: "building_skin", rarity: "epic", description: "A district in one structure. Expensive to keep lit.", craftable: true, cost: BASE.building!, requiresRep: 3000, requiresTech: ["forge-metallurgy", "computational-geometry"], baseParams: { silhouette: "arcology", facade: "glass", crown: "ring" } },
  { slug: "build-lattice", name: "Lattice", kind: "building_skin", rarity: "epic", description: "More structure than surface.", craftable: true, cost: BASE.building!, requiresRep: 4000, requiresTech: ["forge-metallurgy", "planarity"], baseParams: { silhouette: "lattice", facade: "faceted", crown: "antenna" } },
  { slug: "build-monolith", name: "Monolith", kind: "building_skin", rarity: "legendary", description: "One face, no articulation, all presence.", craftable: true, cost: BASE.building!, requiresRep: 5000, requiresTech: ["forge-metallurgy", "computational-geometry"], baseParams: { silhouette: "monolith", facade: "glass", crown: "beacon" } },
  { slug: "build-helix", name: "Helix", kind: "building_skin", rarity: "mythic", description: "It turns as it rises. One per player per season.", craftable: true, cost: BASE.building!, requiresRep: 10000, requiresTech: ["forge-metallurgy", "planarity", "computational-geometry"], baseParams: { silhouette: "helix", facade: "faceted", crown: "halo" } },

  // --- district props ------------------------------------------------------
  { slug: "prop-beacon", name: "Beacon", kind: "district_prop", rarity: "common", description: "A single point of light on an empty parcel.", craftable: false, cost: {}, requiresRep: 1000, requiresTech: [], baseParams: { kind: "beacon" } },
  { slug: "prop-pylon", name: "Pylon", kind: "district_prop", rarity: "common", description: "Carries power between districts. Mostly decorative.", craftable: false, cost: {}, requiresRep: 1000, requiresTech: [], baseParams: { kind: "pylon" } },
  { slug: "prop-arch", name: "Transit Arch", kind: "district_prop", rarity: "rare", description: "Marks the boundary between two zonings.", craftable: true, cost: BASE.prop!, requiresRep: 3000, requiresTech: ["forge-metallurgy"], baseParams: { kind: "arch" } },
  { slug: "prop-garden", name: "Data Garden", kind: "district_prop", rarity: "rare", description: "Rows of cold storage, planted like hedges.", craftable: true, cost: BASE.prop!, requiresRep: 3000, requiresTech: ["forge-metallurgy"], baseParams: { kind: "garden" } },
  { slug: "prop-obelisk", name: "Obelisk", kind: "district_prop", rarity: "epic", description: "Carries an inscription of at most twenty-four characters.", craftable: true, cost: BASE.prop!, requiresRep: 3000, requiresTech: ["forge-metallurgy", "planarity"], baseParams: { kind: "obelisk", inscribable: true } },
  { slug: "prop-orrery", name: "Orrery", kind: "district_prop", rarity: "legendary", description: "A working model of the atlas, at district scale.", craftable: true, cost: BASE.prop!, requiresRep: 5000, requiresTech: ["forge-metallurgy", "computational-geometry"], baseParams: { kind: "orrery", animated: true } },

  // --- flag motifs ---------------------------------------------------------
  { slug: "motif-diamond", name: "Diamond", kind: "flag_motif", rarity: "common", description: "A square turned forty-five degrees. The founding mark.", craftable: false, cost: {}, requiresRep: 2500, requiresTech: [], baseParams: { glyph: "diamond" } },
  { slug: "motif-chevron", name: "Chevron", kind: "flag_motif", rarity: "common", description: "Direction, stated plainly.", craftable: false, cost: {}, requiresRep: 2500, requiresTech: [], baseParams: { glyph: "chevron" } },
  { slug: "motif-lattice", name: "Lattice Mark", kind: "flag_motif", rarity: "rare", description: "A woven grid, for nations built on structure.", craftable: true, cost: BASE.motif!, requiresRep: 3000, requiresTech: ["forge-metallurgy"], baseParams: { glyph: "lattice" } },
  { slug: "motif-circuit", name: "Circuit Mark", kind: "flag_motif", rarity: "rare", description: "Traces that terminate in nothing, deliberately.", craftable: true, cost: BASE.motif!, requiresRep: 3000, requiresTech: ["forge-metallurgy"], baseParams: { glyph: "circuit" } },
  { slug: "motif-eclipse", name: "Eclipse", kind: "flag_motif", rarity: "epic", description: "One disc occluding another.", craftable: true, cost: BASE.motif!, requiresRep: 3000, requiresTech: ["forge-metallurgy", "planarity"], baseParams: { glyph: "eclipse" } },
  { slug: "motif-constellation", name: "Constellation", kind: "flag_motif", rarity: "legendary", description: "Points joined by lines nobody agreed on.", craftable: true, cost: BASE.motif!, requiresRep: 5000, requiresTech: ["forge-metallurgy", "planarity"], baseParams: { glyph: "constellation" } },
  { slug: "motif-sigil", name: "Sovereign Sigil", kind: "flag_motif", rarity: "mythic", description: "Generated from your seed alone. No two exist.", craftable: true, cost: BASE.motif!, requiresRep: 10000, requiresTech: ["forge-metallurgy", "planarity"], baseParams: { glyph: "sigil", unique: true } },

  // --- banners -------------------------------------------------------------
  { slug: "banner-plain", name: "Plain Banner", kind: "banner", rarity: "common", description: "One colour, one hairline.", craftable: false, cost: {}, requiresRep: 250, requiresTech: [], baseParams: { style: "plain" } },
  { slug: "banner-split", name: "Split Banner", kind: "banner", rarity: "rare", description: "Two fields divided on the diagonal.", craftable: true, cost: BASE.banner!, requiresRep: 3000, requiresTech: ["forge-metallurgy"], baseParams: { style: "split" } },
  { slug: "banner-gradient", name: "Emissive Banner", kind: "banner", rarity: "epic", description: "The field carries its own light source.", craftable: true, cost: BASE.banner!, requiresRep: 3000, requiresTech: ["forge-metallurgy", "matrix-methods"], baseParams: { style: "emissive" } },
  { slug: "banner-aurora", name: "Aurora Banner", kind: "banner", rarity: "legendary", description: "Three accents, moving independently.", craftable: true, cost: BASE.banner!, requiresRep: 5000, requiresTech: ["forge-metallurgy", "randomisation"], baseParams: { style: "aurora" } },

  // --- titles --------------------------------------------------------------
  { slug: "title-citizen", name: "Citizen", kind: "title", rarity: "common", description: "Where everyone starts. Nothing to be ashamed of.", craftable: false, cost: {}, requiresRep: 0, requiresTech: [], baseParams: { text: "Citizen" } },
  { slug: "title-custom", name: "Personal Title", kind: "title", rarity: "epic", description: "Twenty-four characters of your own, profanity-filtered.", craftable: true, cost: BASE.title!, requiresRep: 3000, requiresTech: ["forge-metallurgy"], baseParams: { editable: true, maxLength: 24 } },
  { slug: "title-archon", name: "Archon Title", kind: "title", rarity: "legendary", description: "Carries a mark only moderators and Archons may render.", craftable: true, cost: BASE.title!, requiresRep: 7500, requiresTech: ["forge-metallurgy"], baseParams: { editable: true, maxLength: 24, mark: true } },

  // --- landmarks -----------------------------------------------------------
  { slug: "landmark-spire", name: "World Spire", kind: "landmark", rarity: "mythic", description: "A Legend's single Landmark, placed once on the world atlas.", craftable: true, cost: BASE.landmark!, requiresRep: 10000, requiresTech: ["forge-metallurgy", "planarity", "computational-geometry"], baseParams: { silhouette: "spire", worldVisible: true } },
  { slug: "landmark-gate", name: "World Gate", kind: "landmark", rarity: "mythic", description: "Visible from every nation on the atlas. Only one may stand.", craftable: true, cost: BASE.landmark!, requiresRep: 10000, requiresTech: ["forge-metallurgy", "planarity", "computational-geometry"], baseParams: { silhouette: "monolith", worldVisible: true } },
  { slug: "landmark-observatory", name: "World Observatory", kind: "landmark", rarity: "mythic", description: "Reads the whole atlas at once. The rarest thing anyone has built.", craftable: true, cost: BASE.landmark!, requiresRep: 10000, requiresTech: ["forge-metallurgy", "planarity", "matrix-methods"], baseParams: { silhouette: "lattice", worldVisible: true } },
];
