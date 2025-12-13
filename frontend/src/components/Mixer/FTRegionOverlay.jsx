import React, { useState, useRef, useEffect } from 'react';

const FTRegionOverlay = ({ region, setRegion }) => {
    const containerRef = useRef(null);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeEdge, setResizeEdge] = useState(null); // 'right', 'bottom', 'corner'

    // --- MOUSE HANDLERS FOR RESIZING ---
    const handleMouseDown = (e, edge) => {
        e.stopPropagation(); // Prevent clicking through to the region toggle
        setIsResizing(true);
        setResizeEdge(edge);
    };

    const handleMouseMove = (e) => {
        if (!isResizing || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate new percentages (clamped 0.1 to 1.0)
        let newWidth = region.width;
        let newHeight = region.height;

        // Since rectangle is always centered:
        // Width is determined by distance from center * 2
        if (resizeEdge === 'right' || resizeEdge === 'corner') {
            const distX = Math.abs(mouseX - rect.width / 2);
            newWidth = Math.min(1.0, Math.max(0.1, (distX * 2) / rect.width));
        }
        if (resizeEdge === 'bottom' || resizeEdge === 'corner') {
            const distY = Math.abs(mouseY - rect.height / 2);
            newHeight = Math.min(1.0, Math.max(0.1, (distY * 2) / rect.height));
        }

        setRegion({ ...region, width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
        setIsResizing(false);
        setResizeEdge(null);
    };

    // --- CLICK HANDLER FOR SELECTION (INNER/OUTER) ---
    const handleClick = (e) => {
        if (isResizing) return; // Don't toggle if we just finished resizing

        // Check if click was inside the rectangle
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Center coordinates
        const cx = rect.width / 2;
        const cy = rect.height / 2;

        // Pixel dimensions of current selection box
        const rw = rect.width * region.width;
        const rh = rect.height * region.height;

        // Check boundaries
        const insideX = mouseX >= cx - rw/2 && mouseX <= cx + rw/2;
        const insideY = mouseY >= cy - rh/2 && mouseY <= cy + rh/2;

        if (insideX && insideY) {
            setRegion({ ...region, type: 'inner' });
        } else {
            setRegion({ ...region, type: 'outer' });
        }
    };

    // Attach global mouse listeners when resizing
    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    // --- RENDER HELPERS ---
    const pctW = region.width * 100;
    const pctH = region.height * 100;
    const left = (100 - pctW) / 2;
    const top = (100 - pctH) / 2;

    // SVG Pattern Definition
    const PatternDef = () => (
        <svg width="0" height="0">
            <defs>
                <pattern id="hashPattern" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <line x1="0" y1="0" x2="0" y2="10" stroke="#c5a059" strokeWidth="2" strokeOpacity="0.5" />
                </pattern>
            </defs>
        </svg>
    );

    return (
        <div
            ref={containerRef}
            onClick={handleClick}
            style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                zIndex: 10, cursor: 'crosshair', overflow: 'hidden'
            }}
        >
            <PatternDef />

            {/* HASHING OVERLAY */}
            {/* If Inner Selected: Hash the rectangle. If Outer Selected: Hash the background (using clip-path magic or simpler div layering) */}

            {region.type === 'outer' && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundImage: 'repeating-linear-gradient(45deg, rgba(197, 160, 89, 0.2) 0, rgba(197, 160, 89, 0.2) 1px, transparent 0, transparent 10px)'
                }} />
            )}

            {/* THE RECTANGLE */}
            <div style={{
                position: 'absolute',
                left: `${left}%`, top: `${top}%`,
                width: `${pctW}%`, height: `${pctH}%`,
                border: '2px solid #c5a059',
                boxShadow: '0 0 10px rgba(197, 160, 89, 0.5)',
                // Inner Hash
                background: region.type === 'inner' ?
                    'repeating-linear-gradient(45deg, rgba(197, 160, 89, 0.3) 0, rgba(197, 160, 89, 0.3) 2px, transparent 0, transparent 8px)'
                    : '#00000088' // Dim inner if outer selected
            }}>
                {/* Resize Handles */}
                {/* Right Edge */}
                <div
                    onMouseDown={(e) => handleMouseDown(e, 'right')}
                    style={{ position: 'absolute', right: -5, top: '50%', transform: 'translateY(-50%)', width: 10, height: 20, cursor: 'ew-resize', background: '#fff', borderRadius: 2 }}
                />
                {/* Bottom Edge */}
                <div
                    onMouseDown={(e) => handleMouseDown(e, 'bottom')}
                    style={{ position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)', width: 20, height: 10, cursor: 'ns-resize', background: '#fff', borderRadius: 2 }}
                />
                {/* Corner */}
                <div
                    onMouseDown={(e) => handleMouseDown(e, 'corner')}
                    style={{ position: 'absolute', bottom: -5, right: -5, width: 12, height: 12, cursor: 'nwse-resize', background: '#c5a059', border: '1px solid white' }}
                />
            </div>
        </div>
    );
};

export default FTRegionOverlay;