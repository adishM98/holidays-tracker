// Utility to dynamically update favicon
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${window.location.origin}/api`;

// Default calendar icon favicon (when no custom favicon is uploaded)
const DEFAULT_FAVICON = '/default-calendar-icon.svg';

export const updateFavicon = async () => {
  try {
    // Fetch favicon URL from API
    const response = await fetch(`${API_BASE_URL}/settings/favicon/url`);
    const data = await response.json();

    // Remove existing favicons
    const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
    existingFavicons.forEach((favicon) => favicon.remove());

    if (data.url) {
      // Add custom favicon (from white-labeling upload)
      const link = document.createElement('link');
      const faviconUrl = `${API_BASE_URL}${data.url.split('?')[0]}`;

      // Determine type based on URL
      if (faviconUrl.endsWith('.svg')) {
        link.rel = 'icon';
        link.type = 'image/svg+xml';
      } else if (faviconUrl.endsWith('.png')) {
        link.rel = 'icon';
        link.type = 'image/png';
      } else if (faviconUrl.endsWith('.ico')) {
        link.rel = 'icon';
        link.type = 'image/x-icon';
      } else {
        link.rel = 'icon';
      }

      link.href = faviconUrl;
      document.head.appendChild(link);
    } else {
      // Add default calendar icon when no custom favicon is uploaded
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/svg+xml';
      link.href = DEFAULT_FAVICON;
      document.head.appendChild(link);
    }
  } catch (error) {
    console.log('No custom favicon set, using default calendar icon');

    // Remove existing favicons
    const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
    existingFavicons.forEach((favicon) => favicon.remove());

    // Add default calendar icon
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = DEFAULT_FAVICON;
    document.head.appendChild(link);
  }
};
