// TrueMark API Service - Connects to FastAPI backend
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 second timeout for model inference
});

/**
 * Upload an image to be fingerprinted
 * @param {File} file - Image file to upload
 * @param {string} [ownerLabel] - Optional owner name/label
 * @returns {Promise<{fingerprintId: string, isDuplicate: boolean, fileHash: string, createdAt: string}>}
 */
export async function uploadImage(file, ownerLabel = null) {
  const formData = new FormData();
  formData.append('file', file);
  
  if (ownerLabel) {
    formData.append('owner_label', ownerLabel);
  }

  try {
    const response = await apiClient.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return {
      fingerprintId: response.data.fingerprint_id,
      isDuplicate: response.data.is_duplicate,
      fileHash: response.data.file_hash,
      createdAt: response.data.created_at,
      fileName: response.data.file_name,
    };
  } catch (error) {
    console.error('Upload failed:', error);
    if (error.response?.data?.detail) {
      throw new Error(`Upload failed: ${error.response.data.detail}`);
    }
    throw new Error('Failed to upload image. Please try again.');
  }
}

/**
 * Check similarity of a fingerprint against the database
 * @param {string} fingerprintId - UUID of the fingerprint to check
 * @returns {Promise<{score: number, matches: Array, reportId: string}>}
 */
export async function checkSimilarity(fingerprintId) {
  try {
    const response = await apiClient.post('/check', {
      fingerprint_id: fingerprintId,
    });

    // Transform backend response to match frontend expectations
    const matches = (response.data.top_matches || []).map((match) => ({
      id: match.fingerprint_id,
      source: match.is_sample ? 'TrueMark Reference Library' : 'User Registry',
      similarity: Math.round(match.similarity_score * 100),
      thumbnail: `https://picsum.photos/seed/${match.fingerprint_id}/200/200`,
      fileName: match.file_name,
    }));

    return {
      score: response.data.originality_score,
      matches: matches,
      reportId: response.data.report_id,
    };
  } catch (error) {
    console.error('Similarity check failed:', error);
    if (error.response?.data?.detail) {
      throw new Error(`Analysis failed: ${error.response.data.detail}`);
    }
    throw new Error('Failed to analyze image. Please try again.');
  }
}

/**
 * Get fingerprint details from the database
 * @param {string} fingerprintId - UUID of the fingerprint
 * @returns {Promise<{fingerprintId: string, createdAt: string, status: string, fileHash: string, fileName: string}>}
 */
export async function getFingerprint(fingerprintId) {
  try {
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
      // Status will be enriched later by the Dashboard after similarity check
      status: 'pending',
    };
  } catch (error) {
    console.error('Failed to fetch fingerprint:', error);
    // Return fallback data even if API fails so Dashboard doesn't crash
    return {
      fingerprintId: fingerprintId,
      fileName: 'Unknown',
      fileHash: null,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
  }
}

/**
 * Download the PDF report
 * @param {string} reportId - UUID of the report to download
 * @returns {Promise<void>}
 */
export async function downloadReport(reportId) {
  try {
    const response = await apiClient.get(`/report/${reportId}`, {
      responseType: 'blob',
    });

    // Check if the backend returned a PDF generation failure JSON
    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('application/json')) {
      // Convert blob to text to read the JSON error
      const text = await response.data.text();
      const json = JSON.parse(text);
      if (json.pdf_generation_failed) {
        throw new Error(
          `PDF generation failed on server: ${json.error}. ` +
          `Originality score: ${json.originality_score}%`
        );
      }
    }

    // Create a download link and trigger it
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
    if (error.message.includes('PDF generation failed')) {
      throw error;
    }
    if (error.response?.data?.detail) {
      throw new Error(`Download failed: ${error.response.data.detail}`);
    }
    throw new Error('Failed to download report. Please try again.');
  }
}

/**
 * Check backend health status
 * @returns {Promise<{status: string}>}
 */
export async function checkBackendHealth() {
  try {
    const response = await apiClient.get('/');
    return response.data;
  } catch (error) {
    console.error('Backend health check failed:', error);
    throw new Error('Backend is unreachable');
  }
}