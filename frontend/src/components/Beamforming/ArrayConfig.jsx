// components/Beamforming/ArrayConfig.jsx
import React, { useState } from "react";

const ArrayConfig = ({
  arrays,
  setArrays,
  activeArrayIndex,
  setActiveArrayIndex,
}) => {
  // --- New State for Highlighter ---
  const [activeScenario, setActiveScenario] = useState(null);

  const addArray = () => {
    setArrays((prev) => [
      ...prev,
      {
        count: 16,
        geo: "linear",
        curve: 0,
        steering: 0,
        x: 0,
        y: 0,
        id: Date.now(),
      },
    ]);
  };

  const removeArray = (id) => {
    if (arrays.length <= 1) return;
    const newArrays = arrays.filter((a) => a.id !== id);
    setArrays(newArrays);
    if (activeArrayIndex >= newArrays.length)
      setActiveArrayIndex(newArrays.length - 1);
  };

  const updateArray = (field, value) => {
    setArrays((prev) =>
      prev.map((a, i) =>
        i === activeArrayIndex ? { ...a, [field]: value } : a
      )
    );
  };

  const loadScenario = (name) => {
    setActiveScenario(name); // Set Active State
    const base = { id: Date.now() };
    if (name === "5G") {
      setArrays([
        {
          ...base,
          count: 32,
          geo: "linear",
          curve: 0,
          steering: 30,
          x: 0,
          y: 0,
        },
      ]);
    } else if (name === "Ultrasound") {
      setArrays([
        {
          ...base,
          count: 64,
          geo: "curved",
          curve: 8,
          steering: 0,
          x: 0,
          y: 0,
        },
      ]);
    } else if (name === "Tumor") {
      setArrays([
        {
          ...base,
          count: 16,
          geo: "curved",
          curve: 15,
          steering: 0,
          x: 0,
          y: 0,
        },
      ]);
    }
    setActiveArrayIndex(0);
  };

  const current = arrays[activeArrayIndex] || {};

  // Updated Style Function: checks 'isActive' param
  const btnStyle = (isActive) => ({
    flex: 1,
    padding: "6px",
    fontSize: "0.65rem",
    border: "1px solid #333",
    cursor: "pointer",
    fontFamily: "Cinzel",
    background: isActive ? "#d32f2f" : "#111", // Highlights RED if active
    color: isActive ? "#fff" : "#666",
    transition: "all 0.3s",
    clipPath: "polygon(10% 0, 100% 0, 90% 100%, 0 100%)",
  });

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#141418",
        borderRight: "1px solid #333",
      }}
    >
      <div
        style={{
          padding: "10px",
          background: "#0a0a0c",
          borderBottom: "1px solid #c5a059",
          textAlign: "center",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "0.9rem",
            color: "#c5a059",
            fontFamily: "Cinzel",
            letterSpacing: "2px",
          }}
        >
          ARRAY CONTROL
        </h3>
      </div>

      <div style={{ padding: "15px", overflowY: "auto", flex: 1 }}>
        {/* Scenario Presets */}
        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              fontSize: "0.7rem",
              color: "#aaa",
              marginBottom: "8px",
              fontFamily: "Cinzel",
            }}
          >
            SPELL PRESETS
          </div>
          <div style={{ display: "flex", gap: "4px" }}>
            {/* Pass isActive boolean */}
            <button
              style={btnStyle(activeScenario === "5G")}
              onClick={() => loadScenario("5G")}
            >
              5G
            </button>
            <button
              style={btnStyle(activeScenario === "Ultrasound")}
              onClick={() => loadScenario("Ultrasound")}
            >
              SONAR
            </button>
            <button
              style={btnStyle(activeScenario === "Tumor")}
              onClick={() => loadScenario("Tumor")}
            >
              HEAL
            </button>
          </div>
        </div>

        {/* Array List */}
        <div style={{ marginBottom: "15px" }}>
          <div
            style={{
              fontSize: "0.7rem",
              color: "#aaa",
              marginBottom: "8px",
              fontFamily: "Cinzel",
            }}
          >
            ACTIVE ARRAYS
          </div>
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {arrays.map((a, i) => (
              <button
                key={a.id}
                onClick={() => setActiveArrayIndex(i)}
                style={{
                  padding: "4px 8px",
                  fontSize: "0.6rem",
                  border: "1px solid #333",
                  background: i === activeArrayIndex ? "#c5a059" : "#222",
                  color: i === activeArrayIndex ? "#000" : "#ccc",
                  fontFamily: "Cinzel",
                }}
              >
                #{i + 1}
              </button>
            ))}
            <button
              onClick={addArray}
              style={{
                padding: "4px 8px",
                fontSize: "0.6rem",
                border: "1px dashed #555",
                background: "#111",
                color: "#666",
                fontFamily: "Cinzel",
              }}
            >
              +
            </button>
            {arrays.length > 1 && (
              <button
                onClick={() => removeArray(arrays[activeArrayIndex].id)}
                style={{
                  padding: "4px 8px",
                  fontSize: "0.6rem",
                  border: "1px solid #d32f2f",
                  background: "#222",
                  color: "#d32f2f",
                  fontFamily: "Cinzel",
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Parameters for Active Array */}
        {arrays.length > 0 && (
          <div
            style={{
              background: "rgba(0,0,0,0.3)",
              padding: "10px",
              border: "1px solid #333",
              borderRadius: "4px",
            }}
          >
            <div style={{ marginBottom: "10px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.65rem",
                  color: "#aaa",
                  fontFamily: "Lato",
                }}
              >
                <span>Mana Sources</span>
                <span style={{ color: "#c5a059" }}>{current.count}</span>
              </div>
              <input
                type="range"
                min="2"
                max="128"
                value={current.count}
                onChange={(e) => updateArray("count", parseInt(e.target.value))}
              />
            </div>

            <div style={{ marginBottom: "10px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.65rem",
                  color: "#aaa",
                  fontFamily: "Lato",
                }}
              >
                <span>Steering</span>
                <span style={{ color: "#d32f2f" }}>{current.steering}°</span>
              </div>
              <input
                type="range"
                min="-90"
                max="90"
                value={current.steering}
                onChange={(e) =>
                  updateArray("steering", parseInt(e.target.value))
                }
              />
            </div>

            <div style={{ marginBottom: "10px" }}>
              <div
                style={{
                  fontSize: "0.65rem",
                  color: "#aaa",
                  marginBottom: "4px",
                }}
              >
                Formation
              </div>
              <select
                value={current.geo}
                onChange={(e) => updateArray("geo", e.target.value)}
                style={{
                  width: "100%",
                  background: "#0a0a0c",
                  color: "#e0e0e0",
                  border: "1px solid #444",
                  padding: "6px",
                  fontFamily: "Cinzel",
                  fontSize: "0.7rem",
                }}
              >
                <option value="linear">LINEAR PHALANX</option>
                <option value="curved">ARC FORMATION</option>
              </select>
            </div>

            {current.geo === "curved" && (
              <div style={{ marginBottom: "10px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.65rem",
                    color: "#aaa",
                    fontFamily: "Lato",
                  }}
                >
                  <span>Curvature</span>
                  <span>{current.curve}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={current.curve}
                  onChange={(e) =>
                    updateArray("curve", parseInt(e.target.value))
                  }
                />
              </div>
            )}

            {/* Position Controls */}
            <div
              style={{
                marginTop: "10px",
                borderTop: "1px solid #333",
                paddingTop: "10px",
              }}
            >
              <div
                style={{
                  fontSize: "0.65rem",
                  color: "#aaa",
                  marginBottom: "4px",
                }}
              >
                Position (m)
              </div>
              <div style={{ display: "flex", gap: "8px", fontSize: "0.65rem" }}>
                <div>X: {current.x?.toFixed(1)}</div>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="0.1"
                  value={current.x || 0}
                  onChange={(e) => updateArray("x", parseFloat(e.target.value))}
                  style={{ flex: 1 }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  fontSize: "0.65rem",
                  marginTop: "5px",
                }}
              >
                <div>Y: {current.y?.toFixed(1)}</div>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="0.1"
                  value={current.y || 0}
                  onChange={(e) => updateArray("y", parseFloat(e.target.value))}
                  style={{ flex: 1 }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArrayConfig;
