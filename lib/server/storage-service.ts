// lib/server/storage-service.ts
import { storage } from './firebase-admin';
import { ReportImage } from '../types';

/**
 * Server-side: Get download URL for a file
 * @param reportId - The ID of the report
 * @param fileName - The name of the file
 * @returns Download URL
 */
export async function getFileDownloadURL(
  reportId: string,
  fileName: string
): Promise<string> {
  try {
    const bucket = storage.bucket();
    const file = bucket.file(`reports/${reportId}/${fileName}`);
    
    // Generate signed URL (valid for 7 days)
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    return url;
  } catch (error) {
    console.error('❌ Get URL failed:', error);
    throw error;
  }
}

/**
 * Server-side: Delete a single image
 * @param reportId - The ID of the report
 * @param fileName - The name of the file to delete
 */
export async function deleteReportImage(
  reportId: string,
  fileName: string
): Promise<void> {
  try {
    const bucket = storage.bucket();
    const file = bucket.file(`reports/${reportId}/${fileName}`);
    await file.delete();
    console.log(`✅ Server: Image deleted: ${fileName}`);
  } catch (error) {
    console.error('❌ Server: Delete failed:', error);
    throw error;
  }
}

/**
 * Server-side: Delete all images for a report
 * @param reportId - The ID of the report
 */
export async function deleteAllReportImages(reportId: string): Promise<void> {
  try {
    const bucket = storage.bucket();
    const [files] = await bucket.getFiles({
      prefix: `reports/${reportId}/`,
    });
    
    const deletePromises = files.map(file => file.delete());
    await Promise.all(deletePromises);
    
    console.log(`✅ Server: All images deleted for report: ${reportId}`);
  } catch (error) {
    console.error('❌ Server: Delete all failed:', error);
    throw error;
  }
}

/**
 * Server-side: List all images for a report
 * @param reportId - The ID of the report
 * @returns Array of image metadata
 */
export async function listReportImages(reportId: string): Promise<ReportImage[]> {
  try {
    const bucket = storage.bucket();
    const [files] = await bucket.getFiles({
      prefix: `reports/${reportId}/`,
    });
    
    const imagePromises = files.map(async (file) => {
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });
      
      const metadata = await file.getMetadata();
      
      return {
        url,
        fileName: file.name.split('/').pop() || '',
        uploadedAt: metadata[0].timeCreated ? new Date(metadata[0].timeCreated).getTime() : Date.now(),
      };
    });
    
    return await Promise.all(imagePromises);
  } catch (error) {
    console.error('❌ Server: List images failed:', error);
    throw error;
  }
}

/**
 * Server-side: Check if an image exists
 * @param reportId - The ID of the report
 * @param fileName - The name of the file
 * @returns True if file exists
 */
export async function imageExists(
  reportId: string,
  fileName: string
): Promise<boolean> {
  try {
    const bucket = storage.bucket();
    const file = bucket.file(`reports/${reportId}/${fileName}`);
    const [exists] = await file.exists();
    return exists;
  } catch (error) {
    console.error('❌ Server: Check existence failed:', error);
    return false;
  }
}
