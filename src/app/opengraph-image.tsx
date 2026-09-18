import { ImageResponse } from "next/og";

export const runtime = "edge";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "1200px",
          height: "630px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          fontFamily: "system-ui, sans-serif",
          color: "white",
          padding: "60px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "120px",
            height: "120px",
            background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
            borderRadius: "24px",
            marginBottom: "24px",
          }}
        >
          <svg
            width="64"
            height="64"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M16 2L4 8v16l12 6 12-6V8L16 2z"
              stroke="white"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M16 8L4 14"
              stroke="white"
              strokeWidth="1.5"
              fill="none"
              opacity="0.6"
            />
            <path
              d="M16 8L28 14"
              stroke="white"
              strokeWidth="1.5"
              fill="none"
              opacity="0.6"
            />
            <path
              d="M4 14V22"
              stroke="white"
              strokeWidth="1.5"
              fill="none"
              opacity="0.6"
            />
            <path
              d="M28 14V22"
              stroke="white"
              strokeWidth="1.5"
              fill="none"
              opacity="0.6"
            />
            <path
              d="M16 22L4 28"
              stroke="white"
              strokeWidth="1.5"
              fill="none"
              opacity="0.6"
            />
            <path
              d="M16 22L28 28"
              stroke="white"
              strokeWidth="1.5"
              fill="none"
              opacity="0.6"
            />
          </svg>
        </div>
        <h1
          style={{
            fontSize: "56px",
            fontWeight: "800",
            letterSpacing: "-0.02em",
            margin: "0 0 16px 0",
            textAlign: "center",
            lineHeight: "1.1",
          }}
        >
          Discora
        </h1>
        <p
          style={{
            fontSize: "24px",
            fontWeight: "400",
            color: "rgba(255,255,255,0.8)",
            margin: "0 0 32px 0",
            textAlign: "center",
            maxWidth: "800px",
          }}
        >
          Structured discourse for discussion, debate, and evidence-based understanding.
        </p>
        <div
          style={{
            display: "flex",
            gap: "16px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              padding: "8px 20px",
              background: "rgba(255,255,255,0.1)",
              borderRadius: "999px",
              fontSize: "16px",
              fontWeight: "500",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            Evidence over popularity
          </span>
          <span
            style={{
              padding: "8px 20px",
              background: "rgba(255,255,255,0.1)",
              borderRadius: "999px",
              fontSize: "16px",
              fontWeight: "500",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            Understanding over engagement
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}