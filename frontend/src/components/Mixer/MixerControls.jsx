// components/Mixer/MixerControls.jsx
import React, { useEffect, useRef, useState } from "react";

const MixerControls = ({
                           weights,
                           setWeights,
                           region,
                           setRegion,
                           regionTypes,
                           mixMode,
                           setMixMode,
                           onProcess,
                           isProcessing,
                           useFullRegion,
                           setUseFullRegion,
                       }) => {
    const [statusText, setStatusText] = useState("READY TO CAST");
    const isFirstRun = useRef(true);

    // --- AUTO-CAST LOGIC ---
    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }

        setStatusText("CHANNELLING MANA...");

        const timer = setTimeout(() => {
            onProcess();
        }, 1000);

        return () => clearTimeout(timer);
    }, [weights, region, regionTypes, mixMode, useFullRegion]);

    useEffect(() => {
        if (isProcessing) {
            setStatusText("CASTING ANTI-MAGIC...");
        } else if (!isProcessing && statusText === "CASTING ANTI-MAGIC...") {
            setStatusText("SPELL ACTIVE");
        }
    }, [isProcessing]);

    const handleWeightChange = (imgIndex, type, val) => {
        const newWeights = [...weights];
        newWeights[imgIndex] = { ...newWeights[imgIndex], [type]: parseFloat(val) };
        setWeights(newWeights);
    };

    const labelStyle = {
        display: "flex",
        justifyContent: "space-between",
        fontSize: "0.6rem", // Compact font
        color: "#888",
        fontFamily: "Lato",
        marginTop: "2px", // Tight spacing
    };

    const isMagPhase = mixMode === "mag-phase";

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div
                style={{
                    padding: "8px", // Compact padding
                    background: "#0a0a0c",
                    borderBottom: "1px solid #333",
                    textAlign: "center",
                }}
            >
                <h3
                    style={{
                        margin: 0,
                        fontSize: "0.85rem", // Slightly smaller
                        color: "#c5a059",
                        fontFamily: "Cinzel",
                        letterSpacing: "2px",
                    }}
                >
                    MANA MIXER
                </h3>
            </div>

            {/* --- THEMED TOGGLE FOR WHOLE IMAGE MODE --- */}
            <div
                style={{
                    padding: "8px 8px 4px", // Compact container
                    display: "flex",
                    justifyContent: "center",
                }}
            >
                <button
                    onClick={() => setUseFullRegion(!useFullRegion)}
                    style={{
                        width: "100%",
                        padding: "5px", // Slimmer button
                        background: useFullRegion
                            ? "linear-gradient(45deg, #c5a059 0%, #8f7030 100%)"
                            : "rgba(20, 20, 20, 0.6)",
                        border: `1px solid ${useFullRegion ? "#fff" : "#444"}`,
                        color: useFullRegion ? "#000" : "#888",
                        cursor: "pointer",
                        fontFamily: "Cinzel",
                        fontSize: "0.65rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        transition: "all 0.3s ease",
                        boxShadow: useFullRegion
                            ? "0 0 8px rgba(197, 160, 89, 0.3)"
                            : "none",
                    }}
                >
                    {useFullRegion ? (
                        <>
                            <span>✦ WHOLE IMAGE ACTIVE</span>
                        </>
                    ) : (
                        <>
                            <span style={{ opacity: 0.5 }}>REGION MODE</span>
                        </>
                    )}
                </button>
            </div>

            {/* Mixing Mode Toggle */}
            <div
                style={{
                    padding: "6px 8px", // Compact padding
                    display: "flex",
                    gap: "4px",
                }}
            >
                <button
                    style={{
                        flex: 1,
                        padding: "4px", // Slimmer buttons
                        fontSize: "0.6rem",
                        border: `1px solid ${isMagPhase ? "#c5a059" : "#333"}`,
                        cursor: "pointer",
                        fontFamily: "Cinzel",
                        background: isMagPhase ? "rgba(197, 160, 89, 0.1)" : "#111",
                        color: isMagPhase ? "#c5a059" : "#666",
                        transition: "all 0.2s",
                    }}
                    onClick={() => setMixMode("mag-phase")}
                >
                    MAG / PHASE
                </button>
                <button
                    style={{
                        flex: 1,
                        padding: "4px", // Slimmer buttons
                        fontSize: "0.6rem",
                        border: `1px solid ${!isMagPhase ? "#d32f2f" : "#333"}`,
                        cursor: "pointer",
                        fontFamily: "Cinzel",
                        background: !isMagPhase ? "rgba(211, 47, 47, 0.1)" : "#111",
                        color: !isMagPhase ? "#d32f2f" : "#666",
                        transition: "all 0.2s",
                    }}
                    onClick={() => setMixMode("real-imag")}
                >
                    REAL / IMAG
                </button>
            </div>

            <div style={{ flex: 1, padding: "0 8px 8px", overflowY: "auto" }}>
                {[0, 1, 2, 3].map((i) => (
                    <div
                        key={i}
                        style={{
                            marginBottom: "6px", // Reduced margin between items
                            background: "rgba(0,0,0,0.4)",
                            padding: "6px", // Reduced padding inside items
                            borderLeft: "2px solid #c5a059",
                            // UPDATED: Removed opacity condition so controls always look active
                            opacity: 1,
                            transition: "opacity 0.3s",
                            pointerEvents: "auto",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "2px", // Tight header spacing
                            }}
                        >
                            <div
                                style={{
                                    fontSize: "0.65rem",
                                    color: "#fff",
                                    fontFamily: "Cinzel",
                                }}
                            >
                                GRIMOIRE PAGE {i + 1}
                            </div>

                            {!useFullRegion && (
                                <div
                                    style={{
                                        fontSize: "0.5rem",
                                        padding: "1px 4px",
                                        borderRadius: "2px",
                                        fontFamily: "Lato",
                                        fontWeight: "bold",
                                        background:
                                            regionTypes[i] === "inner"
                                                ? "rgba(197, 160, 89, 0.1)"
                                                : "rgba(50, 50, 50, 0.3)",
                                        color: regionTypes[i] === "inner" ? "#c5a059" : "#777",
                                        border: `1px solid ${
                                            regionTypes[i] === "inner" ? "#c5a059" : "#444"
                                        }`,
                                        cursor: "default",
                                    }}
                                >
                                    {regionTypes[i].toUpperCase()}
                                </div>
                            )}
                        </div>

                        {isMagPhase ? (
                            <>
                                <div style={labelStyle}>
                                    <span>Magnitude</span>
                                    <span style={{ color: "#c5a059" }}>
                    {weights[i].magnitude?.toFixed(1)}
                  </span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={weights[i].magnitude || 0}
                                    style={{
                                        width: "100%",
                                        accentColor: "#c5a059",
                                        margin: "2px 0",
                                        height: "10px", // Visual height
                                    }}
                                    onChange={(e) =>
                                        handleWeightChange(i, "magnitude", e.target.value)
                                    }
                                />

                                <div style={labelStyle}>
                                    <span>Phase</span>
                                    <span style={{ color: "#d32f2f" }}>
                    {weights[i].phase?.toFixed(1)}
                  </span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={weights[i].phase || 0}
                                    style={{
                                        width: "100%",
                                        accentColor: "#d32f2f",
                                        margin: "2px 0",
                                        height: "10px",
                                    }}
                                    onChange={(e) =>
                                        handleWeightChange(i, "phase", e.target.value)
                                    }
                                />
                            </>
                        ) : (
                            <>
                                <div style={labelStyle}>
                                    <span>Real</span>
                                    <span style={{ color: "#c5a059" }}>
                    {weights[i].real?.toFixed(1)}
                  </span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={weights[i].real || 0}
                                    style={{
                                        width: "100%",
                                        accentColor: "#c5a059",
                                        margin: "2px 0",
                                        height: "10px",
                                    }}
                                    onChange={(e) =>
                                        handleWeightChange(i, "real", e.target.value)
                                    }
                                />

                                <div style={labelStyle}>
                                    <span>Imag</span>
                                    <span style={{ color: "#d32f2f" }}>
                    {weights[i].imag?.toFixed(1)}
                  </span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={weights[i].imag || 0}
                                    style={{
                                        width: "100%",
                                        accentColor: "#d32f2f",
                                        margin: "2px 0",
                                        height: "10px",
                                    }}
                                    onChange={(e) =>
                                        handleWeightChange(i, "imag", e.target.value)
                                    }
                                />
                            </>
                        )}
                    </div>
                ))}
            </div>

            {/* Status Bar */}
            <div
                style={{
                    padding: "8px", // Compact padding
                    background: "#0a0a0c",
                    borderTop: "1px solid #333",
                    textAlign: "center",
                    fontFamily: "Cinzel",
                    fontSize: "0.75rem", // Slightly smaller
                    color: statusText.includes("CHANNELLING")
                        ? "#aaa"
                        : statusText.includes("CASTING")
                            ? "#fff"
                            : "#c5a059",
                    letterSpacing: "1px",
                }}
            >
                {statusText}
                {isProcessing && <span style={{ marginLeft: "10px" }}>✨</span>}
            </div>
        </div>
    );
};

export default MixerControls;