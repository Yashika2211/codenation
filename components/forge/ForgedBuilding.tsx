import { cn } from "@/lib/utils/cn";
import type { ForgeParams, Silhouette, Facade, Crown } from "@/lib/forge/params";

/**
 * One component renders every forged building — in the Forge preview, in the
 * nation view, on the atlas and in the profile showcase. `ForgeParams` in, CSS
 * out, no art asset anywhere.
 *
 * It follows the IsoPlate building recipe from the spec: `silhouette` picks the
 * inset and height curve, `facade` picks the repeating gradient,
 * `emissiveIntensity` scales the glow spread, and `crown` appends a small
 * absolutely-positioned element on top.
 */

type Props = {
  params: ForgeParams;
  /** Height in px at the base of the curve. Scales the whole structure. */
  height?: number;
  className?: string;
  /** Renders the inscription under the form. */
  showInscription?: boolean;
};

/** inset %, width %, and a height multiplier, per silhouette. */
const SHAPE: Record<Silhouette, { inset: number; width: number; scale: number; taper: number }> = {
  spire: { inset: 26, width: 48, scale: 1.25, taper: 0.45 },
  ziggurat: { inset: 14, width: 72, scale: 0.85, taper: 0.7 },
  arcology: { inset: 10, width: 80, scale: 1, taper: 0.9 },
  lattice: { inset: 20, width: 60, scale: 1.1, taper: 0.8 },
  monolith: { inset: 22, width: 56, scale: 1.05, taper: 1 },
  helix: { inset: 24, width: 52, scale: 1.3, taper: 0.6 },
};

function facadeImage(facade: Facade, accent: string, emissive: string, noise: number): string {
  // Window band spacing varies with the seed, so two items with identical
  // settings still differ in texture.
  const band = 5 + Math.round(noise * 5);

  switch (facade) {
    case "banded":
      return [
        `repeating-linear-gradient(180deg, ${emissive}26 0 1px, transparent 1px ${band}px)`,
        `linear-gradient(155deg, ${accent}1f, rgb(6 7 13 / 0.86))`,
      ].join(", ");
    case "ribbed":
      return [
        `repeating-linear-gradient(90deg, ${emissive}2e 0 1px, transparent 1px ${band}px)`,
        `linear-gradient(155deg, ${accent}1f, rgb(6 7 13 / 0.88))`,
      ].join(", ");
    case "grid":
      return [
        `repeating-linear-gradient(180deg, ${emissive}24 0 1px, transparent 1px ${band}px)`,
        `repeating-linear-gradient(90deg, ${emissive}1c 0 1px, transparent 1px ${band + 2}px)`,
        `linear-gradient(155deg, ${accent}1a, rgb(6 7 13 / 0.9))`,
      ].join(", ");
    case "faceted":
      return [
        `repeating-linear-gradient(118deg, ${emissive}22 0 1px, transparent 1px ${band + 3}px)`,
        `repeating-linear-gradient(62deg, ${accent}1a 0 1px, transparent 1px ${band + 3}px)`,
        `linear-gradient(155deg, ${accent}1f, rgb(6 7 13 / 0.88))`,
      ].join(", ");
    case "glass":
      return [
        `linear-gradient(118deg, ${emissive}2a 0%, transparent 42%, ${accent}1f 72%, transparent 100%)`,
        `linear-gradient(155deg, ${accent}24, rgb(6 7 13 / 0.82))`,
      ].join(", ");
  }
}

function CrownPiece({ crown, emissive, glow }: { crown: Crown; emissive: string; glow: number }) {
  if (crown === "none") return null;

  const shared = "pointer-events-none absolute left-1/2 -translate-x-1/2";
  const shadow = `0 0 ${Math.round(10 + glow * 24)}px ${Math.round(-2 - glow * 2)}px ${emissive}`;

  if (crown === "beacon") {
    return (
      <span
        aria-hidden
        className={cn(shared, "-top-[9px] block size-[7px] rounded-full cn-anim-pulse")}
        style={{ backgroundColor: emissive, boxShadow: shadow }}
      />
    );
  }

  if (crown === "antenna") {
    return (
      <span
        aria-hidden
        className={cn(shared, "-top-[18px] block w-px")}
        style={{ height: 18, backgroundColor: emissive, boxShadow: shadow }}
      />
    );
  }

  if (crown === "ring") {
    return (
      <span
        aria-hidden
        className={cn(shared, "-top-[7px] block h-[10px] w-[26px] rounded-full")}
        style={{ border: `1.5px solid ${emissive}`, boxShadow: shadow }}
      />
    );
  }

  // halo
  return (
    <span
      aria-hidden
      className={cn(shared, "-top-[12px] block h-[18px] w-[38px] rounded-full cn-anim-spin-slow")}
      style={{
        border: `1.5px solid ${emissive}`,
        borderTopColor: "transparent",
        boxShadow: shadow,
      }}
    />
  );
}

export function ForgedBuilding({
  params,
  height = 150,
  className,
  showInscription = false,
}: Props) {
  const shape = SHAPE[params.silhouette];
  const { accent, emissive, base } = params.palette;
  const glow = params.emissiveIntensity;

  const body = Math.round(height * shape.scale);
  const spread = Math.round(18 + glow * 46);

  // Ziggurat and helix read as stacked segments rather than one slab.
  const segments =
    params.silhouette === "ziggurat" ? 4 : params.silhouette === "helix" ? 5 : 1;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div
        className="relative flex flex-col-reverse items-center justify-end"
        style={{ width: `${shape.width}%`, minWidth: 64, height: body }}
      >
        {Array.from({ length: segments }, (_, index) => {
          const t = segments === 1 ? 1 : 1 - (index / segments) * (1 - shape.taper);
          const segmentHeight = body / segments;
          const rotation =
            params.silhouette === "helix" ? (index - segments / 2) * (4 + params.seedNoise * 6) : 0;

          return (
            <div
              key={index}
              className="relative"
              style={{
                width: `${Math.round(t * 100)}%`,
                height: segmentHeight,
                borderRadius: 5,
                border: `1px solid ${accent}`,
                backgroundImage: facadeImage(params.facade, accent, emissive, params.seedNoise),
                backgroundColor: base,
                boxShadow:
                  index === segments - 1
                    ? `0 0 ${spread}px ${Math.round(-6 - glow * 4)}px ${emissive}, 0 2px 0 -1px rgb(6 7 13 / 0.88)`
                    : `0 2px 0 -1px rgb(6 7 13 / 0.88)`,
                transform: `rotate(${rotation}deg)`,
              }}
            >
              {/* The crown sits on the topmost segment only. */}
              {index === segments - 1 ? (
                <CrownPiece crown={params.crown} emissive={emissive} glow={glow} />
              ) : null}
            </div>
          );
        })}

        {/* Ground glow pool, scaled by emissive intensity. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-[10px] left-1/2 block h-[16px] w-[130%] -translate-x-1/2 rounded-[50%]"
          style={{
            background: `radial-gradient(closest-side, ${emissive}${Math.round(glow * 60)
              .toString(16)
              .padStart(2, "0")}, transparent)`,
          }}
        />
      </div>

      {showInscription && params.inscription ? (
        <p
          className="mt-5 max-w-[24ch] truncate font-mono text-[10px] uppercase tracking-[0.18em]"
          style={{ color: emissive }}
          title={params.inscription}
        >
          {params.inscription}
        </p>
      ) : null}
    </div>
  );
}
