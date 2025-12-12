// src/components/Mixer/ImageViewer.jsx
import React, { useState, useRef, useEffect } from 'react';
import { fetchComponent } from '../../api';
import { FaPlus } from 'react-icons/fa';

const ImageViewer = ({ id, imageId, onUpload }) => {
    const [componentType, setComponentType] = useState('Original');
    const [displaySrc, setDisplaySrc] = useState(null);
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    // Fetch component when imageId or componentType changes
    useEffect(() => {
        if (imageId == null) {
            setDisplaySrc(null);
            return;
        }
        const loadView = async () => {
            try {
                const res = await fetchComponent(id, componentType);
                setDisplaySrc('data:' + res.data.image);
            } catch (err) {
                console.error('Failed to fetch component', err);
                setDisplaySrc(null);
            }
        };
        loadView();
    }, [imageId, componentType, id]); // imageId change triggers re-fetch

    const handleFileChange = (e) => {
        if (e.target.files[0]) onUpload(id, e.target.files[0]);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setBrightness(prev => Math.max(0, prev - e.movementY * 1.5));
        setContrast(prev => Math.max(0, prev + e.movementX * 1.5));
    };

    return (
        <div className="viewer-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0a0a0c', border: '1px solid #333' }}>
            <div className="viewer-header" style={{ padding: '6px', background: '#111', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '0.75rem', color: '#c5a059' }}>SLOT {id + 1}</strong>
                <select
                    value={componentType}
                    onChange={(e) => setComponentType(e.target.value)}
                    disabled={imageId === null}
                    style={{ fontSize: '0.7rem', background: '#222', color: '#eee', border: '1px solid #444' }}
                >
                    <option value="Original">Original</option>
                    <option value="Magnitude">Mag</option>
                    <option value="Phase">Phase</option>
                    <option value="Real">Real</option>
                    <option value="Imaginary">Imag</option>
                </select>
            </div>

            <div
                className="img-container"
                style={{ flex: 1, position: 'relative', cursor: 'pointer' }}
                onDoubleClick={() => fileInputRef.current?.click()}
                onMouseDown={() => setIsDragging(true)}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
                onMouseMove={handleMouseMove}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                    accept="image/*"
                />

                {displaySrc ? (
                    <img
                        src={displaySrc}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                            pointerEvents: 'none'
                        }}
                        alt="component"
                    />
                ) : (
                    <div style={{
                        width: '80px', height: '80px',
                        border: '2px dashed #555', borderRadius: '50%',
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        color: '#555', margin: 'auto'
                    }}>
                        <FaPlus />
                    </div>
                )}

                {(brightness !== 100 || contrast !== 100) && (
                    <div style={{
                        position: 'absolute',
                        bottom: 2,
                        right: 2,
                        background: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        fontSize: '9px',
                        padding: '1px 4px'
                    }}>
                        B:{Math.round(brightness)} C:{Math.round(contrast)}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageViewer;