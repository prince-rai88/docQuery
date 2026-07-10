import { apiClient, getCookie } from './client';

export const authApi = {
  getCsrf: async () => {
    await apiClient.get('/auth/login/');
  },
  login: async (formData: URLSearchParams) => {
    const csrfToken = getCookie('csrftoken') || '';
    formData.append('csrfmiddlewaretoken', csrfToken);
    formData.append('next', '/api/documents/'); // Redirect to existing API view instead of 404 profile
    const response = await apiClient.post('/auth/login/', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRFToken': csrfToken
      }
    });
    // DRF LoginView returns 200 OK (with HTML form) on failure.
    // If it succeeds, it redirects to 'next' (/api/documents/), updating responseURL.
    if (response.request?.responseURL?.includes('/auth/login')) {
       throw { response: { status: 401 } };
    }
    return response;
  },
  logout: async () => {
    return apiClient.post('/auth/logout/');
  },
  signup: async (data: { username: string; email: string; password: string }) => {
    await authApi.getCsrf();
    return apiClient.post('/auth/signup/', data);
  },
};
