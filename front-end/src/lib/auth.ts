// Get the stored authentication token
export const getAuthToken = () => localStorage.getItem('authToken');

// Set the authentication token
export const setAuthToken = (token: string) => localStorage.setItem('authToken', token);

// Remove the authentication token (logout)
export const removeAuthToken = () => localStorage.removeItem('authToken');

// Check if user is authenticated
export const isAuthenticated = () => !!getAuthToken();

// Get headers with authentication token
export const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'X-Authorization': getAuthToken() || ''
});
