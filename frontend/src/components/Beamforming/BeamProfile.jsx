// components/Beamforming/BeamProfile.jsx
import React from 'react';

const BeamProfile = ({ profileImage, isLoading }) => {
    return (
        <div style={{
            height: '200px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: '#050505',
            border: '1px solid #333',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {profileImage ? (
                <img
                    src={profileImage}
                    alt="Beam Pattern"
                    style={{ height: '100%', width: 'auto', objectFit: 'contain' }}
                />
            ) : (
                <span style={{ color: '#444', fontFamily: 'Cinzel', fontSize: '0.8rem' }}>
                    {isLoading ? 'Loading beam profile...' : 'Adjust array to see pattern'}
                </span>
            )}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                background: 'rgba(0,0,0,0.7)', padding: '3px 8px', fontSize: '0.65rem',
                color: '#c5a059', fontFamily: 'Cinzel', textAlign: 'center'
            }}>
                BEAM PROFILE (AZIMUTH)
            </div>
        </div>
    );
};

export default BeamProfile;