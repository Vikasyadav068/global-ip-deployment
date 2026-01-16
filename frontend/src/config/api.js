// API Configuration
// This uses the environment variable if available, otherwise defaults to localhost:8080
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
export const API_BASE = `${API_BASE_URL}/api`;

export default API_BASE;
