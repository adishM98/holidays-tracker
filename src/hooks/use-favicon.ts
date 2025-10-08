import { useEffect } from 'react';
import { adminAPI } from '@/services/api';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || window.location.origin;

export const useFavicon = () => {
  useEffect(() => {
    const updateFavicon = async () => {
      try {
        const response = await adminAPI.getFaviconUrl();
        if (response.url) {
          const faviconUrl = `${BACKEND_URL}${response.url.split('?')[0]}`;

          // Remove existing favicon links
          const existingLinks = document.querySelectorAll("link[rel*='icon']");
          existingLinks.forEach(link => link.remove());

          // Add new favicon
          const link = document.createElement('link');
          link.rel = 'icon';
          link.href = faviconUrl;
          document.head.appendChild(link);
        }
      } catch (error) {
        console.error('Error loading custom favicon:', error);
      }
    };

    updateFavicon();
  }, []);
};
