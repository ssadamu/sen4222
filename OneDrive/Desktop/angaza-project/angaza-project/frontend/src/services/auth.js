import api from './api';

// Helper function to handle API errors
const handleApiError = (error) => {
  // Handle network errors
  if (!error.response) {
    return { 
      success: false, 
      message: 'Network error. Please check your connection.' 
    };
  }

  // Handle HTML error responses
  if (error.response.headers['content-type']?.includes('text/html')) {
    return {
      success: false,
      message: 'Server error. Please try again later.'
    };
  }

  // Return server-provided error or default message
  return error.response.data || { 
    success: false, 
    message: 'An unexpected error occurred' 
  };
};

export const login = async (credentials) => {
  try {
    const response = await api.post('/auth/login', credentials);
    
    // Automatically check session after successful login
    if (response.data.success) {
      const session = await checkSession();
      return {
        ...response.data,
        user: session.user
      };
    }
    
    return response.data;

  } catch (error) {
    const errorData = handleApiError(error);
    throw errorData;
  }
};

export const register = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData);
    
    // Automatically login after successful registration
    if (response.data.success) {
      return await login({
        username: userData.username,
        password: userData.password
      });
    }
    
    return response.data;

  } catch (error) {
    const errorData = handleApiError(error);
    
    // Handle duplicate key errors
    if (errorData.message?.includes('already exists')) {
      return {
        success: false,
        message: 'Username or email already exists'
      };
    }
    
    throw errorData;
  }
};

export const logout = async () => {
  try {
    await api.post('/auth/logout');
    
    // Force session check after logout
    await checkSession();
    
    return {
      success: true,
      message: 'Logged out successfully'
    };

  } catch (error) {
    console.error('Logout error:', error);
    return {
      success: false,
      message: 'Failed to logout completely. Please clear cookies.'
    };
  }
};

export const checkSession = async () => {
  try {
    const response = await api.get('/auth/session');
    
    // Validate session response structure
    if (typeof response.data.authenticated !== 'boolean') {
      return {
        authenticated: false,
        error: 'Invalid session response'
      };
    }
    
    return response.data;

  } catch (error) {
    console.error('Session check error:', error);
    
    // Handle invalid session format
    if (error.response?.data?.authenticated === false) {
      return { authenticated: false };
    }
    
    const errorData = handleApiError(error);
    return {
      authenticated: false,
      error: errorData.message
    };
  }
};

// Additional helper for token refresh
export const refreshToken = async () => {
  try {
    // Get refresh token from cookies
    const cookies = document.cookie.split(';');
    const refreshTokenCookie = cookies.find(cookie => cookie.trim().startsWith('refreshToken='));
    
    if (!refreshTokenCookie) {
      // If no refresh token, try to get a new session
      const session = await checkSession();
      if (session.authenticated) {
        return session;
      }
      throw new Error('No refresh token found');
    }

    const refreshToken = refreshTokenCookie.split('=')[1];
    const response = await api.post('/auth/refresh', { refreshToken });
    
    if (response.data.success) {
      // Update the session state
      const session = await checkSession();
      return session;
    }
    
    throw new Error('Token refresh failed');
  } catch (error) {
    console.error('Token refresh failed:', error);
    // Clear any invalid tokens
    document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    return { authenticated: false };
  }
};