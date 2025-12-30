/**
 * Utility function to delete a business
 * Handles deletion, cache invalidation, and event emission
 */

import { notifyBusinessDeleted } from './businessUpdateEvents';

/**
 * Delete a business via API
 * @param businessId - The ID of the business to delete
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export async function deleteBusiness(businessId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/businesses/${businessId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error deleting business:', errorData);
      return false;
    }

    // Check if response indicates deletion
    const deleted = response.headers.get('X-Business-Deleted') === 'true';
    
    if (deleted) {
      // Emit deletion event to notify all components
      notifyBusinessDeleted(businessId);
    }

    return true;
  } catch (error) {
    console.error('Error deleting business:', error);
    return false;
  }
}

