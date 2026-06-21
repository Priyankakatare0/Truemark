// TrueMark API Service - Connects to FastAPI backend
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
});

function thumbnailUrl(fingerprintId) {
  return `${API_BASE_URL}/fingerprint/${fingerprintId}/thumbnail`;
}

/**
 * Upload an image to be fingerprinted
 */
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
      // Near-duplicate detection fields (populated when is_duplicate=true via similarity)
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

/**
 * Check similarity of a fingerprint against the database
 */
export async function checkSimilarity(fingerprintId) {
  try {
    const response = await apiClient.post('/check', {
      fingerprint_id: fingerprintId,
    });

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

/**
 * Get fingerprint details from the database
 */
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

/**
 * Download the PDF report (served inline by backend)
 */
export async function downloadReport(reportId) {
  try {
    const response = await apiClient.get(`/report/${reportId}`, {
      responseType: 'blob',
    });

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

    const url = window.URL.createObjectURL(
      new Blob([response.data], { type: 'application/pdf' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `truemark-report-${reportId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Report download failed:', error);
    if (error.message?.includes('PDF generation failed')) {
      throw error;
    }
    if (error.response?.data?.detail) {
      throw new Error(`Download failed: ${error.response.data.detail}`, { cause: error });
    }
    throw new Error('Failed to download report. Please try again.', { cause: error });
  }
}

/**
 * Check backend health status
 */
export async function checkBackendHealth() {
  const response = await apiClient.get('/');
  return response.data;
}

export { API_BASE_URL, thumbnailUrl };
