import React, { useState, useRef, useEffect } from "react";

const FTRegionOverlay = ({
                             region,
                             setRegion,
                             regionType,
                             setRegionType,
                             hasImage,
                             isHidden, // 1. NEW PROP: Hides overlay if true
                         }) => {
    const containerRef = useRef(null);

    // Interaction States
    const [interaction, setInteraction] = useState(null);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [startRegion, setStartRegion] = useState(null);

    // --- MOUSE HANDLERS ---
    const handleMouseDown = (e, type) => {
        e.stopPropagation();
        e.preventDefault();
        if (!containerRef.current) return;

        setInteraction(type);
        setStartPos({ x: e.clientX, y: e.clientY });
        setStartRegion({ ...region });
    };

    const handleMouseMove = (e) => {
        if (!interaction || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();

        // Calculate Delta as percentage of container dimensions
        const deltaX = (e.clientX - startPos.x) / rect.width;
        const deltaY = (e.clientY - startPos.y) / rect.height;

        let newRegion = { ...startRegion };

        if (interaction === "move") {
            newRegion.x = Math.min(1, Math.max(0, startRegion.x + deltaX));
            newRegion.y = Math.min(1, Math.max(0, startRegion.y + deltaY));
        } else {
            if (interaction.includes("right") || interaction.includes("corner")) {
                newRegion.width = Math.min(
                    1.0,
                    Math.max(0.05, startRegion.width + deltaX * 2)
                );
            }
            if (interaction.includes("bottom") || interaction.includes("corner")) {
                newRegion.height = Math.min(
                    1.0,
                    Math.max(0.05, startRegion.height + deltaY * 2)
                );
            }
        }

        setRegion(newRegion);
    };

    const handleMouseUp = () => {
        setInteraction(null);
        setStartRegion(null);
    };

    // --- CLICK HANDLER ---
    const handleClick = (e) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const cx = rect.width * region.x;
        const cy = rect.height * region.y;
        const rw = (rect.width * region.width) / 2;
        const rh = (rect.height * region.height) / 2;

        const insideX = mouseX >= cx - rw && mouseX <= cx + rw;
        const insideY = mouseY >= cy - rh && mouseY <= cy + rh;

        if (insideX && insideY) {
            setRegionType("inner");
        } else {
            setRegionType("outer");
        }
    };

    useEffect(() => {
        if (interaction) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [interaction, startRegion, startPos]);

    // 2. CHECK: Return null if no image OR if isHidden is true
    if (!hasImage || isHidden) {
        return null;
    }

    const leftPct = (region.x - region.width / 2) * 100;
    const topPct = (region.y - region.height / 2) * 100;
    const widthPct = region.width * 100;
    const heightPct = region.height * 100;

    const maskColor = "rgba(197, 160, 89, 0.3)";

    return (
        <div
            ref={containerRef}
            onClick={handleClick}
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                zIndex: 10,
                cursor: "pointer",
                overflow: "hidden",
            }}
        >
            {regionType === "outer" && (
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        background: maskColor,
                        pointerEvents: "none",
                    }}
                />
            )}

            <div
                onMouseDown={(e) => handleMouseDown(e, "move")}
                style={{
                    position: "absolute",
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    width: `${widthPct}%`,
                    height: `${heightPct}%`,
                    border: "2px solid #c5a059",
                    boxShadow: "0 0 10px rgba(197, 160, 89, 0.5)",
                    background: regionType === "inner" ? maskColor : "#00000099",
                    cursor: "move",
                }}
            >
                <div
                    onMouseDown={(e) => handleMouseDown(e, "resize-right")}
                    style={{
                        position: "absolute",
                        right: -4,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: 8,
                        height: 20,
                        cursor: "ew-resize",
                        background: "#fff",
                        borderRadius: 2,
                    }}
                />
                <div
                    onMouseDown={(e) => handleMouseDown(e, "resize-bottom")}
                    style={{
                        position: "absolute",
                        bottom: -4,
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: 20,
                        height: 8,
                        cursor: "ns-resize",
                        background: "#fff",
                        borderRadius: 2,
                    }}
                />
                <div
                    onMouseDown={(e) => handleMouseDown(e, "resize-corner")}
                    style={{
                        position: "absolute",
                        bottom: -5,
                        right: -5,
                        width: 12,
                        height: 12,
                        cursor: "nwse-resize",
                        background: "#c5a059",
                        border: "1px solid white",
                    }}
                />
            </div>
        </div>
    );
};

export default FTRegionOverlay;