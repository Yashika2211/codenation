/**
 * Hand-maintained mirror of supabase/migrations. Regenerate with
 * `supabase gen types typescript --linked > lib/supabase/types.ts` once the
 * project is linked; until then this file is the contract, and it is kept in
 * step with the migrations by hand.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Difficulty = "easy" | "medium" | "hard" | "expert";

export type SubmissionStatus =
  | "queued"
  | "running"
  | "accepted"
  | "wrong_answer"
  | "tle"
  | "mle"
  | "error";

export type RunVerdict = "pending" | "passed" | "failed" | "tle" | "mle" | "error" | "skipped";
export type DuelState = "pending" | "live" | "finished" | "abandoned";
export type BuildingStateDb = "queued" | "building" | "complete" | "dormant";
export type Zoning = "compute" | "research" | "industry" | "civic" | "forge";
export type ResourceKindDb = "compute" | "data" | "alloy" | "rep";
export type TechState = "locked" | "available" | "researching" | "mastered";
export type RarityDb = "common" | "rare" | "epic" | "legendary" | "mythic";
export type ItemKind =
  | "avatar_frame"
  | "workspace_skin"
  | "building_skin"
  | "district_prop"
  | "flag_motif"
  | "banner"
  | "title"
  | "landmark";
export type AllianceRole = "speaker" | "member" | "probation";
export type TradeStateDb = "open" | "accepted" | "declined" | "withdrawn" | "expired";
export type FlagState = "watch" | "evidence" | "review" | "resolved";
export type AppealState = "open" | "upheld" | "overturned" | "withdrawn";
export type EventState = "draft" | "upcoming" | "live" | "judging" | "finished";
export type EventBracket = "participant" | "track_finalist" | "finalist" | "winner";

export type ProfileRow = {
  id: string;
  handle: string;
  display_name: string;
  bio: string | null;
  avatar_seed: string;
  country_code: string | null;
  github_login: string | null;
  github_verified_at: string | null;
  reputation: number;
  arena_rating: number;
  trust_score: number;
  nation_id: string | null;
  is_seed: boolean;
  created_at: string;
  updated_at: string;
};

export type NationRow = {
  id: string;
  slug: string;
  name: string;
  founder_id: string;
  flag: Json;
  doctrine: string | null;
  tier: number;
  prestige: number;
  accent: string;
  country_code: string | null;
  is_seed: boolean;
  founded_at: string;
  updated_at: string;
};

export type ProblemRow = {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  topics: string[];
  statement_md: string;
  constraints_md: string | null;
  time_limit_ms: number;
  memory_limit_mb: number;
  author_id: string | null;
  is_public: boolean;
  solved_count: number;
  attempt_count: number;
  first_solver_id: string | null;
  created_at: string;
};

export type TestcaseRow = {
  id: string;
  problem_id: string;
  input: string;
  expected: string;
  is_sample: boolean;
  weight: number;
  ordinal: number;
  created_at: string;
};

export type SubmissionRow = {
  id: string;
  user_id: string;
  problem_id: string;
  duel_id: string | null;
  language: string;
  language_version: string | null;
  source_code: string;
  status: SubmissionStatus;
  passed: number;
  total: number;
  runtime_ms: number | null;
  memory_kb: number | null;
  telemetry: Json;
  created_at: string;
  judged_at: string | null;
};

export type SubmissionRunRow = {
  id: string;
  submission_id: string;
  testcase_id: string;
  ordinal: number;
  verdict: RunVerdict;
  runtime_ms: number | null;
  memory_kb: number | null;
  stderr: string | null;
  created_at: string;
};

export type DuelRow = {
  id: string;
  problem_id: string;
  player_a: string;
  player_b: string | null;
  state: DuelState;
  started_at: string | null;
  ends_at: string | null;
  winner_id: string | null;
  rating_delta_a: number | null;
  rating_delta_b: number | null;
  created_at: string;
};

export type ResourceLedgerRow = {
  id: string;
  user_id: string;
  resource: ResourceKindDb;
  delta: number;
  reason: string;
  ref_table: string | null;
  ref_id: string | null;
  created_at: string;
};

export type WalletRow = {
  user_id: string;
  compute: number;
  data: number;
  alloy: number;
  updated_at: string;
};

export type TechNodeRow = {
  id: string;
  slug: string;
  name: string;
  tier: number;
  branch: string;
  description: string;
  cost: Json;
  requires: string[];
  unlocks_blueprints: string[];
  unlocks_items: string[];
  topics: string[];
  solves_required: number;
  pos_x: number;
  pos_y: number;
  created_at: string;
};

export type TechProgressRow = {
  user_id: string;
  node_id: string;
  state: TechState;
  progress: number;
  solves_done: number;
  solves_required: number;
  started_at: string | null;
  mastered_at: string | null;
  updated_at: string;
};

export type BadgeRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  rarity: RarityDb;
  accent: string;
  rule: Json;
  created_at: string;
};

export type BadgeAwardRow = {
  user_id: string;
  badge_id: string;
  awarded_at: string;
  evidence: Json;
};

export type BlueprintRow = {
  id: string;
  slug: string;
  name: string;
  kind: Zoning;
  description: string;
  base_cost: Json;
  requires_tech: string[];
  requires_rep: number;
  max_level: number;
  default_accent: string;
  upkeep_compute: number;
  build_minutes: number;
  created_at: string;
};

export type ParcelRow = {
  id: string;
  nation_id: string | null;
  owner_id: string;
  grid_x: number;
  grid_y: number;
  zoning: Zoning;
  acquired_at: string;
};

export type BuildingRow = {
  id: string;
  parcel_id: string;
  blueprint_id: string;
  owner_id: string;
  level: number;
  accent: string;
  state: BuildingStateDb;
  progress: number;
  eta: string | null;
  custom_item_id: string | null;
  window_density: number;
  last_upkeep_at: string;
  created_at: string;
  updated_at: string;
};

export type ItemDefinitionRow = {
  id: string;
  slug: string;
  name: string;
  kind: ItemKind;
  rarity: RarityDb;
  description: string;
  unlock_rule: Json;
  base_params: Json;
  craftable: boolean;
  cost: Json;
  requires_rep: number;
  requires_tech: string[];
  created_at: string;
};

export type ItemInstanceRow = {
  id: string;
  definition_id: string;
  owner_id: string;
  params: Json;
  seed: string;
  serial: number;
  bound: boolean;
  season: number;
  forged_at: string;
};

export type InventoryRow = {
  user_id: string;
  item_instance_id: string;
  acquired_at: string;
  source: string;
};

export type LoadoutRow = {
  user_id: string;
  avatar_frame: string | null;
  workspace_skin: string | null;
  banner: string | null;
  title: string | null;
  flag_motif: string | null;
  landmark: string | null;
  updated_at: string;
};

export type AllianceRow = {
  id: string;
  slug: string;
  name: string;
  charter_md: string;
  treasury: Json;
  tier: number;
  accent: string;
  founder_id: string;
  founded_at: string;
};

export type AllianceMemberRow = {
  alliance_id: string;
  nation_id: string;
  role: AllianceRole;
  contribution: number;
  joined_at: string;
};

export type TradeRow = {
  id: string;
  from_nation: string;
  to_nation: string | null;
  offer: Json;
  want: Json;
  state: TradeStateDb;
  note: string | null;
  created_at: string;
  settled_at: string | null;
};

export type VisitRow = { id: string; visitor_id: string; nation_id: string; at: string };

export type GuestbookRow = {
  id: string;
  nation_id: string;
  author_id: string;
  body: string;
  at: string;
};

export type ActivityFeedRow = {
  id: string;
  actor_id: string;
  verb: string;
  object_type: string;
  object_id: string | null;
  nation_id: string | null;
  payload: Json;
  at: string;
};

export type ModerationFlagRow = {
  id: string;
  kind: string;
  subject_type: string;
  subject_id: string;
  subject_user: string | null;
  confidence: number;
  signals: Json;
  state: FlagState;
  verdict: string | null;
  reviewer_id: string | null;
  reasoning: string | null;
  created_at: string;
  resolved_at: string | null;
};

export type AppealRow = {
  id: string;
  flag_id: string;
  author_id: string;
  body: string;
  state: AppealState;
  created_at: string;
  decided_at: string | null;
};

export type EventRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description_md: string;
  state: EventState;
  tracks: Json;
  prize: Json;
  accent: string;
  featured: boolean;
  is_seed: boolean;
  starts_at: string;
  ends_at: string;
  created_at: string;
};

export type EventEntryRow = {
  event_id: string;
  user_id: string;
  track: string;
  score: number;
  placement: number | null;
  bracket: EventBracket;
  submission_url: string | null;
  joined_at: string;
};

export type EventMatchRow = {
  id: string;
  event_id: string;
  round: number;
  slot: number;
  player_a: string | null;
  player_b: string | null;
  winner_id: string | null;
  score_a: number | null;
  score_b: number | null;
  created_at: string;
};

export type SubmissionFingerprintRow = {
  submission_id: string;
  problem_id: string;
  user_id: string;
  fingerprints: number[];
  token_count: number;
  created_at: string;
};

/** Columns a caller supplies on insert; the rest carry database defaults. */
type Insert<Row, Required extends keyof Row> = Pick<Row, Required> & Partial<Omit<Row, Required>>;

type Table<Row, I, U = Partial<Row>> = {
  Row: Row;
  Insert: I;
  Update: U;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, Insert<ProfileRow, "id" | "handle" | "display_name" | "avatar_seed">>;
      nations: Table<NationRow, Insert<NationRow, "slug" | "name" | "founder_id">>;
      problems: Table<
        ProblemRow,
        Insert<ProblemRow, "slug" | "title" | "difficulty" | "statement_md">
      >;
      testcases: Table<TestcaseRow, Insert<TestcaseRow, "problem_id">>;
      submissions: Table<
        SubmissionRow,
        Insert<SubmissionRow, "user_id" | "problem_id" | "language" | "source_code">
      >;
      submission_runs: Table<
        SubmissionRunRow,
        Insert<SubmissionRunRow, "submission_id" | "testcase_id">
      >;
      duels: Table<DuelRow, Insert<DuelRow, "problem_id" | "player_a">>;
      resource_ledger: Table<
        ResourceLedgerRow,
        Insert<ResourceLedgerRow, "user_id" | "resource" | "delta" | "reason">,
        never
      >;
      wallets: Table<WalletRow, Insert<WalletRow, "user_id">>;
      tech_nodes: Table<TechNodeRow, Insert<TechNodeRow, "slug" | "name" | "tier" | "branch">>;
      tech_progress: Table<TechProgressRow, Insert<TechProgressRow, "user_id" | "node_id">>;
      badges: Table<BadgeRow, Insert<BadgeRow, "slug" | "name">>;
      badge_awards: Table<BadgeAwardRow, Insert<BadgeAwardRow, "user_id" | "badge_id">>;
      blueprints: Table<BlueprintRow, Insert<BlueprintRow, "slug" | "name">>;
      parcels: Table<ParcelRow, Insert<ParcelRow, "owner_id" | "grid_x" | "grid_y">>;
      buildings: Table<
        BuildingRow,
        Insert<BuildingRow, "parcel_id" | "blueprint_id" | "owner_id">
      >;
      item_definitions: Table<
        ItemDefinitionRow,
        Insert<ItemDefinitionRow, "slug" | "name" | "kind">
      >;
      item_instances: Table<
        ItemInstanceRow,
        Insert<ItemInstanceRow, "definition_id" | "owner_id" | "seed" | "serial">
      >;
      inventory: Table<InventoryRow, Insert<InventoryRow, "user_id" | "item_instance_id">>;
      loadout: Table<LoadoutRow, Insert<LoadoutRow, "user_id">>;
      alliances: Table<AllianceRow, Insert<AllianceRow, "slug" | "name" | "founder_id">>;
      alliance_members: Table<
        AllianceMemberRow,
        Insert<AllianceMemberRow, "alliance_id" | "nation_id">
      >;
      trades: Table<TradeRow, Insert<TradeRow, "from_nation">>;
      visits: Table<VisitRow, Insert<VisitRow, "visitor_id" | "nation_id">>;
      guestbook: Table<GuestbookRow, Insert<GuestbookRow, "nation_id" | "author_id" | "body">>;
      activity_feed: Table<
        ActivityFeedRow,
        Insert<ActivityFeedRow, "actor_id" | "verb" | "object_type">
      >;
      moderation_flags: Table<
        ModerationFlagRow,
        Insert<ModerationFlagRow, "kind" | "subject_type" | "subject_id">
      >;
      appeals: Table<AppealRow, Insert<AppealRow, "flag_id" | "author_id" | "body">>;
      submission_fingerprints: Table<
        SubmissionFingerprintRow,
        Insert<SubmissionFingerprintRow, "submission_id" | "problem_id" | "user_id">
      >;
      events: Table<EventRow, Insert<EventRow, "slug" | "name" | "starts_at" | "ends_at">>;
      event_entries: Table<EventEntryRow, Insert<EventEntryRow, "event_id" | "user_id">>;
      event_matches: Table<EventMatchRow, Insert<EventMatchRow, "event_id" | "round" | "slot">>;
    };
    Views: {
      balances: {
        Row: { user_id: string; compute: number; data: number; alloy: number; rep: number };
        Relationships: [];
      };
      submissions_public: {
        Row: Omit<SubmissionRow, "source_code" | "telemetry" | "language_version">;
        Relationships: [];
      };
    };
    Functions: {
      next_item_serial: {
        Args: { p_definition: string };
        Returns: number;
      };
    };
    Enums: {
      difficulty: Difficulty;
      submission_status: SubmissionStatus;
      run_verdict: RunVerdict;
      duel_state: DuelState;
      building_state: BuildingStateDb;
      zoning: Zoning;
      resource: ResourceKindDb;
      tech_state: TechState;
      rarity: RarityDb;
      item_kind: ItemKind;
      alliance_role: AllianceRole;
      trade_state: TradeStateDb;
      flag_state: FlagState;
      appeal_state: AppealState;
      event_state: EventState;
      event_bracket: EventBracket;
    };
    CompositeTypes: Record<never, never>;
  };
};
