import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background:
            "radial-gradient(circle at top, #10245e 0%, #071229 28%, #040b18 58%, #020611 100%)",
          color: "white",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 40,
            borderRadius: 36,
            border: "1px solid rgba(255,255,255,0.12)",
            background:
              "linear-gradient(135deg, rgba(18,39,96,0.82) 0%, rgba(9,21,49,0.72) 100%)",
            padding: 56,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.58)",
              }}
            >
              Radar Daily
            </div>

            <div
              style={{
                fontSize: 76,
                lineHeight: 1.02,
                fontWeight: 700,
                letterSpacing: "-0.05em",
                maxWidth: 900,
              }}
            >
              Daily AI product and platform intelligence
            </div>

            <div
              style={{
                fontSize: 30,
                lineHeight: 1.45,
                color: "rgba(255,255,255,0.78)",
                maxWidth: 920,
              }}
            >
              Track what matters across OpenAI, Anthropic, Google, Meta and Hugging Face in one
              cleaner feed.
            </div>
          </div>

          <div style={{ display: "flex", gap: 16 }}>
            {["OpenAI", "Anthropic", "Google", "Meta", "Hugging Face"].map((item) => (
              <div
                key={item}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 48,
                  padding: "0 18px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  fontSize: 22,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.92)",
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}