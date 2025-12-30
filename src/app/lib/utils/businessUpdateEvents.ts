/**
 * Business Update Events
 * Simple event system to notify components when a business is updated or deleted
 */

type BusinessUpdateListener = (businessId: string) => void;
type BusinessDeleteListener = (businessId: string) => void;

class BusinessUpdateEventEmitter {
  private updateListeners: BusinessUpdateListener[] = [];
  private deleteListeners: BusinessDeleteListener[] = [];

  /**
   * Subscribe to business update events
   */
  onUpdate(listener: BusinessUpdateListener): () => void {
    this.updateListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.updateListeners = this.updateListeners.filter(l => l !== listener);
    };
  }

  /**
   * Subscribe to business deletion events
   */
  onDelete(listener: BusinessDeleteListener): () => void {
    this.deleteListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.deleteListeners = this.deleteListeners.filter(l => l !== listener);
    };
  }

  /**
   * Emit business update event
   */
  emitUpdate(businessId: string): void {
    this.updateListeners.forEach(listener => {
      try {
        listener(businessId);
      } catch (error) {
        console.error('Error in business update listener:', error);
      }
    });
  }

  /**
   * Emit business deletion event
   */
  emitDelete(businessId: string): void {
    this.deleteListeners.forEach(listener => {
      try {
        listener(businessId);
      } catch (error) {
        console.error('Error in business delete listener:', error);
      }
    });
  }
}

// Singleton instance
export const businessUpdateEvents = new BusinessUpdateEventEmitter();

/**
 * Notify all listeners that a business has been updated
 */
export function notifyBusinessUpdated(businessId: string): void {
  businessUpdateEvents.emitUpdate(businessId);
}

/**
 * Notify all listeners that a business has been deleted
 */
export function notifyBusinessDeleted(businessId: string): void {
  businessUpdateEvents.emitDelete(businessId);
}

