import React from "react";

const InterferenceMap = ({ mapImage, isLoading }) => {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#050505",
        position: "relative",
        overflow: "hidden",
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
        }}
      />

      {mapImage ? (
        <div
          style={{
            position: "relative",
            zIndex: 1,
            border: "2px solid #333",
            boxShadow: "0 0 30px rgba(0,0,0,0.8)",
            width: "100%", // Added to fill container width
            height: "100%", // Added to fill container height
          }}
        >
          <img
            src={mapImage}
            alt="Beam Map"
            style={{
              width: "100%", // Force full width
              height: "100%", // Force full height
              objectFit: "fill", // Stretch to fill (ignore aspect ratio if needed)
              display: "block",
              border: "1px solid #000",
            }}
          />

          {/* Overlay Info */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: "rgba(0,0,0,0.8)",
              padding: "5px 10px",
              display: "flex",
              justifyContent: "space-between",
              borderTop: "1px solid #333",
            }}
          >
            <span
              style={{
                fontSize: "0.65rem",
                color: "#c5a059",
                fontFamily: "Cinzel",
              }}
            >
              MANA ZONE DETECTED
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  background: "red",
                  borderRadius: "50%",
                  border: "1px solid #fff",
                }}
              ></span>
              <span style={{ fontSize: "0.6rem", color: "#aaa" }}>
                Constructive
              </span>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  background: "blue",
                  borderRadius: "50%",
                  border: "1px solid #fff",
                }}
              ></span>
              <span style={{ fontSize: "0.6rem", color: "#aaa" }}>
                Destructive
              </span>
            </div>
          </div>
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
  );
};

export default InterferenceMap;
