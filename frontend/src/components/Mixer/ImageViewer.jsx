import React, { useState, useRef, useEffect } from 'react';
import { fetchComponent } from '../../api';
import { FaPlus } from 'react-icons/fa';
import FTRegionOverlay from './FTRegionOverlay';

// --- INTERNAL HELPER COMPONENT ---
const ViewportHalf = ({
                          titleHeader,
                          imageSrc,
                          bcState,
                          setBcState,
                          onDoubleClick,
                          isPlaceholder,
                          borderStyle,
                          overlay,
                          enableAdjustments = false
                      }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleMouseDown = () => {
        if (enableAdjustments) setIsDragging(true);
    };

    const handleMouseUp = () => {
        if (enableAdjustments) setIsDragging(false);
    };

    const handleMouseLeave = () => {
        if (enableAdjustments) setIsDragging(false);
    };

    const handleMouseMove = (e) => {
        if (!isDragging || !enableAdjustments || !setBcState) return;
        setBcState(prev => ({
            b: Math.max(0, prev.b - e.movementY * 1.5),
            c: Math.max(0, prev.c + e.movementX * 1.5)
        }));
    };

    return (
        <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            ...borderStyle
        }}>
            {/* Header Section */}
            <div className="viewer-header" style={{ padding: '4px 6px', background: '#111', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '24px' }}>
                {titleHeader}
            </div>

            {/* Image Container */}
            <div
                className="img-container"
                style={{
                    flex: 1,
                    position: 'relative',
                    cursor: enableAdjustments ? 'grab' : 'default',
                    background: '#050505',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}
                onDoubleClick={onDoubleClick}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onMouseMove={handleMouseMove}
            >
                {imageSrc ? (
                    <img
                        src={imageSrc}
                        style={{
                            width: '100%', height: '100%', objectFit: 'contain',
                            filter: `brightness(${bcState.b}%) contrast(${bcState.c}%)`,
                            pointerEvents: 'none', userSelect: 'none'
                        }}
                        alt="viewport content"
                    />
                ) : (
                    isPlaceholder && (
                        <div style={{
                            width: '50px', height: '50px',
                            border: '2px dashed #444', borderRadius: '50%',
                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                            color: '#444', cursor: 'pointer'
                        }}>
                            <FaPlus size={14} />
                        </div>
                    )
                )}

                {/* OVERLAY RENDERED HERE */}
                {overlay}

                {/* B/C Overlay (Only show if enabled and changed) */}
                {enableAdjustments && (bcState.b !== 100 || bcState.c !== 100) && (
                    <div style={{
                        position: 'absolute', bottom: 2, right: 2, pointerEvents: 'none',
                        background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '8px', padding: '1px 3px', fontFamily: 'Lato'
                    }}>
                        B:{Math.round(bcState.b)} C:{Math.round(bcState.c)}
                    </div>
                )}
            </div>
        </div>
    );
};


// --- MAIN COMPONENT ---
const ImageViewer = ({ id, imageId, onUpload, region, setRegion }) => {
    const [componentType, setComponentType] = useState('Magnitude');

    // Image Data States
    const [originalSrc, setOriginalSrc] = useState(null);
    const [componentSrc, setComponentSrc] = useState(null);

    // Brightness/Contrast State (Only for Original now)
    const [bcOriginal, setBcOriginal] = useState({ b: 100, c: 100 });

    // Fixed state for component view (no adjustment)
    const bcFixed = { b: 100, c: 100 };

    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!imageId) { setOriginalSrc(null); return; }
        fetchComponent(id, 'Original')
            .then(res => setOriginalSrc(res.data.image))
            .catch(e => console.error("Failed to load original", e));
    }, [imageId, id]);

    useEffect(() => {
        if (!imageId) { setComponentSrc(null); return; }
        fetchComponent(id, componentType)
            .then(res => setComponentSrc(res.data.image))
            .catch(e => console.error("Failed to load component", e));
    }, [imageId, componentType, id]);

    const handleFileChange = (e) => {
        if (e.target.files[0]) onUpload(id, e.target.files[0]);
    };

    const triggerUpload = () => fileInputRef.current?.click();

    return (
        <div className="viewer-wrapper" style={{
            display: 'flex',
            flexDirection: 'row',
            height: '100%',
            background: '#0a0a0c',
            border: '1px solid #333',
            overflow: 'hidden'
        }}>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} accept="image/*" />

            {/* --- LEFT HALF: FIXED ORIGINAL (Adjustable) --- */}
            <ViewportHalf
                titleHeader={<strong style={{ fontSize: '0.7rem', color: '#c5a059', fontFamily: 'Cinzel' }}>Original {id + 1}</strong>}
                imageSrc={originalSrc}
                bcState={bcOriginal}
                setBcState={setBcOriginal}
                onDoubleClick={triggerUpload}
                isPlaceholder={true}
                borderStyle={{ borderRight: '1px solid #333' }}
                enableAdjustments={true} // ENABLED
            />

            {/* --- RIGHT HALF: COMPONENT SELECTOR + REGION OVERLAY (Not Adjustable) --- */}
            <ViewportHalf
                titleHeader={
                    <>
                        <strong style={{ fontSize: '0.7rem', color: '#888', fontFamily: 'Cinzel' }}>View</strong>
                        <select
                            value={componentType}
                            onChange={(e) => setComponentType(e.target.value)}
                            disabled={!imageId}
                            style={{ fontSize: '0.65rem', background: '#222', color: '#eee', border: '1px solid #444', padding: '0 2px', height: '18px', fontFamily: 'Lato' }}
                        >
                            <option value="Magnitude">Mag</option>
                            <option value="Phase">Phase</option>
                            <option value="Real">Real</option>
                            <option value="Imaginary">Imag</option>
                        </select>
                    </>
                }
                imageSrc={componentSrc}
                bcState={bcFixed} // Fixed 100/100
                setBcState={null} // No setter
                isPlaceholder={false}
                borderStyle={{}}
                enableAdjustments={false} // DISABLED
                overlay={<FTRegionOverlay region={region} setRegion={setRegion} />}
            />
        </div>
    );
};

export default ImageViewer;