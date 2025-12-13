// frontend/src/components/Mixer/OutputViewer.jsx
import React from 'react';
import { FaMagic } from 'react-icons/fa';

const OutputViewer = ({ id, imageSrc, isSelected, onSelect }) => {

    // Custom styled radio/checkbox look for the "Active" toggle
    const toggleStyle = {
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        fontSize: '0.65rem',
        fontFamily: 'Cinzel',
        color: isSelected ? '#c5a059' : '#666',
        border: `1px solid ${isSelected ? '#c5a059' : '#333'}`,
        padding: '2px 6px',
        borderRadius: '4px',
        background: isSelected ? 'rgba(197, 160, 89, 0.1)' : 'transparent',
        transition: 'all 0.3s'
    };

    const indicatorStyle = {
        width: '8px', height: '8px',
        borderRadius: '50%',
        background: isSelected ? '#c5a059' : '#333',
        boxShadow: isSelected ? '0 0 5px #c5a059' : 'none'
    };

    return (
        <div className="viewer-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0a0a0c', border: `1px solid ${isSelected ? '#c5a059' : '#333'}` }}>

            {/* HEADER with Select Toggle */}
            <div className="viewer-header" style={{ padding: '6px', background: '#111', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '0.75rem', color: isSelected ? '#c5a059' : '#888' }}>OUTPUT {id}</strong>

                {/* The Selection Toggle */}
                <div style={toggleStyle} onClick={onSelect}>
                    <div style={indicatorStyle}></div>
                    <span>ACTIVE DESTINATION</span>
                </div>
            </div>

            {/* IMAGE DISPLAY AREA (Static, no adjustment) */}
            <div
                className="img-container"
                style={{ flex: 1, position: 'relative', background: '#050505' }}
            >
                {imageSrc ? (
                    <img
                        src={imageSrc}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            pointerEvents: 'none', userSelect: 'none'
                        }}
                        alt={`Output ${id}`}
                    />
                ) : (
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        color: '#333', fontFamily: 'Cinzel', fontSize: '0.7rem', gap: '10px'
                    }}>
                        <FaMagic size={20} />
                        <span>WAITING FOR SPELL...</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OutputViewer;