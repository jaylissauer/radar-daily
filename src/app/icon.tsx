import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
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
            width: 392,
            height: 392,
            borderRadius: 96,
            border: "1px solid rgba(255,255,255,0.14)",
            background:
              "linear-gradient(135deg, rgba(18,39,96,0.88) 0%, rgba(9,21,49,0.74) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 24px 80px rgba(0,0,0,0.28)",
          }}
        >
          <div
            style={{
              fontSize: 156,
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
