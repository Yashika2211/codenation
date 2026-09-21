import type { Metadata } from "next";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { TopNav } from "@/components/ui/TopNav";
import { MobileTabs } from "@/components/ui/MobileTabs";
import { Footer } from "@/components/ui/Footer";
import { Panel } from "@/components/ui/Panel";
import { Kicker, PageTitle, Label } from "@/components/ui/Label";
import { StatTile } from "@/components/ui/StatTile";
import { TechTree } from "@/components/tech/TechTree";
import { getTechTree } from "@/lib/queries/tech";
import { getCurrentProfile } from "@/lib/supabase/server";
import { ACCENT_HEX } from "@/lib/design/accents";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tech tree",
  description: "Sixty nodes across five branches. Research advances by solving, not by waiting.",
};

export default async function TechPage() {
  const viewer = await getCurrentProfile();
  const tree = await getTechTree(viewer?.id ?? null);

  const researching = tree.nodes.filter((n) => n.state === "researching").length;
  const available = tree.nodes.filter((n) => n.state === "available").length;

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

      <main className="mx-auto max-w-[1440px] px-4 pb-28 pt-10 sm:px-6 lg:pb-16">
        <Kicker color={ACCENT_HEX.ion}>Research</Kicker>
        <PageTitle className="mt-3">Sixty nodes, five branches</PageTitle>
        <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-muted">
          A node advances when you solve a problem in its topics. There is no timer and nothing to
          idle for — the only way to unlock a blueprint or a forge parameter is to write code.
        </p>

        {tree.nodes.length === 0 ? (
          <Panel className="mt-10 p-8 text-center">
            <p className="text-[13.5px] text-dim">
              The tech tree loads from the database. Apply the migrations and seed to populate it.
            </p>
          </Panel>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile
                label="Mastered"
                value={tree.mastered}
                sub={`of ${tree.total} nodes`}
                accent="flux"
                emphasis
              />
              <StatTile label="Researching" value={researching} sub="in progress" accent="signal" emphasis />
              <StatTile label="Available" value={available} sub="ready to start" accent="ion" emphasis />
              <StatTile label="Branches" value={tree.branches.length} sub="four tiers each" />
            </div>

            {!viewer ? (
              <Panel variant="tinted" accent="signal" className="mt-6 px-5 py-4">
                <Label as="p">
                  Sign in to track research. Signed out, every node reads as locked.
                </Label>
              </Panel>
            ) : null}

            <div className="mt-6">
              <TechTree nodes={tree.nodes} branches={tree.branches} />
            </div>
          </>
        )}
      </main>

      <Footer />
      <MobileTabs />
    </Atmosphere>
  );
}
