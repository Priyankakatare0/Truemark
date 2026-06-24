// TrueMark API Service - Connects to FastAPI backend
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
  withCredentials: true, // Required: sends HttpOnly JWT cookie on every request
});

function thumbnailUrl(fingerprintId) {
  return `${API_BASE_URL}/fingerprint/${fingerprintId}/thumbnail`;
}

// =============================================================================
// Auth API
// =============================================================================

export async function signupUser(name, email, password) {
  try {
    const response = await apiClient.post('/auth/signup', { name, email, password });
    return response.data;
  } catch (error) {
    const msg = error.response?.data?.detail || 'Signup failed. Please try again.';
    throw new Error(msg);
  }
}

export async function loginUser(email, password) {
  try {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  } catch (error) {
    const msg = error.response?.data?.detail || 'Login failed. Please check your credentials.';
    throw new Error(msg);
  }
}

export async function logoutUser() {
  try {
    await apiClient.post('/auth/logout');
  } catch {
    // Silently ignore logout errors
  }
}

export async function getMe() {
  const response = await apiClient.get('/auth/me');
  return response.data;
}

// =============================================================================
// Fingerprint / Upload API
// =============================================================================

export async function uploadImage(file, ownerLabel = null) {
  const formData = new FormData();
  formData.append('file', file);
  if (ownerLabel) {
    formData.append('owner_label', ownerLabel);
  }
  try {
    const response = await apiClient.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return {
      fingerprintId: response.data.fingerprint_id,
      isDuplicate: response.data.is_duplicate,
      fileHash: response.data.file_hash,
      createdAt: response.data.created_at,
      fileName: response.data.file_name,
      matchedFingerprintId: response.data.matched_fingerprint_id || null,
      similarityScore: response.data.similarity_score || null,
    };
  } catch (error) {
    console.error('Upload failed:', error);
    if (error.response?.data?.detail) {
      throw new Error(`Upload failed: ${error.response.data.detail}`, { cause: error });
    }
    throw new Error('Failed to upload image. Please try again.', { cause: error });
  }
}

export async function checkSimilarity(fingerprintId) {
  try {
    const response = await apiClient.post('/check', { fingerprint_id: fingerprintId });
    const matches = (response.data.top_matches || []).map((match) => ({
      id: match.fingerprint_id,
      source: match.is_sample ? 'TrueMark Reference Library' : 'User Registry',
      similarity: Math.round(match.similarity_score * 100),
      thumbnail: thumbnailUrl(match.fingerprint_id),
      fileName: match.file_name,
    }));
    return {
      score: response.data.originality_score,
      matches,
      reportId: response.data.report_id,
    };
  } catch (error) {
    console.error('Similarity check failed:', error);
    if (error.response?.data?.detail) {
      throw new Error(`Analysis failed: ${error.response.data.detail}`, { cause: error });
    }
    throw new Error('Failed to analyze image. Please try again.', { cause: error });
  }
}

export async function getFingerprint(fingerprintId) {
  const response = await apiClient.get(`/fingerprint/${fingerprintId}`);
  const data = response.data;
  return {
    fingerprintId: data.id,
    fileName: data.file_name,
    fileHash: data.file_hash,
    phash: data.phash,
    ownerLabel: data.owner_label,
    isSample: data.is_sample,
    createdAt: data.created_at,
    status: 'pending',
  };
}

export async function downloadReport(reportId) {
  try {
    const response = await apiClient.get(`/report/${reportId}`, { responseType: 'blob' });
    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('application/json')) {
      const text = await response.data.text();
      const json = JSON.parse(text);
      if (json.pdf_generation_failed) {
        throw new Error(
          `PDF generation failed on server: ${json.error}. Originality score: ${json.originality_score}%`
        );
      }
    }
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `truemark-report-${reportId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Report download failed:', error);
    if (error.message?.includes('PDF generation failed')) throw error;
    if (error.response?.data?.detail) {
      throw new Error(`Download failed: ${error.response.data.detail}`, { cause: error });
    }
    throw new Error('Failed to download report. Please try again.', { cause: error });
  }
}

export async function checkBackendHealth() {
  const response = await apiClient.get('/');
  return response.data;
}

// =============================================================================
// User History API (for User Dashboard)
// =============================================================================

export async function getUserFingerprints(limit = 20, offset = 0) {
  try {
    const response = await apiClient.get('/user/me/fingerprints', { params: { limit, offset } });
    return response.data; // { items, total, limit, offset }
  } catch (error) {
    const msg = error.response?.data?.detail || 'Failed to load your fingerprint history.';
    throw new Error(msg);
  }
}

export async function getUserReports(limit = 20, offset = 0) {
  try {
    const response = await apiClient.get('/user/me/reports', { params: { limit, offset } });
    return response.data; // { items, total, limit, offset }
  } catch (error) {
    const msg = error.response?.data?.detail || 'Failed to load your report history.';
    throw new Error(msg);
  }
}

export async function getUserStats() {
  try {
    const response = await apiClient.get('/user/me/stats');
    return response.data; // { total_uploads, total_reports, avg_originality_score, member_since, ... }
  } catch (error) {
    const msg = error.response?.data?.detail || 'Failed to load your stats.';
    throw new Error(msg);
  }
}

// =============================================================================
// Notion API
// =============================================================================

export async function exportToNotion(apiKey, databaseId, reportId, fingerprintId, isDuplicate) {
  try {
    const response = await apiClient.post('/notion/export', {
      api_key: apiKey,
      database_id: databaseId,
      report_id: reportId,
      fingerprint_id: fingerprintId
    }, {
      headers: {
        'x-is-duplicate': isDuplicate ? 'true' : 'false'
      }
    });
    return response.data;
  } catch (error) {
    const msg = error.response?.data?.detail || 'Failed to export to Notion.';
    throw new Error(msg);
  }
}

export { API_BASE_URL, thumbnailUrl };
