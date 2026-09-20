import { ImageResponse } from "next/og";

export const alt = "CodeNation — Ship code. Found a nation.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Dark OG card so a shared link reads as the product, not as a default preview.
 * Uses system fonts only — no network fetch at the edge.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          backgroundColor: "#06070D",
          backgroundImage:
            "radial-gradient(900px 520px at 12% -10%, rgba(124,107,255,0.30), transparent 62%), radial-gradient(760px 460px at 94% 0%, rgba(59,232,176,0.20), transparent 60%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 26,
              height: 26,
              border: "2px solid #3BE8B0",
              borderRadius: 3,
              transform: "rotate(45deg)",
            }}
          />
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: 6,
              color: "#EAF0F8",
            }}
          >
            CODENATION
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 108,
              fontWeight: 800,
              letterSpacing: -4,
              lineHeight: 1,
              color: "#EAF0F8",
            }}
          >
            Ship code.
          </div>
          <div
            style={{
              fontSize: 108,
              fontWeight: 800,
              letterSpacing: -4,
              lineHeight: 1.05,
              color: "#3BE8B0",
            }}
          >
            Found a nation.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div style={{ fontSize: 22, color: "#A9B8CC", letterSpacing: 1 }}>
            A persistent world for developers
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {["#3BE8B0", "#7C6BFF", "#E84FA8", "#5FC8FF", "#F2B441"].map((hex) => (
              <div
                key={hex}
                style={{
                  width: 12,
                  height: 12,
                  backgroundColor: hex,
                  borderRadius: 2,
                  transform: "rotate(45deg)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
