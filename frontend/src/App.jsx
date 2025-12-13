// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import ImageViewer from './components/Mixer/ImageViewer';
import MixerControls from './components/Mixer/MixerControls';
import OutputViewer from './components/Mixer/OutputViewer'; // NEW IMPORT
import ArrayConfig from './components/Beamforming/ArrayConfig';
import InterferenceMap from './components/Beamforming/InterferenceMap';
import BeamProfile from './components/Beamforming/BeamProfile';
import { uploadImage, fetchComponent, processMix, simulateBeam, getBeamProfile } from './api';
import './App.css';

function App() {
    const [activeTab, setActiveTab] = useState('mixer');

    // --- Mixer State ---
    const [imageIds, setImageIds] = useState([null, null, null, null]);
    const [weights, setWeights] = useState([
        { magnitude: 1, phase: 1 },
        { magnitude: 0, phase: 0 },
        { magnitude: 0, phase: 0 },
        { magnitude: 0, phase: 0 }
    ]);
    const [region, setRegion] = useState({ type: 'inner', size: 0.5 });
    const [mixMode, setMixMode] = useState('mag-phase');
    const [selectedPort, setSelectedPort] = useState(1);
    const [output1, setOutput1] = useState(null);
    const [output2, setOutput2] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const mixAbortControllerRef = useRef(null);

    // --- Beamforming State ---
    const [beamArrays, setBeamArrays] = useState([{
        count: 16, geo: 'linear', curve: 0, steering: 0, x: 0, y: 0, id: Date.now()
    }]);
    const [activeArrayIndex, setActiveArrayIndex] = useState(0);
    const [beamMap, setBeamMap] = useState(null);
    const [beamProfileImg, setBeamProfileImg] = useState(null);
    const beamAbortControllerRef = useRef(null);

    // --- Upload Handler ---
    const handleUpload = async (index, file) => {
        try {
            await uploadImage(index, file);
            const newIds = [...imageIds];
            newIds[index] = Date.now(); // Force re-render
            setImageIds(newIds);
        } catch (err) {
            console.error('Upload error:', err);
            let msg = 'Upload failed';
            if (err.response?.data?.detail) {
                msg += ': ' + err.response.data.detail;
            } else if (!err.request) {
                msg += ': Network error (is backend running?)';
            }
            alert(msg);
        }
    };

    // --- Mix Handler ---
    const handleMix = async () => {
        if (mixAbortControllerRef.current) {
            mixAbortControllerRef.current.abort();
        }
        const ac = new AbortController();
        mixAbortControllerRef.current = ac;
        setIsProcessing(true);

        try {
            const payload = {
                weights,
                region_type: region.type,
                region_size: region.size,
                mix_mode: mixMode
            };
            const res = await processMix(payload, { signal: ac.signal });
            if (!ac.signal.aborted) {
                const imageUrl = res.data.image;
                if (selectedPort === 1) setOutput1(imageUrl);
                else setOutput2(imageUrl);
            }
        } catch (err) {
            if (err.name !== 'AbortError' && err.code !== 'ERR_CANCELED') {
                console.error('Mix error:', err);
                alert('Mixing failed. Check console for details.');
            }
        } finally {
            if (!ac.signal.aborted) {
                setIsProcessing(false);
            }
        }
    };

    // --- Beamforming Effect ---
    useEffect(() => {
        if (activeTab !== 'beamforming') return;

        if (beamAbortControllerRef.current) {
            beamAbortControllerRef.current.abort();
        }
        const ac = new AbortController();
        beamAbortControllerRef.current = ac;

        const timer = setTimeout(async () => {
            try {
                const res = await simulateBeam({ arrays: beamArrays }, { signal: ac.signal });
                if (!ac.signal.aborted) {
                    setBeamMap('data:' + res.data.map);
                }

                const profileRes = await getBeamProfile({ arrays: beamArrays }, { signal: ac.signal });
                if (!ac.signal.aborted) {
                    setBeamProfileImg('data:' + profileRes.data.profile);
                }
            } catch (err) {
                if (err.name !== 'AbortError' && err.code !== 'ERR_CANCELED') {
                    console.error('Beam error:', err);
                }
            }
        }, 150);

        return () => {
            clearTimeout(timer);
            ac.abort();
        };
    }, [beamArrays, activeTab]);

    return (
        <div className="app-container" style={{ fontFamily: 'Arial, sans-serif', height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f0f12', color: '#eee' }}>
            <nav style={{ padding: '15px', background: '#1a1a1d', color: 'white', display: 'flex', gap: '20px', alignItems: 'center' }}>
                <h2 style={{ margin: 0, color: '#c5a059' }}>DSP Task 4</h2>
                <button
                    onClick={() => setActiveTab('mixer')}
                    disabled={activeTab === 'mixer'}
                    style={{
                        padding: '6px 12px', background: activeTab === 'mixer' ? '#c5a059' : '#333',
                        color: activeTab === 'mixer' ? '#000' : '#ccc', border: '1px solid #555'
                    }}
                >
                    FT Mixer
                </button>
                <button
                    onClick={() => setActiveTab('beamforming')}
                    disabled={activeTab === 'beamforming'}
                    style={{
                        padding: '6px 12px', background: activeTab === 'beamforming' ? '#d32f2f' : '#333',
                        color: activeTab === 'beamforming' ? '#fff' : '#ccc', border: '1px solid #555'
                    }}
                >
                    Beamforming
                </button>
            </nav>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {activeTab === 'mixer' ? (
                    <>
                        <div style={{ flex: 2, padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', overflowY: 'auto' }}>
                            {imageIds.map((imgId, idx) => (
                                <ImageViewer key={idx} id={idx} imageId={imgId} onUpload={handleUpload} />
                            ))}
                        </div>

                        <div style={{ width: '300px', backgroundColor: '#141418', overflowY: 'auto' }}>
                            <MixerControls
                                weights={weights}
                                setWeights={setWeights}
                                region={region}
                                setRegion={setRegion}
                                mixMode={mixMode}
                                setMixMode={setMixMode}
                                onProcess={handleMix}
                                isProcessing={isProcessing}
                            />

                            {/* Removed the radio button div here */}
                        </div>

                        <div style={{ flex: 1, padding: '10px', background: '#0a0a0c', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Updated Output Viewers with direct selection */}
                            <OutputViewer
                                id={1}
                                imageSrc={output1}
                                isSelected={selectedPort === 1}
                                onSelect={() => setSelectedPort(1)}
                            />
                            <OutputViewer
                                id={2}
                                imageSrc={output2}
                                isSelected={selectedPort === 2}
                                onSelect={() => setSelectedPort(2)}
                            />
                        </div>
                    </>
                ) : (
                    <>
                        <ArrayConfig
                            arrays={beamArrays}
                            setArrays={setBeamArrays}
                            activeArrayIndex={activeArrayIndex}
                            setActiveArrayIndex={setActiveArrayIndex}
                        />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <InterferenceMap mapImage={beamMap} isLoading={!beamMap} />
                            <BeamProfile profileImage={beamProfileImg} isLoading={!beamProfileImg} />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default App;