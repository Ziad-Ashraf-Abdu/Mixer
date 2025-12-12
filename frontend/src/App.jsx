import React, { useState, useEffect } from 'react';
import ImageViewer from './components/Mixer/ImageViewer';
import MixerControls from './components/Mixer/MixerControls';
import ArrayConfig from './components/Beamforming/ArrayConfig';
import InterferenceMap from './components/Beamforming/InterferenceMap';
import { uploadImage, processMix, simulateBeam } from './api';
import './App.css'; // Assume basic flex styling

function App() {
    const [activeTab, setActiveTab] = useState('mixer'); // 'mixer' | 'beamforming'

    // --- Mixer State ---
    // Tracks if image is uploaded (true/false) or holds ID
    const [imageIds, setImageIds] = useState([null, null, null, null]);
    const [weights, setWeights] = useState([
        { magnitude: 1, phase: 1 }, // Image 1 defaults to ON
        { magnitude: 0, phase: 0 },
        { magnitude: 0, phase: 0 },
        { magnitude: 0, phase: 0 }
    ]);
    const [region, setRegion] = useState({ type: 'inner', size: 0.5 });

    const [selectedPort, setSelectedPort] = useState(1);
    const [output1, setOutput1] = useState(null);
    const [output2, setOutput2] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // --- Beamforming State ---
    const [beamConfig, setBeamConfig] = useState({
        count: 16, geo: 'linear', curve: 0, steering: 0, scenario: 'Custom'
    });
    const [beamMap, setBeamMap] = useState(null);

    // --- Handlers ---

    const handleUpload = async (index, file) => {
        try {
            // Optimistic UI update or wait for ID
            const res = await uploadImage(index, file);
            // Backend should confirm the ID or just return success
            // We force a re-render of the viewer by setting the ID
            const newIds = [...imageIds];
            newIds[index] = "uploaded";
            setImageIds(newIds);
        } catch (err) {
            alert("Upload Failed");
        }
    };

    const handleMix = async () => {
        setIsProcessing(true);
        try {
            const payload = {
                weights: weights,
                region_type: region.type,
                region_size: region.size
            };
            const res = await processMix(payload);

            if (selectedPort === 1) setOutput1(res.data.image);
            else setOutput2(res.data.image);

        } catch (err) {
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };

    // Real-time beamforming effect
    useEffect(() => {
        if (activeTab !== 'beamforming') return;

        const timer = setTimeout(async () => {
            try {
                const res = await simulateBeam(beamConfig);
                setBeamMap(res.data.map);
            } catch (err) {
                console.error(err);
            }
        }, 100); // Debounce to prevent too many requests while dragging
        return () => clearTimeout(timer);
    }, [beamConfig, activeTab]);

    return (
        <div className="app-container" style={{ fontFamily: 'Arial, sans-serif', height: '100vh', display: 'flex', flexDirection: 'column' }}>

            {/* Navigation */}
            <nav style={{ padding: '15px', background: '#222', color: 'white', display: 'flex', gap: '20px' }}>
                <h2 style={{margin: 0}}>DSP Task 4</h2>
                <button onClick={() => setActiveTab('mixer')} disabled={activeTab==='mixer'}>FT Mixer</button>
                <button onClick={() => setActiveTab('beamforming')} disabled={activeTab==='beamforming'}>Beamforming</button>
            </nav>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {activeTab === 'mixer' ? (
                    <>
                        {/* Left: 4 Input Images */}
                        <div style={{ flex: 2, padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', overflowY: 'auto' }}>
                            {imageIds.map((imgId, idx) => (
                                <ImageViewer
                                    key={idx}
                                    id={idx}
                                    imageId={imgId}
                                    onUpload={handleUpload}
                                />
                            ))}
                        </div>

                        {/* Middle: Controls */}
                        <div style={{ width: '300px', backgroundColor: '#f9f9f9', overflowY: 'auto' }}>
                            <MixerControls
                                weights={weights}
                                setWeights={setWeights}
                                region={region}
                                setRegion={setRegion}
                                onProcess={handleMix}
                            />

                            {/* Port Selector */}
                            <div style={{ padding: '20px', borderTop: '1px solid #ddd' }}>
                                <h4>Output Destination</h4>
                                <label>
                                    <input
                                        type="radio" name="port"
                                        checked={selectedPort === 1}
                                        onChange={() => setSelectedPort(1)}
                                    /> Port 1
                                </label>
                                <label style={{marginLeft: '15px'}}>
                                    <input
                                        type="radio" name="port"
                                        checked={selectedPort === 2}
                                        onChange={() => setSelectedPort(2)}
                                    /> Port 2
                                </label>
                            </div>
                        </div>

                        {/* Right: Output Ports */}
                        <div style={{ flex: 1, padding: '10px', background: '#eee', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="output-port" style={{ flex: 1, border: '2px dashed #999', background: 'white', position: 'relative' }}>
                                <span style={{position: 'absolute', top: 0, left: 0, background: '#333', color: 'white', padding: '2px 5px'}}>Output 1</span>
                                {output1 && <img src={output1} style={{width: '100%', height: '100%', objectFit: 'contain'}} />}
                                {isProcessing && selectedPort === 1 && <div style={{position:'absolute', bottom:0, width:'100%', background:'blue', color:'white'}}>Processing...</div>}
                            </div>

                            <div className="output-port" style={{ flex: 1, border: '2px dashed #999', background: 'white', position: 'relative' }}>
                                <span style={{position: 'absolute', top: 0, left: 0, background: '#333', color: 'white', padding: '2px 5px'}}>Output 2</span>
                                {output2 && <img src={output2} style={{width: '100%', height: '100%', objectFit: 'contain'}} />}
                            </div>
                        </div>
                    </>
                ) : (
                    /* BEAMFORMING VIEW */
                    <>
                        <ArrayConfig config={beamConfig} setConfig={setBeamConfig} />
                        <InterferenceMap mapImage={beamMap} />
                    </>
                )}
            </div>
        </div>
    );
}

export default App;