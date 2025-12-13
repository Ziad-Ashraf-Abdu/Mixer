import React from "react";

const BeamProfile = ({ profileImage }) => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#050505",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        border: "1px solid #333",
        position: "relative",
      }}
    >
      {profileImage ? (
        <img
          src={profileImage}
          alt="Beam Profile"
          style={{
            maxWidth: "95%",
            maxHeight: "95%",
            objectFit: "contain",
            filter: "drop-shadow(0 0 10px rgba(0,255,255,0.3))",
          }}
        />
      ) : (
        <span
          style={{ color: "#444", fontFamily: "Cinzel", fontSize: "0.8rem" }}
        >
          INITIALIZING SENSORS...
        </span>
      )}

      <div
        style={{
          position: "absolute",
          top: 5,
          left: 10,
          color: "#c5a059",
          fontFamily: "Cinzel",
          fontSize: "0.7rem",
        }}
      >
        BEAM PATTERN
      </div>
    </div>
  );
};

export default BeamProfile;
