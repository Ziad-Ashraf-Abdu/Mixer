// components/Mixer/MixerControls.jsx
import React from 'react';

const MixerControls = ({ weights, setWeights, region, setRegion, mixMode, setMixMode, onProcess, isProcessing }) => {

    const handleWeightChange = (imgIndex, type, val) => {
        const newWeights = [...weights];
        newWeights[imgIndex] = { ...newWeights[imgIndex], [type]: parseFloat(val) };
        setWeights(newWeights);
    };

    const labelStyle = { display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#888', fontFamily: 'Lato' };

    // Determine which sliders to show based on mode
    const isMagPhase = mixMode === 'mag-phase';

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px', background: '#0a0a0c', borderBottom: '1px solid #333', textAlign:'center' }}>
                <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#c5a059', fontFamily: 'Cinzel', letterSpacing: '2px' }}>
                    MANA MIXER
                </h3>
            </div>

            {/* Mixing Mode Toggle */}
            <div style={{ padding: '0 10px 10px', display: 'flex', gap: '2px', background: 'rgba(0,0,0,0.4)' }}>
                <button
                    style={{
                        flex: 1, padding: '4px', fontSize: '0.65rem', border:'1px solid #333', cursor: 'pointer', fontFamily: 'Cinzel',
                        background: isMagPhase ? '#c5a059' : '#111',
                        color: isMagPhase ? '#000' : '#666'
                    }}
                    onClick={() => setMixMode('mag-phase')}
                >
                    MAG/PHASE
                </button>
                <button
                    style={{
                        flex: 1, padding: '4px', fontSize: '0.65rem', border:'1px solid #333', cursor: 'pointer', fontFamily: 'Cinzel',
                        background: !isMagPhase ? '#d32f2f' : '#111',
                        color: !isMagPhase ? '#fff' : '#666'
                    }}
                    onClick={() => setMixMode('real-imag')}
                >
                    REAL/IMAG
                </button>
            </div>

            <div style={{ flex: 1, padding: '10px', overflowY: 'auto' }}>
                {[0, 1, 2, 3].map(i => (
                    <div key={i} style={{ marginBottom: '10px', background: 'rgba(0,0,0,0.4)', padding: '8px', borderLeft: '2px solid #c5a059' }}>
                        <div style={{ fontSize: '0.7rem', color: '#fff', marginBottom: '4px', fontFamily: 'Cinzel' }}>
                            GRIMOIRE PAGE {i + 1}
                        </div>

                        {isMagPhase ? (
                            <>
                                <div style={labelStyle}><span>Magnitude</span><span style={{color: '#c5a059'}}>{weights[i].magnitude?.toFixed(1)}</span></div>
                                <input type="range" min="0" max="1" step="0.1" value={weights[i].magnitude || 0}
                                    onChange={(e) => handleWeightChange(i, 'magnitude', e.target.value)} />
                                
                                <div style={labelStyle}><span>Phase</span><span style={{color: '#d32f2f'}}>{weights[i].phase?.toFixed(1)}</span></div>
                                <input type="range" min="0" max="1" step="0.1" value={weights[i].phase || 0}
                                    onChange={(e) => handleWeightChange(i, 'phase', e.target.value)} />
                            </>
                        ) : (
                            <>
                                <div style={labelStyle}><span>Real</span><span style={{color: '#c5a059'}}>{weights[i].real?.toFixed(1)}</span></div>
                                <input type="range" min="0" max="1" step="0.1" value={weights[i].real || 0}
                                    onChange={(e) => handleWeightChange(i, 'real', e.target.value)} />
                                
                                <div style={labelStyle}><span>Imag</span><span style={{color: '#d32f2f'}}>{weights[i].imag?.toFixed(1)}</span></div>
                                <input type="range" min="0" max="1" step="0.1" value={weights[i].imag || 0}
                                    onChange={(e) => handleWeightChange(i, 'imag', e.target.value)} />
                            </>
                        )}
                    </div>
                ))}

                {/* Region Filter */}
                <div style={{ marginTop: '15px', padding: '8px', border: '1px solid #333', background: 'rgba(0,0,0,0.6)' }}>
                    <div style={{fontSize: '0.75rem', color: '#aaa', marginBottom: '6px', fontFamily: 'Cinzel', textAlign:'center'}}>
                        DOMAIN EXPANSION
                    </div>
                    <div style={{ display: 'flex', gap: '2px', marginBottom: '8px' }}>
                        <button style={{
                            flex: 1, padding: '4px', fontSize: '0.65rem', border:'1px solid #333', cursor: 'pointer', fontFamily: 'Cinzel',
                            background: region.type==='inner'?'#c5a059':'#111', color: region.type==='inner'?'#000':'#666',
                        }} onClick={() => setRegion({...region, type: 'inner'})}>
                            INNER
                        </button>
                        <button style={{
                            flex: 1, padding: '4px', fontSize: '0.65rem', border:'1px solid #333', cursor: 'pointer', fontFamily: 'Cinzel',
                            background: region.type==='outer'?'#d32f2f':'#111', color: region.type==='outer'?'#fff':'#666',
                        }} onClick={() => setRegion({...region, type: 'outer'})}>
                            OUTER
                        </button>
                    </div>
                    <div style={{fontSize: '0.6rem', color: '#666', textAlign: 'center', marginBottom:'2px'}}>Radius: {Math.round(region.size*100)}%</div>
                    <input type="range" min="0" max="1" step="0.05" value={region.size}
                        onChange={(e) => setRegion({...region, size: parseFloat(e.target.value)})} />
                </div>
            </div>

            <div style={{ padding: '12px', background: '#0a0a0c', borderTop: '1px solid #333' }}>
                <button 
                    onClick={onProcess} 
                    disabled={isProcessing}
                    style={{
                        width: '100%', padding: '10px', border: 'none', cursor: 'pointer',
                        background: isProcessing ? '#555' : 'linear-gradient(45deg, #d32f2f, #8b0000)',
                        color: 'white', fontFamily: 'Cinzel', fontSize: '0.9rem', letterSpacing: '1px',
                        boxShadow: isProcessing ? 'none' : '0 0 10px rgba(211, 47, 47, 0.4)',
                        clipPath: 'polygon(5% 0%, 100% 0%, 95% 100%, 0% 100%)',
                        opacity: isProcessing ? 0.7 : 1
                    }}
                >
                    {isProcessing ? 'CASTING...' : 'CAST ANTI-MAGIC'}
                </button>
            </div>
        </div>
    );
};

export default MixerControls;