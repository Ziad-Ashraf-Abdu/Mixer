import React, { useState, useRef, useEffect } from 'react';
import { fetchComponent } from '../../api';
import { FaPlus } from 'react-icons/fa'; // Clean plus icon

const ImageViewer = ({ id, imageId, onUpload }) => {
    const [componentType, setComponentType] = useState('Original');
    const [displaySrc, setDisplaySrc] = useState(null);
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (imageId === null || imageId === undefined) return;
        const loadView = async () => {
            try {
                const res = await fetchComponent(id, componentType);
                setDisplaySrc(res.data.image);
            } catch (err) { console.error(err); }
        };
        loadView();
    }, [imageId, componentType, id]);

    const handleFileChange = (e) => { if (e.target.files[0]) onUpload(id, e.target.files[0]); };
    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setBrightness(prev => Math.max(0, prev - (e.movementY * 1.5)));
        setContrast(prev => Math.max(0, prev + (e.movementX * 1.5)));
    };

    return (
        <div className="viewer-wrapper">
            <div className="viewer-header">
                <strong>SLOT {id + 1}</strong>
                <select
                    value={componentType} onChange={(e) => setComponentType(e.target.value)}
                    disabled={imageId === null}
                >
                    <option value="Original">Original</option>
                    <option value="Magnitude">Mag</option>
                    <option value="Phase">Phase</option>
                    <option value="Real">Real</option>
                    <option value="Imaginary">Imag</option>
                </select>
            </div>

            <div className="img-container"
                 onDoubleClick={() => fileInputRef.current.click()}
                 onMouseDown={() => setIsDragging(true)}
                 onMouseUp={() => setIsDragging(false)}
                 onMouseLeave={() => setIsDragging(false)}
                 onMouseMove={handleMouseMove}
            >
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />

                {displaySrc ? (
                    <img src={displaySrc} style={{
                        width: '100%', height: '100%', objectFit: 'contain',
                        filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                        pointerEvents: 'none', userSelect: 'none'
                    }}/>
                ) : (
                    // Magic Circle Placeholder
                    <div style={{
                        width: '80px', height: '80px',
                        border: '2px dashed #333', borderRadius: '50%',
                        display:'flex', justifyContent:'center', alignItems:'center',
                        color: '#444', animation: 'spin 10s linear infinite'
                    }}>
                        <FaPlus />
                    </div>
                )}

                {(brightness !== 100 || contrast !== 100) && (
                    <div style={{position:'absolute', bottom:2, right:2, background:'var(--anti-magic)', color:'white', fontSize:'9px', padding:'1px 4px', fontFamily:'Lato'}}>
                        B:{Math.round(brightness)} C:{Math.round(contrast)}
                    </div>
                )}
            </div>
        </div>
    );
};
export default ImageViewer;