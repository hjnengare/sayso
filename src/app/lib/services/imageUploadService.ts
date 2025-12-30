import { supabase } from '../supabase';

export class ImageUploadService {
  private static readonly ALLOWED_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ];

  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly MAX_IMAGES_PER_REVIEW = 5;

  static validateImage(file: File): { isValid: boolean; error?: string } {
    // Check file type
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.'
      };
    }

    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: 'File size too large. Maximum size is 5MB.'
      };
    }

    return { isValid: true };
  }

  static validateImageArray(files: File[]): { isValid: boolean; error?: string } {
    if (files.length > this.MAX_IMAGES_PER_REVIEW) {
      return {
        isValid: false,
        error: `Too many images. Maximum ${this.MAX_IMAGES_PER_REVIEW} images per review.`
      };
    }

    for (const file of files) {
      const validation = this.validateImage(file);
      if (!validation.isValid) {
        return validation;
      }
    }

    return { isValid: true };
  }

  static async uploadImage(
    file: File,
    bucket: string,
    path: string
  ): Promise<{ url: string; error?: string }> {
    try {
      // Validate image first
      const validation = this.validateImage(file);
      if (!validation.isValid) {
        return { url: '', error: validation.error };
      }

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return {
          url: '',
          error: uploadError.message || 'Failed to upload image'
        };
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      return { url: publicUrl };
    } catch (error) {
      console.error('Image upload error:', error);
      return {
        url: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  static async uploadMultipleImages(
    files: File[],
    bucket: string,
    pathPrefix: string
  ): Promise<{ urls: string[]; errors: string[] }> {
    const urls: string[] = [];
    const errors: string[] = [];

    // Validate array first
    const arrayValidation = this.validateImageArray(files);
    if (!arrayValidation.isValid) {
      return { urls: [], errors: [arrayValidation.error || 'Validation failed'] };
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${pathPrefix}_${i}_${Date.now()}.${fileExt}`;

      const result = await this.uploadImage(file, bucket, fileName);

      if (result.error) {
        errors.push(`Failed to upload ${file.name}: ${result.error}`);
      } else {
        urls.push(result.url);
      }
    }

    return { urls, errors };
  }

  static async deleteImage(bucket: string, path: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        console.error('Delete error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Image delete error:', error);
      return false;
    }
  }

  // Utility function to compress images on the client side
  static async compressImage(
    file: File,
    maxWidth: number = 1920,
    maxHeight: number = 1080,
    quality: number = 0.8
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for compression'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  // Generate optimized image paths
  static generateImagePath(type: 'review' | 'business' | 'avatar', id: string, index?: number): string {
    const timestamp = Date.now();
    switch (type) {
      case 'review':
        return `review-images/${id}_${index || 0}_${timestamp}.webp`;
      case 'business':
        return `business_images/${id}_${timestamp}.webp`;
      case 'avatar':
        return `avatars/${id}_${timestamp}.webp`;
      default:
        return `uploads/${id}_${timestamp}.webp`;
    }
  }

  // Get image dimensions for validation
  static async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      img.src = URL.createObjectURL(file);
    });
  }
}
