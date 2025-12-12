import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000', // Matches your FastAPI port
    headers: {
        'Content-Type': 'application/json',
    },
});

export const uploadImage = async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/upload/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};

// Fetches a specific component view (Mag/Phase/etc) for an image
export const fetchComponent = async (id, type) => {
    // Expects backend endpoint: POST /get_component_view {id, type}
    // You may need to add this simple endpoint to backend if not present
    return api.post('/get_component', { id, type_str: type });
};

export const processMix = async (payload) => {
    return api.post('/process_mix', payload);
};

export const simulateBeam = async (config) => {
    return api.post('/simulate_beam', config);
};

export default api;