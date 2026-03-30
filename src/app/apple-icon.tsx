import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at top, #10245e 0%, #071229 28%, #040b18 58%, #020611 100%)",
          color: "white",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            width: 138,
            height: 138,
            borderRadius: 34,
            border: "1px solid rgba(255,255,255,0.14)",
            background:
              "linear-gradient(135deg, rgba(18,39,96,0.88) 0%, rgba(9,21,49,0.74) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 16px 50px rgba(0,0,0,0.28)",
          }}
        >
          <div
            style={{
              fontSize: 54,
              fontWeight: 800,
              letterSpacing: "-0.08em",
              lineHeight: 1,
            }}
          >
            AI
          </div>
        </div>
      </div>
    ),
    size,
  );
}
