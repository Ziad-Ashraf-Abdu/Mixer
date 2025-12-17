// components/Beamforming/ArrayConfig.jsx
import React, { useState, useEffect } from "react";

const ArrayConfig = ({
  arrays,
  setArrays,
  activeArrayIndex,
  setActiveArrayIndex,
  selectedAntennaIndex,
  setSelectedAntennaIndex,
}) => {
  const [activeScenario, setActiveScenario] = useState("5G"); // DEFAULT: 5G
  const [showAntennaList, setShowAntennaList] = useState(false);

  // Load 5G scenario on mount
  useEffect(() => {
    loadScenario("5G");
  }, []); // Empty dependency array = run once on mount

  const addArray = () => {
    setArrays((prev) => [
      ...prev,
      {
        count: 16,
        geo: "linear",
        curve: 0,
        steering: 0,
        spacing: 0.5,
        x: 0,
        y: 0,
        antennaOffsets: {},
        antennaFrequencies: {}, // NEW: Store frequency multipliers
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
    setSelectedAntennaIndex(null);
  };

  const updateArray = (field, value) => {
    setArrays((prev) =>
      prev.map((a, i) =>
        i === activeArrayIndex ? { ...a, [field]: value } : a
      )
    );
  };

  const updateAntennaOffset = (antennaIdx, axis, value) => {
    setArrays((prev) =>
      prev.map((a, i) => {
        if (i !== activeArrayIndex) return a;
        const offsets = { ...a.antennaOffsets };
        if (!offsets[antennaIdx]) offsets[antennaIdx] = { x: 0, y: 0 };
        offsets[antennaIdx][axis] = value;
        return { ...a, antennaOffsets: offsets };
      })
    );
  };

  // NEW: Update frequency multiplier for specific antenna
  const updateAntennaFreq = (antennaIdx, value) => {
    setArrays((prev) =>
      prev.map((a, i) => {
        if (i !== activeArrayIndex) return a;
        const freqs = { ...a.antennaFrequencies };
        freqs[antennaIdx] = value;
        return { ...a, antennaFrequencies: freqs };
      })
    );
  };

  const loadScenario = (name) => {
    setActiveScenario(name);
    // Base object now includes antennaFrequencies
    const base = {
      id: Date.now(),
      antennaOffsets: {},
      antennaFrequencies: {},
      spacing: 0.5,
    };

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
          geo: "linear",
          curve: 0,
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
          geo: "linear",
          curve: 0,
          steering: 0,
          x: 0,
          y: 0,
        },
      ]);
    }
    setActiveArrayIndex(0);
    setSelectedAntennaIndex(null);
  };

  const current = arrays[activeArrayIndex] || {};

  const currentAntennaOffset =
    selectedAntennaIndex !== null
      ? current.antennaOffsets?.[selectedAntennaIndex] || { x: 0, y: 0 }
      : { x: 0, y: 0 };

  // NEW: Get current frequency multiplier (default 1.0)
  const currentFreqMult =
    selectedAntennaIndex !== null
      ? current.antennaFrequencies?.[selectedAntennaIndex] || 1.0
      : 1.0;

  const btnStyle = (isActive) => ({
    flex: 1,
    padding: "6px",
    fontSize: "0.65rem",
    border: "1px solid #333",
    cursor: "pointer",
    fontFamily: "Cinzel",
    background: isActive ? "#d32f2f" : "#111",
    color: isActive ? "#fff" : "#666",
    transition: "all 0.3s",
    clipPath: "polygon(10% 0, 100% 0, 90% 100%, 0 100%)",
  });

  const antennaBtnStyle = (isSelected) => ({
    padding: "4px 8px",
    fontSize: "0.6rem",
    border: "1px solid #333",
    background: isSelected ? "#c5a059" : "#1a1a1a",
    color: isSelected ? "#000" : "#999",
    cursor: "pointer",
    fontFamily: "Cinzel",
    transition: "all 0.2s",
  });

  return (
    <div
      style={{
        width: "280px",
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
                onClick={() => {
                  setActiveArrayIndex(i);
                  setSelectedAntennaIndex(null);
                }}
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

        {/* ARRAY PARAMETERS */}
        {arrays.length > 0 && (
          <div
            style={{
              background: "rgba(0,0,0,0.3)",
              padding: "10px",
              border: "1px solid #333",
              borderRadius: "4px",
              marginBottom: "15px",
            }}
          >
            <div
              style={{
                fontSize: "0.7rem",
                color: "#c5a059",
                marginBottom: "10px",
                fontFamily: "Cinzel",
                borderBottom: "1px solid #333",
                paddingBottom: "5px",
              }}
            >
              ARRAY PARAMETERS
            </div>

            {/* Mana Sources (Count) */}
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
                max="64" // Max limited to 64 as requested
                value={current.count}
                onChange={(e) => updateArray("count", parseInt(e.target.value))}
              />
            </div>

            {/* Antenna Spacing */}
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
                <span>Antenna Spacing</span>
                <span style={{ color: "#00ffff" }}>
                  {(current.spacing || 0.5).toFixed(2)}λ
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.05"
                value={current.spacing || 0.5}
                onChange={(e) =>
                  updateArray("spacing", parseFloat(e.target.value))
                }
              />
            </div>

            {/* Steering */}
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

            {/* Formation */}
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

            {/* Curvature (only if curved selected) */}
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

            {/* Array Global Position */}
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
                Array Position (m)
              </div>
              <div style={{ display: "flex", gap: "8px", fontSize: "0.65rem" }}>
                <div>X: {current.x?.toFixed(1)}</div>
                <input
                  type="range"
                  min="-10"
                  max="10"
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
                  min="0"
                  max="40"
                  step="0.1"
                  value={current.y || 0}
                  onChange={(e) => updateArray("y", parseFloat(e.target.value))}
                  style={{ flex: 1 }}
                />
              </div>
            </div>
          </div>
        )}

        {/* INDIVIDUAL ANTENNA CONTROL */}
        <div
          style={{
            background: "rgba(211, 47, 47, 0.1)",
            padding: "10px",
            border: "1px solid #d32f2f",
            borderRadius: "4px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <div
              style={{
                fontSize: "0.7rem",
                color: "#d32f2f",
                fontFamily: "Cinzel",
              }}
            >
              ANTENNA CONTROL
            </div>
            <button
              onClick={() => setShowAntennaList(!showAntennaList)}
              style={{
                padding: "2px 8px",
                fontSize: "0.6rem",
                background: showAntennaList ? "#d32f2f" : "#333",
                color: showAntennaList ? "#fff" : "#999",
                border: "1px solid #555",
                cursor: "pointer",
                fontFamily: "Cinzel",
              }}
            >
              {showAntennaList ? "HIDE" : "SELECT"}
            </button>
          </div>

          {showAntennaList && (
            <div
              style={{
                maxHeight: "150px",
                overflowY: "auto",
                marginBottom: "10px",
                padding: "5px",
                background: "#0a0a0c",
                border: "1px solid #333",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "4px",
                }}
              >
                {Array.from({ length: current.count || 0 }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedAntennaIndex(i)}
                    style={antennaBtnStyle(selectedAntennaIndex === i)}
                  >
                    A{i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedAntennaIndex !== null ? (
            <div>
              <div
                style={{
                  fontSize: "0.65rem",
                  color: "#aaa",
                  marginBottom: "8px",
                  textAlign: "center",
                }}
              >
                Antenna #{selectedAntennaIndex + 1} Config
              </div>

              {/* Position Offsets */}
              <div style={{ fontSize: "0.65rem", marginBottom: "5px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: "#aaa",
                  }}
                >
                  <span>X Offset:</span>
                  <span style={{ color: "#c5a059" }}>
                    {currentAntennaOffset.x?.toFixed(2)}m
                  </span>
                </div>
                <input
                  type="range"
                  min="-20"
                  max="20"
                  step="0.1"
                  value={currentAntennaOffset.x}
                  onChange={(e) =>
                    updateAntennaOffset(
                      selectedAntennaIndex,
                      "x",
                      parseFloat(e.target.value)
                    )
                  }
                  style={{ width: "100%" }}
                />
              </div>
              <div style={{ fontSize: "0.65rem", marginBottom: "8px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: "#aaa",
                  }}
                >
                  <span>Y Offset:</span>
                  <span style={{ color: "#d32f2f" }}>
                    {currentAntennaOffset.y?.toFixed(2)}m
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  step="0.1"
                  value={currentAntennaOffset.y}
                  onChange={(e) =>
                    updateAntennaOffset(
                      selectedAntennaIndex,
                      "y",
                      parseFloat(e.target.value)
                    )
                  }
                  style={{ width: "100%" }}
                />
              </div>

              {/* NEW: Frequency Multiplier */}
              <div
                style={{
                  fontSize: "0.65rem",
                  padding: "5px",
                  borderTop: "1px dashed #444",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: "#aaa",
                  }}
                >
                  <span>Frequency:</span>
                  <span style={{ color: "#00ffff" }}>
                    {currentFreqMult.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="3.0"
                  step="0.1"
                  value={currentFreqMult}
                  onChange={(e) =>
                    updateAntennaFreq(
                      selectedAntennaIndex,
                      parseFloat(e.target.value)
                    )
                  }
                  style={{ width: "100%" }}
                />
              </div>

              <button
                onClick={() => {
                  updateAntennaOffset(selectedAntennaIndex, "x", 0);
                  updateAntennaOffset(selectedAntennaIndex, "y", 0);
                  updateAntennaFreq(selectedAntennaIndex, 1.0);
                }}
                style={{
                  width: "100%",
                  marginTop: "8px",
                  padding: "4px",
                  fontSize: "0.6rem",
                  background: "#333",
                  color: "#999",
                  border: "1px solid #555",
                  cursor: "pointer",
                  fontFamily: "Cinzel",
                }}
              >
                RESET CONFIG
              </button>
            </div>
          ) : (
            <div
              style={{
                fontSize: "0.65rem",
                color: "#666",
                textAlign: "center",
                padding: "20px 10px",
                fontStyle: "italic",
              }}
            >
              Click "SELECT" to choose an antenna
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArrayConfig;
