// lib/client/storage.ts
import { storage } from './firebase';
import { ref, getDownloadURL, listAll } from 'firebase/storage';

/**
 * Get all image URLs for a report
 * @param reportId - The ID of the report
 * @returns Array of download URLs
 */
export async function getReportImages(reportId: string): Promise<string[]> {
  try {
    const folderRef = ref(storage, `reports/${reportId}`);
    const listResult = await listAll(folderRef);
    
    if (listResult.items.length === 0) {
      return [];
    }
    
    const urlPromises = listResult.items.map(itemRef => getDownloadURL(itemRef));
    const urls = await Promise.all(urlPromises);
    
    return urls;
  } catch (error) {
    console.error('❌ Get images failed:', error);
    return [];
  }
}
