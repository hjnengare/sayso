"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useToast } from "../../../contexts/ToastContext";
import { useRequireBusinessOwner } from "../../../hooks/useBusinessAccess";
import { usePreviousPageBreadcrumb } from "../../../hooks/usePreviousPageBreadcrumb";
import { useBusinessDetail } from "../../../hooks/useBusinessDetail";
import { getBrowserSupabase } from "../../../lib/supabase/client";

type BusinessHours = {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
};

type BusinessSpecial = {
  id: number;
  name: string;
  description: string;
  icon: string;
};

type BusinessEditFormData = {
  name: string;
  description: string;
  category: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  priceRange: string;
  hours: BusinessHours;
  images: string[];
  specials: BusinessSpecial[];
};

const DEFAULT_HOURS: BusinessHours = {
  monday: "",
  tuesday: "",
  wednesday: "",
  thursday: "",
  friday: "",
  saturday: "",
  sunday: "",
};

const DEFAULT_FORM_DATA: BusinessEditFormData = {
  name: "",
  description: "",
  category: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  priceRange: "$",
  hours: DEFAULT_HOURS,
  images: [],
  specials: [],
};

export const EDIT_BUSINESS_CATEGORIES = [
  "Restaurant",
  "Cafe",
  "Bar",
  "Fast Food",
  "Fine Dining",
  "Bakery",
  "Food Truck",
  "Catering",
  "Grocery",
  "Other",
  "Miscellaneous",
];

export const EDIT_BUSINESS_PRICE_RANGES = [
  { value: "$", label: "R" },
  { value: "$$", label: "RR" },
  { value: "$$$", label: "RRR" },
  { value: "$$$$", label: "RRRR" },
];

export const EDIT_BUSINESS_DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
] as const;

export function useBusinessEditPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const paramId = params?.id;
  const businessId = Array.isArray(paramId) ? paramId[0] : paramId;
  const { previousHref, previousLabel } = usePreviousPageBreadcrumb({
    fallbackHref: businessId ? `/business/${businessId}` : "/my-businesses",
    fallbackLabel: "Business",
  });
  const redirectTarget = businessId ? `/business/${businessId}` : "/login";

  const { isChecking, hasAccess } = useRequireBusinessOwner({
    businessId,
    redirectTo: redirectTarget,
  });

  const [formData, setFormData] = useState<BusinessEditFormData>(DEFAULT_FORM_DATA);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [deletingImageIndex, setDeletingImageIndex] = useState<number | null>(null);
  const [reorderingImage, setReorderingImage] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [formPopulated, setFormPopulated] = useState(false);

  const {
    business: businessData,
    loading: isLoading,
    error,
  } = useBusinessDetail(hasAccess && !isChecking ? businessId : null);

  useEffect(() => {
    if (!businessData || formPopulated) return;
    setFormData({
      name: businessData.name || "",
      description: businessData.description || "",
      category: businessData.category || "",
      address: businessData.address || "",
      phone: businessData.phone || "",
      email: businessData.email || "",
      website: businessData.website || "",
      priceRange: businessData.price_range || "$",
      hours: businessData.hours || DEFAULT_HOURS,
      images: businessData.uploaded_images || businessData.images || [],
      specials: [],
    });
    setFormPopulated(true);
  }, [businessData, formPopulated]);

  const handleInputChange = (field: keyof BusinessEditFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleHoursChange = (day: keyof BusinessHours, value: string) => {
    setFormData((prev) => ({
      ...prev,
      hours: {
        ...prev.hours,
        [day]: value,
      },
    }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !businessId) return;

    const MAX_IMAGES = 10;
    const currentCount = formData.images.length;
    const newCount = files.length;

    if (currentCount >= MAX_IMAGES) {
      showToast(
        `Maximum image limit reached (${MAX_IMAGES} images). Please delete some images before adding new ones.`,
        "error",
        5000
      );
      event.target.value = "";
      return;
    }

    if (currentCount + newCount > MAX_IMAGES) {
      const remainingSlots = MAX_IMAGES - currentCount;
      showToast(
        `You can only add ${remainingSlots} more image(s). Maximum limit is ${MAX_IMAGES} images per business.`,
        "sage",
        5000
      );
      event.target.value = "";
      return;
    }

    setUploadingImages(true);
    try {
      const { validateImageFiles, getFirstValidationError } = await import("@/app/lib/utils/imageValidation");
      const validationResults = validateImageFiles(Array.from(files));
      const invalidFiles = validationResults.filter((result) => !result.valid);

      if (invalidFiles.length > 0) {
        const firstError = getFirstValidationError(Array.from(files));
        showToast(
          firstError ||
            "Some image files are invalid. Please upload only JPG, PNG, WebP, or GIF images under 5MB each.",
          "error",
          6000
        );
        setUploadingImages(false);
        event.target.value = "";
        return;
      }

      const supabase = getBrowserSupabase();
      const uploadedUrls: string[] = [];
      const { STORAGE_BUCKETS } = await import("../../../lib/utils/storageBucketConfig");
      const filesToUpload = Array.from(files).slice(0, MAX_IMAGES - currentCount);
      const uploadErrors: string[] = [];

      for (let index = 0; index < filesToUpload.length; index += 1) {
        const file = filesToUpload[index];
        try {
          const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
          const timestamp = Date.now();
          const filePath = `${businessId}/${timestamp}_${index}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKETS.BUSINESS_IMAGES)
            .upload(filePath, file, {
              contentType: file.type,
              upsert: false,
            });

          if (uploadError) {
            if (uploadError.message.includes("already exists")) {
              uploadErrors.push(`Image ${index + 1} already exists`);
              continue;
            }
            console.error("[Edit Business] Error uploading image:", uploadError);
            uploadErrors.push(`Failed to upload image ${index + 1}: ${uploadError.message}`);
            continue;
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from(STORAGE_BUCKETS.BUSINESS_IMAGES).getPublicUrl(filePath);

          if (publicUrl) {
            uploadedUrls.push(publicUrl);
          } else {
            uploadErrors.push(`Failed to get URL for image ${index + 1}`);
          }
        } catch (fileError: any) {
          console.error(`[Edit Business] Error processing image ${index + 1}:`, fileError);
          uploadErrors.push(`Error processing image ${index + 1}: ${fileError.message || "Unknown error"}`);
        }
      }

      if (uploadErrors.length > 0 && uploadedUrls.length === 0) {
        showToast(`Failed to upload images: ${uploadErrors[0]}`, "error", 6000);
        setUploadingImages(false);
        event.target.value = "";
        return;
      }

      if (uploadErrors.length > 0) {
        showToast(`Some images failed to upload (${uploadErrors.length} error(s))`, "sage", 5000);
      }

      if (uploadedUrls.length > 0) {
        const response = await fetch(`/api/businesses/${businessId}/images`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            images: uploadedUrls.map((url) => ({ url })),
          }),
        });

        if (!response.ok) {
          const contentType = response.headers.get("content-type") || "";
          const rawText = await response.text();
          let errorData: any = null;

          if (contentType.includes("application/json")) {
            try {
              errorData = rawText ? JSON.parse(rawText) : null;
            } catch (parseError) {
              errorData = { parseError: String(parseError), rawText };
            }
          } else {
            errorData = { rawText };
          }

          console.error("[Edit Business] API error response:", {
            status: response.status,
            statusText: response.statusText,
            contentType,
            errorData,
            rawText,
          });

          const message =
            errorData?.error ||
            errorData?.details ||
            errorData?.message ||
            `Server error (${response.status}): ${response.statusText}`;

          throw new Error(message);
        }

        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, ...uploadedUrls],
        }));

        showToast(`Successfully uploaded ${uploadedUrls.length} image(s)!`, "success", 3000);

        const { notifyBusinessUpdated } = await import("../../../lib/utils/businessUpdateEvents");
        notifyBusinessUpdated(businessId);
      }
    } catch (uploadError: any) {
      console.error("Error uploading images:", uploadError);
      showToast(uploadError.message || "Failed to upload images", "error", 5000);
    } finally {
      setUploadingImages(false);
      event.target.value = "";
    }
  };

  const removeImage = async (index: number) => {
    if (!businessId || index < 0 || index >= formData.images.length) return;

    const imageUrl = formData.images[index];
    if (!imageUrl) return;

    setDeletingImageIndex(index);
    try {
      const encodedUrl = encodeURIComponent(imageUrl);
      const response = await fetch(`/api/businesses/${businessId}/images/${encodedUrl}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete image");
      }

      const result = await response.json();

      setFormData((prev) => ({
        ...prev,
        images: prev.images.filter((_, imageIndex) => imageIndex !== index),
      }));

      showToast(result.message || "Image deleted successfully", "success", 3000);

      const { notifyBusinessUpdated } = await import("../../../lib/utils/businessUpdateEvents");
      notifyBusinessUpdated(businessId);
    } catch (removeError: any) {
      console.error("Error deleting image:", removeError);
      showToast(removeError.message || "Failed to delete image", "error", 5000);
    } finally {
      setDeletingImageIndex(null);
    }
  };

  const setAsPrimary = async (index: number) => {
    if (!businessId || index < 0 || index >= formData.images.length || index === 0) return;

    setReorderingImage(index);
    try {
      const newImages = [...formData.images];
      const [movedImage] = newImages.splice(index, 1);
      newImages.unshift(movedImage);

      const supabase = getBrowserSupabase();
      const { error: updateError } = await supabase
        .from("businesses")
        .update({ uploaded_images: newImages })
        .eq("id", businessId);

      if (updateError) {
        throw new Error(updateError.message || "Failed to reorder images");
      }

      setFormData((prev) => ({
        ...prev,
        images: newImages,
      }));

      showToast("Primary image updated successfully!", "success", 3000);

      const { notifyBusinessUpdated } = await import("../../../lib/utils/businessUpdateEvents");
      notifyBusinessUpdated(businessId);
    } catch (reorderError: any) {
      console.error("Error reordering images:", reorderError);
      showToast(reorderError.message || "Failed to set primary image", "error", 5000);
    } finally {
      setReorderingImage(null);
    }
  };

  const addSpecial = () => {
    const newSpecial: BusinessSpecial = {
      id: Date.now(),
      name: "",
      description: "",
      icon: "star",
    };
    setFormData((prev) => ({
      ...prev,
      specials: [...prev.specials, newSpecial],
    }));
  };

  const updateSpecial = (id: number, field: keyof BusinessSpecial, value: string) => {
    setFormData((prev) => ({
      ...prev,
      specials: prev.specials.map((special) =>
        special.id === id ? { ...special, [field]: value } : special
      ),
    }));
  };

  const removeSpecial = (id: number) => {
    setFormData((prev) => ({
      ...prev,
      specials: prev.specials.filter((special) => special.id !== id),
    }));
  };

  const handleSave = async () => {
    if (!businessId) {
      showToast("Business ID is required", "sage", 3000);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/businesses/${businessId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          category: formData.category,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          website: formData.website,
          priceRange: formData.priceRange,
          hours: formData.hours,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save business");
      }

      await response.json();
      showToast("Business updated successfully!", "success", 2000);

      const { notifyBusinessUpdated } = await import("../../../lib/utils/businessUpdateEvents");
      notifyBusinessUpdated(businessId);

      router.refresh();

      setTimeout(() => {
        router.push(`/business/${businessId}`);
      }, 500);
    } catch (saveError: any) {
      console.error("Error saving business:", saveError);
      showToast(saveError.message || "Failed to save business", "sage", 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    try {
      const businessIdToDelete = (typeof paramId === "string" ? paramId : undefined) || businessId;

      if (!businessIdToDelete) {
        throw new Error("Missing business id");
      }

      setIsDeleting(true);
      setDeleteError(null);

      console.log("[Delete] Attempting to delete business:", {
        paramId,
        businessId,
        businessIdToDelete,
      });

      const response = await fetch(`/api/businesses/${businessIdToDelete}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        if (response.status === 404) {
          showToast("This business no longer exists or you don't have access.", "sage", 4000);
          setIsDeleteDialogOpen(false);
          setTimeout(() => {
            router.replace("/profile");
          }, 1500);
          return;
        }

        if (response.status === 403) {
          throw new Error("You do not have permission to delete this business");
        }

        if (response.status === 401) {
          throw new Error("You must be logged in to delete this business");
        }

        if (response.status === 400) {
          throw new Error(payload?.error || "Invalid business ID");
        }

        if (response.status === 500) {
          const details = payload?.details || "Server error occurred";
          throw new Error(`Failed to delete business: ${details}`);
        }

        throw new Error(payload?.error || `Failed to delete business (HTTP ${response.status})`);
      }

      showToast("Business deleted successfully", "success", 3000);

      const { notifyBusinessDeleted } = await import("../../../lib/utils/businessUpdateEvents");
      notifyBusinessDeleted(businessIdToDelete);

      setIsDeleteDialogOpen(false);
      setTimeout(() => {
        router.replace("/profile");
      }, 1000);
    } catch (confirmDeleteError: any) {
      console.error("Error deleting business:", confirmDeleteError);
      setDeleteError(confirmDeleteError.message || "Failed to delete business");
      showToast(confirmDeleteError.message || "Failed to delete business", "error", 5000);
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    businessId,
    previousHref,
    previousLabel,
    formData,
    isChecking,
    hasAccess,
    isLoading,
    error,
    isSaving,
    uploadingImages,
    deletingImageIndex,
    reorderingImage,
    isDeleteDialogOpen,
    isDeleting,
    deleteError,
    handleInputChange,
    handleHoursChange,
    handleImageUpload,
    removeImage,
    setAsPrimary,
    addSpecial,
    updateSpecial,
    removeSpecial,
    handleSave,
    handleDeleteClick,
    handleConfirmDelete,
    setIsDeleteDialogOpen,
    setDeleteError,
  };
}
