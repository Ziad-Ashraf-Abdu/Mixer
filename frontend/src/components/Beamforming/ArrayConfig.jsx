import React from 'react';

const ArrayConfig = ({ config, setConfig }) => {

    const handleChange = (key, val) => {
        setConfig(prev => ({ ...prev, [key]: val }));
    };

    const loadScenario = (name) => {
        if (name === '5G') {
            setConfig({ count: 32, geo: 'linear', curve: 0, steering: 30, scenario: '5G' });
        } else if (name === 'Ultrasound') {
            setConfig({ count: 64, geo: 'curved', curve: 8, steering: 0, scenario: 'Ultrasound' });
        } else if (name === 'Tumor') {
            setConfig({ count: 16, geo: 'curved', curve: 15, steering: 0, scenario: 'Tumor' });
        }
    };

    const labelStyle = { display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#888', fontFamily: 'Lato' };
    const btnStyle = (isActive) => ({
        flex: 1, padding: '6px', fontSize: '0.65rem', border:'1px solid #333', cursor: 'pointer', fontFamily: 'Cinzel',
        background: isActive ? '#d32f2f' : '#111',
        color: isActive ? '#fff' : '#666',
        transition: 'all 0.3s',
        clipPath: 'polygon(10% 0, 100% 0, 90% 100%, 0 100%)' // Angled buttons
    });

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#141418', borderRight: '1px solid #333' }}>

            {/* Header */}
            <div style={{ padding: '10px', background: '#0a0a0c', borderBottom: '1px solid #c5a059', textAlign:'center' }}>
                <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#c5a059', fontFamily: 'Cinzel', letterSpacing: '2px' }}>
                    ARRAY CONTROL
                </h3>
            </div>

            <div style={{ padding: '15px', overflowY: 'auto', flex: 1 }}>

                {/* Scenario Presets */}
                <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '8px', fontFamily: 'Cinzel' }}>SPELL PRESETS</div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button style={btnStyle(config.scenario === '5G')} onClick={() => loadScenario('5G')}>5G</button>
                        <button style={btnStyle(config.scenario === 'Ultrasound')} onClick={() => loadScenario('Ultrasound')}>SONAR</button>
                        <button style={btnStyle(config.scenario === 'Tumor')} onClick={() => loadScenario('Tumor')}>HEAL</button>
                    </div>
                </div>

                {/* Parameters */}
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', border: '1px solid #333', borderRadius: '4px' }}>

                    {/* Transmitters */}
                    <div style={{ marginBottom: '15px' }}>
                        <div style={labelStyle}><span>Mana Sources</span><span style={{color: '#c5a059'}}>{config.count}</span></div>
                        <input
                            type="range" min="2" max="128"
                            value={config.count}
                            onChange={e => handleChange('count', parseInt(e.target.value))}
                        />
                    </div>

                    {/* Steering */}
                    <div style={{ marginBottom: '15px' }}>
                        <div style={labelStyle}><span>Steering Angle</span><span style={{color: '#d32f2f'}}>{config.steering}°</span></div>
                        <input
                            type="range" min="-90" max="90"
                            value={config.steering}
                            onChange={e => handleChange('steering', parseInt(e.target.value))}
                        />
                    </div>

                    {/* Geometry */}
                    <div style={{ marginBottom: '15px' }}>
                        <div style={{...labelStyle, marginBottom: '5px'}}><span>Formation Shape</span></div>
                        <select
                            value={config.geo}
                            onChange={e => handleChange('geo', e.target.value)}
                            style={{
                                width: '100%', background: '#0a0a0c', color: '#e0e0e0', border: '1px solid #444',
                                padding: '6px', fontFamily: 'Cinzel', fontSize: '0.7rem'
                            }}
                        >
                            <option value="linear">LINEAR PHALANX</option>
                            <option value="curved">ARC FORMATION</option>
                        </select>
                    </div>

                    {/* Curvature (Conditional) */}
                    {config.geo === 'curved' && (
                        <div>
                            <div style={labelStyle}><span>Curvature Radius</span><span style={{color: '#aaa'}}>{config.curve}</span></div>
                            <input
                                type="range" min="1" max="20"
                                value={config.curve}
                                onChange={e => handleChange('curve', parseInt(e.target.value))}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ArrayConfig;