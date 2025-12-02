// API Configuration
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000/api'
  : 'https://your-backend-url.onrender.com/api';

export { API_URL };

// Helper function to get auth headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Helper function for authenticated fetch
export const authFetch = async (url, options = {}) => {
  const headers = {
    ...getAuthHeaders(),
    ...options.headers,
  };
  
  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
  });
  
  if (!response.ok && response.status === 401) {
    localStorage.clear();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  
  return response;
};

