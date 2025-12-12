// src/api.js
import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000',
    // Do NOT set default Content-Type — let each request decide
});

export const uploadImage = async (id, file, options = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/upload/${id}`, formData, {
        // ⚠️ Critical: DO NOT set Content-Type header here
        // Browser will auto-set it with correct boundary
        signal: options.signal,
    });
};

export const fetchComponent = async (id, type, options = {}) => {
    return api.post('/get_component', { id, type_str: type }, {
        headers: { 'Content-Type': 'application/json' },
        signal: options.signal,
    });
};

export const processMix = async (payload, options = {}) => {
    return api.post('/process_mix', payload, {
        headers: { 'Content-Type': 'application/json' },
        signal: options.signal,
    });
};

export const simulateBeam = async (config, options = {}) => {
    return api.post('/simulate_beam', config, {
        headers: { 'Content-Type': 'application/json' },
        signal: options.signal,
    });
};

export const getBeamProfile = async (config, options = {}) => {
    return api.post('/get_beam_profile', config, {
        headers: { 'Content-Type': 'application/json' },
        signal: options.signal,
    });
};

export default api;