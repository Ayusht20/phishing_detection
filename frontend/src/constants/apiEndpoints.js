export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000' || "https://phishing-detection-9em2.onrender.com";

export const ENDPOINTS = {
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  SCAN_URL: '/api/scan/url',
  SCAN_EMAIL: '/api/scan/email',
  SCAN_HISTORY: '/api/scan/history',
  ADMIN_STATS: '/api/admin/stats',
};