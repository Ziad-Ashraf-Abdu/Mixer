import React from "react";

const InterferenceMap = ({ mapImage, isLoading }) => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#050505",
        border: "1px solid #333",
      }}
    >
      {/* Header with Legend - MOVED OUTSIDE IMAGE */}
      <div
        style={{
          background: "rgba(0,0,0,0.9)",
          padding: "6px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #333",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: "0.7rem",
            color: "#c5a059",
            fontFamily: "Cinzel",
            letterSpacing: "1px",
          }}
        >
          INTERFERENCE MAP
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span
              style={{
                width: "12px",
                height: "12px",
                background: "red",
                borderRadius: "50%",
                border: "2px solid #fff",
              }}
            ></span>
            <span style={{ fontSize: "0.65rem", color: "#aaa" }}>Antennas</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div
              style={{
                width: "30px",
                height: "10px",
                background:
                  "linear-gradient(90deg, #0000ff, #00ffff, #ffff00, #ff0000)",
                border: "1px solid #666",
              }}
            ></div>
            <span style={{ fontSize: "0.6rem", color: "#aaa" }}>Intensity</span>
          </div>
        </div>
      </div>

      {/* Image Container - NO OVERLAY */}
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
          overflow: "auto",
          minHeight: 0,
        }}
      >
        {/* Background Grid Lines */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundImage:
              "linear-gradient(#111 1px, transparent 1px), linear-gradient(90deg, #111 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            zIndex: 0,
            pointerEvents: "none",
          }}
        />

        {mapImage ? (
          <div
            style={{
              position: "relative",
              zIndex: 1,
              boxShadow: "0 0 30px rgba(0,0,0,0.8)",
              maxWidth: "100%",
              maxHeight: "100%",
              display: "flex",
            }}
          >
            <img
              src={mapImage}
              alt="Beam Map"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                width: "auto",
                height: "auto",
                objectFit: "contain",
                display: "block",
                border: "2px solid #333",
              }}
            />
          </div>
        ) : (
          <div
            style={{
              zIndex: 1,
              color: "#444",
              fontFamily: "Cinzel",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                border: "2px dashed #333",
                borderRadius: "50%",
                animation: "spin 4s linear infinite",
              }}
            />
            <span>WAITING FOR MANA INPUT...</span>
          </div>
        )}

        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
};

export default InterferenceMap;
