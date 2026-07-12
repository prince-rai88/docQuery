import axios from 'axios';
import { API_BASE_URL } from '../config';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
});

export function getCookie(name: string) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

apiClient.interceptors.request.use((config) => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method ?? '')) {
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
  }
  return config;
});
