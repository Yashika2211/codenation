import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { TopNav } from "@/components/ui/TopNav";
import { MobileTabs } from "@/components/ui/MobileTabs";
import { Footer } from "@/components/ui/Footer";
import { Panel } from "@/components/ui/Panel";
import { Avatar } from "@/components/ui/Avatar";
import { Label, Kicker, SectionTitle } from "@/components/ui/Label";
import { StatTile } from "@/components/ui/StatTile";
import { Meter } from "@/components/ui/Meter";
import { Tag, DifficultyTag, RarityTag, type Difficulty, type Rarity } from "@/components/ui/Tag";
import { Heatmap } from "@/components/ui/Heatmap";
import { SkillRadar } from "@/components/ui/SkillRadar";
import { ResourceChip } from "@/components/ui/ResourceChip";
import { IconGithub, IconFlag, IconSpark } from "@/components/ui/Icon";
import { ForgedBuilding } from "@/components/forge/ForgedBuilding";
import { ForgeParamsSchema } from "@/lib/forge/params";
import { ACCENT_HEX, toAccent } from "@/lib/design/accents";
import { rankFor, nextRankFor, rankProgress } from "@/lib/progression/ranks";
import { getProfileByHandle } from "@/lib/queries/profile";
import { getCurrentProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { handle } = await params;
  const view = await getProfileByHandle(handle);
  if (!view) return { title: "Profile not found" };

  const rank = rankFor(view.profile.reputation);
  return {
    title: `${view.profile.display_name} (@${view.profile.handle})`,
    description: `${rank.name} · ${view.profile.reputation.toLocaleString("en-US")} reputation · ${view.totalSolves} problems solved on CodeNation.`,
  };
}

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "expert"];

export default async function ProfilePage({ params }: Params) {
  const { handle } = await params;
  const view = await getProfileByHandle(handle);
  if (!view) notFound();

  const viewer = await getCurrentProfile();
  const { profile, nation, wallet, heatDays, skills, badges, items } = view;

  const rank = rankFor(profile.reputation);
  const next = nextRankFor(profile.reputation);
  const progress = rankProgress(profile.reputation);
  const nationAccent = toAccent(nation?.accent);

  return (
    <Atmosphere>
      <TopNav
        user={
          viewer
            ? {
                handle: viewer.handle,
                displayName: viewer.display_name,
                avatarSeed: viewer.avatar_seed,
              }
            : null
        }
        reputation={viewer?.reputation}
      />

      <main className="mx-auto max-w-[1180px] px-4 pb-28 pt-10 sm:px-6 lg:pb-20">
        {profile.is_seed ? (
          <Panel variant="tinted" accent="amber" className="mb-6 flex items-center gap-3 px-5 py-4">
            <IconSpark size={17} className="shrink-0 text-amber" />
            <p className="text-[12.5px] text-muted">
              This is a seeded citizen — synthetic sample data, excluded from every real count on
              the platform.
            </p>
          </Panel>
        ) : null}

        {/* ---- identity ---------------------------------------------------- */}
        <Panel variant="solid" className="p-6 sm:p-8" sheen>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <Avatar
              seed={profile.avatar_seed}
              name={profile.display_name}
              size="xl"
              ring={ACCENT_HEX[rank.accent]}
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-[28px] font-extrabold leading-none tracking-[-0.03em] sm:text-[32px]">
                  {profile.display_name}
                </h1>
                <Tag accent={rank.accent}>{rank.name}</Tag>
                {profile.github_verified_at ? <Tag accent="signal">github verified</Tag> : null}
              </div>

              <p className="mt-2 font-mono text-[13px] text-dim">@{profile.handle}</p>

              {profile.bio ? (
                <p className="mt-4 max-w-[62ch] text-[14px] leading-relaxed text-muted">
                  {profile.bio}
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <ResourceChip resource="rep" value={profile.reputation} />
                <ResourceChip resource="compute" value={wallet.compute} />
                <ResourceChip resource="data" value={wallet.data} />
                <ResourceChip resource="alloy" value={wallet.alloy} />
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-4">
                {nation ? (
                  <Link
                    href={`/n/${nation.slug}`}
                    className="inline-flex items-center gap-[9px] rounded-chip border px-[13px] py-[9px] transition-colors hover:bg-glass"
                    style={{ borderColor: `${ACCENT_HEX[nationAccent]}44` }}
                  >
                    <IconFlag size={15} />
                    <span className="text-[13px] font-bold text-text">{nation.name}</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                      tier {nation.tier}
                    </span>
                  </Link>
                ) : (
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ghost">
                    No nation yet
                  </span>
                )}

                {profile.github_login ? (
                  <a
                    href={`https://github.com/${profile.github_login}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[13px] text-dim transition-colors hover:text-flux"
                  >
                    <IconGithub size={15} />
                    {profile.github_login}
                  </a>
                ) : null}

                {profile.country_code ? (
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
                    {profile.country_code}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* rank progress */}
          <div className="mt-8 border-t border-line pt-6">
            <div className="mb-2 flex items-baseline justify-between gap-4">
              <Label>{next ? `Progress to ${next.name}` : "Top of the ladder"}</Label>
              <span className="font-mono text-[11px] tabular-nums text-faint">
                {profile.reputation.toLocaleString("en-US")}
                {next ? ` / ${next.rep.toLocaleString("en-US")}` : ""}
              </span>
            </div>
            <Meter
              value={progress}
              accent={rank.accent}
              label={next ? `Progress to ${next.name}` : "Maximum rank"}
            />
            {next ? (
              <p className="mt-3 text-[12.5px] text-dim">
                {(next.rep - profile.reputation).toLocaleString("en-US")} reputation to unlock{" "}
                {next.unlocks[0]?.toLowerCase()}.
              </p>
            ) : null}
          </div>
        </Panel>

        {/* ---- stats ------------------------------------------------------- */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Reputation"
            value={profile.reputation}
            sub={rank.name}
            accent={rank.accent}
            emphasis
          />
          <StatTile
            label="Arena rating"
            value={profile.arena_rating}
            sub="Elo, K=32"
            accent="signal"
            emphasis
          />
          <StatTile label="Problems solved" value={view.totalSolves} sub="unique problems" />
          <StatTile
            label="Trust score"
            value={profile.trust_score}
            sub="no open flags"
            accent="flux"
          />
        </div>

        {/* ---- activity ---------------------------------------------------- */}
        <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto]">
          <Panel className="p-6">
            <Kicker>Contribution activity</Kicker>
            <p className="mt-3 text-[12.5px] text-dim">
              One square per day, counted from the reputation ledger. Every square is a row you can
              audit.
            </p>
            <div className="mt-5">
              <Heatmap days={heatDays} />
            </div>

            <div className="mt-7 border-t border-line pt-5">
              <Label as="div">Solved by difficulty</Label>
              <div className="mt-3 flex flex-wrap gap-3">
                {DIFFICULTIES.map((difficulty) => (
                  <span key={difficulty} className="inline-flex items-center gap-2">
                    <DifficultyTag difficulty={difficulty} />
                    <span className="font-mono text-[12px] tabular-nums text-muted">
                      {view.solvedByDifficulty[difficulty] ?? 0}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </Panel>

          <Panel className="grid place-items-center p-6">
            <div>
              <Kicker>Skill profile</Kicker>
              <div className="mt-4">
                <SkillRadar axes={skills} size={240} />
              </div>
              <p className="mt-2 max-w-[28ch] text-center text-[11.5px] leading-relaxed text-ghost">
                Relative to this player&apos;s strongest topic, not to other players.
              </p>
            </div>
          </Panel>
        </section>

        {/* ---- badges ------------------------------------------------------ */}
        <section className="mt-6">
          <SectionTitle>Badges</SectionTitle>
          {badges.length === 0 ? (
            <Panel className="mt-4 p-6">
              <p className="text-[13px] text-dim">
                No badges yet. They are awarded by rule, evaluated on every ledger insert.
              </p>
            </Panel>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {badges.map((badge) => (
                <Panel key={badge.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-[16px] font-extrabold tracking-[-0.02em]">
                      {badge.name}
                    </h3>
                    <RarityTag rarity={badge.rarity as Rarity} />
                  </div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                    {badge.description}
                  </p>
                  <p className="mt-4 font-mono text-[9.5px] uppercase tracking-[0.16em] text-ghost">
                    {new Date(badge.awarded_at).toISOString().slice(0, 10)}
                  </p>
                </Panel>
              ))}
            </div>
          )}
        </section>

        {/* ---- forged items ------------------------------------------------ */}
        <section className="mt-6">
          <SectionTitle>Forged items</SectionTitle>
          {items.length === 0 ? (
            <Panel className="mt-4 p-6">
              <p className="text-[13px] text-dim">
                Nothing forged yet. The Forge opens at 3,000 reputation.
              </p>
            </Panel>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((item) => {
                const parsed = ForgeParamsSchema.safeParse(item.params);
                return (
                  <Panel key={item.id} className="p-5">
                    {parsed.success ? (
                      <div className="grid min-h-[140px] place-items-end justify-center pb-3">
                        <ForgedBuilding params={parsed.data} height={104} />
                      </div>
                    ) : null}

                    <div className="flex items-start justify-between gap-2 border-t border-line pt-3">
                      <h3 className="font-display text-[15px] font-extrabold tracking-[-0.02em]">
                        {item.definition.name}
                      </h3>
                      <RarityTag rarity={item.definition.rarity as Rarity} />
                    </div>
                    <p className="mt-3 font-mono text-[11px] tabular-nums text-flux">
                      #{String(item.serial).padStart(3, "0")}
                    </p>
                    <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.16em] text-ghost">
                      {item.definition.kind.replace(/_/g, " ")}
                    </p>
                  </Panel>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Footer />
      <MobileTabs />
    </Atmosphere>
  );
}
