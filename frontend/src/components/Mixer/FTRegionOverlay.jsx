import React, { useState, useRef, useEffect } from 'react';

const FTRegionOverlay = ({ region, setRegion }) => {
    const containerRef = useRef(null);

    // Interaction States
    const [interaction, setInteraction] = useState(null); // 'move', 'resize-right', 'resize-bottom', 'resize-corner'
    const [startPos, setStartPos] = useState({ x: 0, y: 0 }); // Mouse start pos
    const [startRegion, setStartRegion] = useState(null);     // Region state at start of drag

    // --- MOUSE HANDLERS ---
    const handleMouseDown = (e, type) => {
        e.stopPropagation();
        e.preventDefault(); // Prevent text selection
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

        if (interaction === 'move') {
            // Update Center X/Y
            newRegion.x = Math.min(1, Math.max(0, startRegion.x + deltaX));
            newRegion.y = Math.min(1, Math.max(0, startRegion.y + deltaY));
        }
        else {
            // Resize Logic: Symmetrical resize around current center
            // This mimics the "expanding" effect from the center point
            if (interaction.includes('right') || interaction.includes('corner')) {
                newRegion.width = Math.min(1.0, Math.max(0.05, startRegion.width + deltaX * 2));
            }
            if (interaction.includes('bottom') || interaction.includes('corner')) {
                newRegion.height = Math.min(1.0, Math.max(0.05, startRegion.height + deltaY * 2));
            }
        }

        setRegion(newRegion);
    };

    const handleMouseUp = () => {
        setInteraction(null);
        setStartRegion(null);
    };

    // --- CLICK HANDLER FOR SELECTION (INNER/OUTER) ---
    // We only trigger this if we didn't just drag/resize
    const handleClick = (e) => {
        // Simple heuristic: if interaction was active recently, ignore.
        // But since handleMouseUp clears interaction immediately, we rely on checking
        // if the mouse moved significantly or assume the user knows.
        // Better approach: check if it's a "click" (mousedown and up on same spot).
        // For now, if we weren't interacting, we process logic.
        // Note: handleMouseDown calls stopPropagation, so this onClick on parent usually only fires
        // if we click outside the rectangle OR if we didn't drag.

        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Current Rectangle Geometry in Pixels
        const cx = rect.width * region.x;
        const cy = rect.height * region.y;
        const rw = (rect.width * region.width) / 2;
        const rh = (rect.height * region.height) / 2;

        const insideX = mouseX >= cx - rw && mouseX <= cx + rw;
        const insideY = mouseY >= cy - rh && mouseY <= cy + rh;

        if (insideX && insideY) {
            setRegion(prev => ({ ...prev, type: 'inner' }));
        } else {
            setRegion(prev => ({ ...prev, type: 'outer' }));
        }
    };

    // Attach global mouse listeners
    useEffect(() => {
        if (interaction) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [interaction, startRegion, startPos]);

    // --- RENDER HELPERS ---
    // Convert center (x,y) and size (w,h) to Top/Left corner percentages
    const leftPct = (region.x - region.width / 2) * 100;
    const topPct = (region.y - region.height / 2) * 100;
    const widthPct = region.width * 100;
    const heightPct = region.height * 100;

    const hashPattern = `repeating-linear-gradient(45deg, rgba(197, 160, 89, 0.4) 0, rgba(197, 160, 89, 0.4) 1px, transparent 0, transparent 8px)`;

    return (
        <div
            ref={containerRef}
            onClick={handleClick}
            style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                zIndex: 10, cursor: 'pointer', overflow: 'hidden'
            }}
        >
            {/* 1. OUTER HASHING */}
            {region.type === 'outer' && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundImage: hashPattern, pointerEvents: 'none'
                }} />
            )}

            {/* 2. THE RECTANGLE */}
            <div
                onMouseDown={(e) => handleMouseDown(e, 'move')}
                style={{
                    position: 'absolute',
                    left: `${leftPct}%`, top: `${topPct}%`,
                    width: `${widthPct}%`, height: `${heightPct}%`,
                    border: '2px solid #c5a059',
                    boxShadow: '0 0 10px rgba(197, 160, 89, 0.5)',
                    background: region.type === 'inner' ? hashPattern : '#00000099',
                    cursor: 'move', // Indicate draggable body
                }}
            >
                {/* Resize Handles */}
                <div
                    onMouseDown={(e) => handleMouseDown(e, 'resize-right')}
                    style={{ position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)', width: 8, height: 20, cursor: 'ew-resize', background: '#fff', borderRadius: 2 }}
                />
                <div
                    onMouseDown={(e) => handleMouseDown(e, 'resize-bottom')}
                    style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)', width: 20, height: 8, cursor: 'ns-resize', background: '#fff', borderRadius: 2 }}
                />
                <div
                    onMouseDown={(e) => handleMouseDown(e, 'resize-corner')}
                    style={{ position: 'absolute', bottom: -5, right: -5, width: 12, height: 12, cursor: 'nwse-resize', background: '#c5a059', border: '1px solid white' }}
                />
            </div>
        </div>
    );
};

export default FTRegionOverlay;