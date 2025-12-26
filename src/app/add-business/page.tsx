"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { ChevronRight } from "react-feather";
import { useToast } from "../contexts/ToastContext";
import { useAuth } from "../contexts/AuthContext";
import {
    Store,
    Save,
    MapPin,
    Phone,
    Mail,
    Globe,
    DollarSign,
    Loader2,
    Clock,
    ImageIcon,
    Upload,
    X,
} from "lucide-react";
import Image from "next/image";
import { PageLoader } from "../components/Loader";
import Header from "../components/Header/Header";
import dynamic from "next/dynamic";
import { getBrowserSupabase } from "../lib/supabase/client";

const Footer = dynamic(() => import("../components/Footer/Footer"), {
    loading: () => null,
    ssr: false,
});

// CSS animations
const animations = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .animate-fade-in-up {
    animation: fadeInUp 0.6s ease-out forwards;
  }
  
  .animate-fade-in {
    animation: fadeIn 0.4s ease-out forwards;
  }
  
  .animate-delay-100 { animation-delay: 0.1s; opacity: 0; }
  .animate-delay-200 { animation-delay: 0.2s; opacity: 0; }
  .animate-delay-300 { animation-delay: 0.3s; opacity: 0; }
`;

interface Subcategory {
    id: string;
    label: string;
    interest_id: string;
}

export default function AddBusinessPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const { user, isLoading: authLoading } = useAuth();

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        category: "",
        location: "",
        address: "",
        phone: "",
        email: "",
        website: "",
        priceRange: "$$",
        lat: "",
        lng: "",
        hours: {
            monday: "",
            tuesday: "",
            wednesday: "",
            thursday: "",
            friday: "",
            saturday: "",
            sunday: "",
        },
    });

    const [images, setImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [uploadingImages, setUploadingImages] = useState(false);

    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    // Redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            router.push(`/login?redirect=/add-business`);
        }
    }, [user, authLoading, router]);

    // Load subcategories
    useEffect(() => {
        const loadSubcategories = async () => {
            try {
                setLoadingCategories(true);
                const response = await fetch('/api/subcategories');
                if (!response.ok) {
                    throw new Error('Failed to load categories');
                }
                const data = await response.json();
                setSubcategories(data.subcategories || []);
            } catch (error) {
                console.error('Error loading subcategories:', error);
                showToast('Failed to load categories', 'sage', 3000);
            } finally {
                setLoadingCategories(false);
            }
        };

        loadSubcategories();
    }, [showToast]);

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleHoursChange = (day: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            hours: {
                ...prev.hours,
                [day]: value
            }
        }));
    };

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        const newFiles: File[] = [];
        const newPreviews: string[] = [];

        Array.from(files).forEach((file) => {
            // Validate file type
            if (!file.type.startsWith("image/")) {
                showToast(`${file.name} is not an image file`, 'sage', 3000);
                return;
            }

            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                showToast(`${file.name} is too large. Maximum size is 5MB`, 'sage', 3000);
                return;
            }

            // Check total image limit (10 images max)
            if (images.length + newFiles.length >= 10) {
                showToast('Maximum 10 images allowed', 'sage', 3000);
                return;
            }

            newFiles.push(file);
            newPreviews.push(URL.createObjectURL(file));
        });

        if (newFiles.length > 0) {
            setImages(prev => [...prev, ...newFiles]);
            setImagePreviews(prev => [...prev, ...newPreviews]);
        }

        // Reset input
        if (event.target) {
            event.target.value = '';
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        // Revoke object URL to prevent memory leaks
        URL.revokeObjectURL(imagePreviews[index]);
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleBlur = (field: string) => {
        setTouched(prev => ({
            ...prev,
            [field]: true
        }));
        // Skip validation for hours field (it's an object, not a string)
        if (field !== 'hours') {
            const value = formData[field as keyof typeof formData];
            if (typeof value === 'string') {
                validateField(field, value);
            }
        }
    };

    const validateField = (field: string, value: string) => {
        let error = "";

        switch (field) {
            case "name":
                if (!value.trim()) {
                    error = "Business name is required";
                } else if (value.trim().length < 2) {
                    error = "Business name must be at least 2 characters";
                } else if (value.trim().length > 100) {
                    error = "Business name must be less than 100 characters";
                }
                break;
            case "category":
                if (!value) {
                    error = "Category is required";
                }
                break;
            case "location":
                if (!value.trim()) {
                    error = "Location is required";
                } else if (value.trim().length < 2) {
                    error = "Location must be at least 2 characters";
                }
                break;
            case "email":
                if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    error = "Please enter a valid email address";
                }
                break;
            case "website":
                if (value && !/^https?:\/\/.+\..+/.test(value)) {
                    error = "Please enter a valid website URL (e.g., https://example.com)";
                }
                break;
            case "phone":
                if (value && !/^[\d\s\-\+\(\)]+$/.test(value)) {
                    error = "Please enter a valid phone number";
                }
                break;
            case "lat":
                if (value && (isNaN(Number(value)) || Number(value) < -90 || Number(value) > 90)) {
                    error = "Latitude must be between -90 and 90";
                }
                break;
            case "lng":
                if (value && (isNaN(Number(value)) || Number(value) < -180 || Number(value) > 180)) {
                    error = "Longitude must be between -180 and 180";
                }
                break;
        }

        if (error) {
            setErrors(prev => ({
                ...prev,
                [field]: error
            }));
        } else {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }

        return !error;
    };

    const validateForm = () => {
        const fieldsToValidate = ["name", "category", "location"];
        let isValid = true;

        fieldsToValidate.forEach(field => {
            const value = formData[field as keyof typeof formData];
            if (!validateField(field, value as string)) {
                isValid = false;
            }
        });

        // Validate optional fields if they have values
        if (formData.email && !validateField("email", formData.email)) {
            isValid = false;
        }
        if (formData.website && !validateField("website", formData.website)) {
            isValid = false;
        }
        if (formData.phone && !validateField("phone", formData.phone)) {
            isValid = false;
        }
        if (formData.lat && !validateField("lat", formData.lat)) {
            isValid = false;
        }
        if (formData.lng && !validateField("lng", formData.lng)) {
            isValid = false;
        }

        return isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Mark all fields as touched
        Object.keys(formData).forEach(field => {
            setTouched(prev => ({
                ...prev,
                [field]: true
            }));
        });

        if (!validateForm()) {
            showToast('Please fix the errors in the form', 'sage', 3000);
            return;
        }

        setIsSubmitting(true);

        try {
            // Build hours object - only include days with values
            const hoursObj: Record<string, string> = {};
            Object.entries(formData.hours).forEach(([day, hours]) => {
                if (hours && hours.trim()) {
                    hoursObj[day] = hours.trim();
                }
            });
            const hours = Object.keys(hoursObj).length > 0 ? hoursObj : null;

            const payload = {
                name: formData.name.trim(),
                description: formData.description.trim() || null,
                category: formData.category,
                location: formData.location.trim(),
                address: formData.address.trim() || null,
                phone: formData.phone.trim() || null,
                email: formData.email.trim() || null,
                website: formData.website.trim() || null,
                priceRange: formData.priceRange,
                hours: hours,
                lat: formData.lat ? parseFloat(formData.lat) : null,
                lng: formData.lng ? parseFloat(formData.lng) : null,
            };

            const response = await fetch('/api/businesses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create business');
            }

            const businessId = data.business.id;

            // Upload images if any were selected
            if (images.length > 0) {
                setUploadingImages(true);
                try {
                    const supabase = getBrowserSupabase();
                    const uploadedUrls: string[] = [];

                    for (let i = 0; i < images.length; i++) {
                        const image = images[i];
                        const fileExt = image.name.split('.').pop() || 'jpg';
                        const timestamp = Date.now();
                        const fileName = `${businessId}_${i}_${timestamp}.${fileExt}`;
                        const filePath = `${businessId}/${fileName}`;

                        // Upload to Supabase Storage
                        const { error: uploadError } = await supabase.storage
                            .from('business-images')
                            .upload(filePath, image, {
                                cacheControl: '3600',
                                upsert: false
                            });

                        if (uploadError) {
                            console.error('Error uploading image:', uploadError);
                            continue;
                        }

                        // Get public URL
                        const { data: { publicUrl } } = supabase.storage
                            .from('business-images')
                            .getPublicUrl(filePath);

                        uploadedUrls.push(publicUrl);
                    }

                    // Update business with uploaded images
                    if (uploadedUrls.length > 0) {
                        // Set first image as uploaded_image (primary image)
                        // Note: The API may need to be updated to accept uploaded_image field
                        const updateResponse = await fetch(`/api/businesses/${businessId}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                uploaded_image: uploadedUrls[0],
                            }),
                        });

                        if (!updateResponse.ok) {
                            // Try direct Supabase update as fallback
                            try {
                                const supabase = getBrowserSupabase();
                                const { error: directUpdateError } = await supabase
                                    .from('businesses')
                                    .update({ uploaded_image: uploadedUrls[0] })
                                    .eq('id', businessId);

                                if (directUpdateError) {
                                    console.warn('Failed to update business with image URL:', directUpdateError);
                                }
                            } catch (fallbackError) {
                                console.warn('Failed to update business with image URL, but business was created');
                            }
                        }
                    }
                } catch (imageError: any) {
                    console.error('Error uploading images:', imageError);
                    // Don't fail the whole operation if image upload fails
                    showToast('Business created, but some images failed to upload', 'sage', 4000);
                } finally {
                    setUploadingImages(false);
                }
            }

            showToast('Business created successfully!', 'success', 3000);

            // Redirect to business dashboard after short delay
            setTimeout(() => {
                router.push(`/owners/businesses/${businessId}`);
            }, 1000);
        } catch (error: any) {
            console.error('Error creating business:', error);
            showToast(error.message || 'Failed to create business. Please try again.', 'sage', 4000);
        } finally {
            setIsSubmitting(false);
        }
    };

    const priceRanges = [
        { value: "$", label: "$ - Budget Friendly" },
        { value: "$$", label: "$$ - Moderate" },
        { value: "$$$", label: "$$$ - Upscale" },
        { value: "$$$$", label: "$$$$ - Fine Dining/Luxury" },
    ];

    // Show loader while checking auth
    if (authLoading) {
        return <PageLoader size="lg" variant="wavy" color="sage" />;
    }

    // Show message if not authenticated (will redirect)
    if (!user) {
        return null;
    }

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: animations }} />
            <div
                className="min-h-dvh bg-off-white relative overflow-hidden font-urbanist"
                style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                }}
            >
                <Header
                    showSearch={false}
                    variant="white"
                    backgroundClassName="bg-navbar-bg"
                    topPosition="top-0"
                    reducedPadding={true}
                    whiteText={true}
                />

                <div className="bg-gradient-to-b from-off-white/0 via-off-white/50 to-off-white">
                    <div className="pt-20 sm:pt-24 pb-28">
                        <section className="relative">
                            <div className="container mx-auto max-w-[1300px] px-4 sm:px-6 relative z-10">
                                {/* Breadcrumb Navigation */}
                                <nav className="mb-4 sm:mb-6 px-2" aria-label="Breadcrumb">
                                    <ol className="flex items-center gap-2 text-sm sm:text-base">
                                        <li>
                                            <Link href="/home" className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                                Home
                                            </Link>
                                        </li>
                                        <li className="flex items-center">
                                            <ChevronRight className="w-4 h-4 text-charcoal/40" />
                                        </li>
                                        <li>
                                            <span className="text-charcoal font-semibold" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                                Add Business
                                            </span>
                                        </li>
                                    </ol>
                                </nav>

                                <div className="max-w-4xl mx-auto pt-8 pb-8">
                                    {/* Page Header */}
                                    <div className="text-center mb-8 animate-fade-in-up">
                                        <div className="w-16 h-16 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-sage/20">
                                            <Store className="w-8 h-8 text-sage" />
                                        </div>
                                        <h1 className="text-2xl sm:text-3xl font-semibold text-charcoal mb-2 font-urbanist">
                                            Add Your Business
                                        </h1>
                                        <p className="text-sm sm:text-base text-charcoal/70 font-urbanist max-w-md mx-auto">
                                            Create your business profile to connect with customers and manage your listing
                                        </p>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        {/* Basic Information Section */}
                                        <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-md border border-white/50 rounded-[12px] ring-1 ring-white/20 p-6 relative overflow-hidden animate-fade-in-up animate-delay-100">
                                            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg" />
                                            <div className="relative z-10">
                                                <h3 className="font-urbanist text-base font-600 text-charcoal mb-6 flex items-center gap-3">
                                                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-sage/20 to-sage/10">
                                                        <Store className="w-4 h-4 text-sage" />
                                                    </span>
                                                    Basic Information
                                                </h3>

                                                <div className="space-y-6">
                                                    {/* Business Name */}
                                                    <div>
                                                        <label className="block font-urbanist text-sm font-600 text-charcoal mb-2">
                                                            Business Name <span className="text-coral">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={formData.name}
                                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                                            onBlur={() => handleBlur('name')}
                                                            className={`w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 rounded-[12px] text-sm placeholder:text-charcoal/50 font-urbanist text-charcoal focus:outline-none focus:ring-2 transition-all duration-200 ${
                                                                errors.name
                                                                    ? 'border-coral focus:border-coral focus:ring-coral/20'
                                                                    : 'border-charcoal/20 focus:border-sage focus:ring-sage/20'
                                                            }`}
                                                            placeholder="Enter business name"
                                                        />
                                                        {touched.name && errors.name && (
                                                            <p className="mt-1 text-xs text-coral font-urbanist">{errors.name}</p>
                                                        )}
                                                    </div>

                                                    {/* Category */}
                                                    <div>
                                                        <label className="block font-urbanist text-sm font-600 text-charcoal mb-2">
                                                            Category <span className="text-coral">*</span>
                                                        </label>
                                                        {loadingCategories ? (
                                                            <div className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-[12px] flex items-center gap-2">
                                                                <Loader2 className="w-4 h-4 animate-spin text-charcoal/60" />
                                                                <span className="text-sm text-charcoal/60 font-urbanist">Loading categories...</span>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <select
                                                                    value={formData.category}
                                                                    onChange={(e) => handleInputChange('category', e.target.value)}
                                                                    onBlur={() => handleBlur('category')}
                                                                    className={`w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 rounded-[12px] text-sm font-urbanist text-charcoal focus:outline-none focus:ring-2 transition-all duration-200 ${
                                                                        errors.category
                                                                            ? 'border-coral focus:border-coral focus:ring-coral/20'
                                                                            : 'border-charcoal/20 focus:border-sage focus:ring-sage/20'
                                                                    }`}
                                                                >
                                                                    <option value="">Select a category</option>
                                                                    {subcategories.map(subcategory => (
                                                                        <option key={subcategory.id} value={subcategory.label}>
                                                                            {subcategory.label}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                                {touched.category && errors.category && (
                                                                    <p className="mt-1 text-xs text-coral font-urbanist">{errors.category}</p>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Description */}
                                                    <div>
                                                        <label className="block font-urbanist text-sm font-600 text-charcoal mb-2">
                                                            Description
                                                        </label>
                                                        <textarea
                                                            value={formData.description}
                                                            onChange={(e) => handleInputChange('description', e.target.value)}
                                                            rows={4}
                                                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-[12px] text-sm placeholder:text-charcoal/50 font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200 resize-none"
                                                            placeholder="Describe your business..."
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Location Information Section */}
                                        <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-md border border-white/50 rounded-[12px] ring-1 ring-white/20 p-6 relative overflow-hidden animate-fade-in-up animate-delay-200">
                                            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-coral/10 to-transparent rounded-full blur-lg" />
                                            <div className="relative z-10">
                                                <h3 className="font-urbanist text-base font-600 text-charcoal mb-6 flex items-center gap-3">
                                                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-coral/20 to-coral/10">
                                                        <MapPin className="w-4 h-4 text-coral" />
                                                    </span>
                                                    Location Information
                                                </h3>

                                                <div className="space-y-6">
                                                    {/* Location */}
                                                    <div>
                                                        <label className="block font-urbanist text-sm font-600 text-charcoal mb-2">
                                                            Location (City/Area) <span className="text-coral">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={formData.location}
                                                            onChange={(e) => handleInputChange('location', e.target.value)}
                                                            onBlur={() => handleBlur('location')}
                                                            className={`w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 rounded-[12px] text-sm placeholder:text-charcoal/50 font-urbanist text-charcoal focus:outline-none focus:ring-2 transition-all duration-200 ${
                                                                errors.location
                                                                    ? 'border-coral focus:border-coral focus:ring-coral/20'
                                                                    : 'border-charcoal/20 focus:border-sage focus:ring-sage/20'
                                                            }`}
                                                            placeholder="e.g., Cape Town, V&A Waterfront"
                                                        />
                                                        {touched.location && errors.location && (
                                                            <p className="mt-1 text-xs text-coral font-urbanist">{errors.location}</p>
                                                        )}
                                                    </div>

                                                    {/* Address */}
                                                    <div>
                                                        <label className="block font-urbanist text-sm font-600 text-charcoal mb-2">
                                                            Full Address
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={formData.address}
                                                            onChange={(e) => handleInputChange('address', e.target.value)}
                                                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-[12px] text-sm placeholder:text-charcoal/50 font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                                                            placeholder="Street address, building number, etc."
                                                        />
                                                    </div>

                                                    {/* Coordinates (Optional) */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block font-urbanist text-sm font-600 text-charcoal mb-2">
                                                                Latitude (Optional)
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={formData.lat}
                                                                onChange={(e) => handleInputChange('lat', e.target.value)}
                                                                onBlur={() => handleBlur('lat')}
                                                                className={`w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 rounded-[12px] text-sm placeholder:text-charcoal/50 font-urbanist text-charcoal focus:outline-none focus:ring-2 transition-all duration-200 ${
                                                                    errors.lat
                                                                        ? 'border-coral focus:border-coral focus:ring-coral/20'
                                                                        : 'border-charcoal/20 focus:border-sage focus:ring-sage/20'
                                                                }`}
                                                                placeholder="e.g., -33.9249"
                                                            />
                                                            {touched.lat && errors.lat && (
                                                                <p className="mt-1 text-xs text-coral font-urbanist">{errors.lat}</p>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <label className="block font-urbanist text-sm font-600 text-charcoal mb-2">
                                                                Longitude (Optional)
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={formData.lng}
                                                                onChange={(e) => handleInputChange('lng', e.target.value)}
                                                                onBlur={() => handleBlur('lng')}
                                                                className={`w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 rounded-[12px] text-sm placeholder:text-charcoal/50 font-urbanist text-charcoal focus:outline-none focus:ring-2 transition-all duration-200 ${
                                                                    errors.lng
                                                                        ? 'border-coral focus:border-coral focus:ring-coral/20'
                                                                        : 'border-charcoal/20 focus:border-sage focus:ring-sage/20'
                                                                }`}
                                                                placeholder="e.g., 18.4241"
                                                            />
                                                            {touched.lng && errors.lng && (
                                                                <p className="mt-1 text-xs text-coral font-urbanist">{errors.lng}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Contact Information Section */}
                                        <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-md border border-white/50 rounded-[12px] ring-1 ring-white/20 p-6 relative overflow-hidden animate-fade-in-up animate-delay-300">
                                            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg" />
                                            <div className="relative z-10">
                                                <h3 className="font-urbanist text-base font-600 text-charcoal mb-6 flex items-center gap-3">
                                                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-sage/20 to-sage/10">
                                                        <Phone className="w-4 h-4 text-sage" />
                                                    </span>
                                                    Contact Information
                                                </h3>

                                                <div className="space-y-6">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        {/* Phone */}
                                                        <div>
                                                            <label className="block font-urbanist text-sm font-600 text-charcoal mb-2">
                                                                Phone Number
                                                            </label>
                                                            <input
                                                                type="tel"
                                                                value={formData.phone}
                                                                onChange={(e) => handleInputChange('phone', e.target.value)}
                                                                onBlur={() => handleBlur('phone')}
                                                                className={`w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 rounded-[12px] text-sm placeholder:text-charcoal/50 font-urbanist text-charcoal focus:outline-none focus:ring-2 transition-all duration-200 ${
                                                                    errors.phone
                                                                        ? 'border-coral focus:border-coral focus:ring-coral/20'
                                                                        : 'border-charcoal/20 focus:border-sage focus:ring-sage/20'
                                                                }`}
                                                                placeholder="+27 21 123 4567"
                                                            />
                                                            {touched.phone && errors.phone && (
                                                                <p className="mt-1 text-xs text-coral font-urbanist">{errors.phone}</p>
                                                            )}
                                                        </div>

                                                        {/* Email */}
                                                        <div>
                                                            <label className="block font-urbanist text-sm font-600 text-charcoal mb-2">
                                                                Email Address
                                                            </label>
                                                            <input
                                                                type="email"
                                                                value={formData.email}
                                                                onChange={(e) => handleInputChange('email', e.target.value)}
                                                                onBlur={() => handleBlur('email')}
                                                                className={`w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 rounded-[12px] text-sm placeholder:text-charcoal/50 font-urbanist text-charcoal focus:outline-none focus:ring-2 transition-all duration-200 ${
                                                                    errors.email
                                                                        ? 'border-coral focus:border-coral focus:ring-coral/20'
                                                                        : 'border-charcoal/20 focus:border-sage focus:ring-sage/20'
                                                                }`}
                                                                placeholder="business@example.com"
                                                            />
                                                            {touched.email && errors.email && (
                                                                <p className="mt-1 text-xs text-coral font-urbanist">{errors.email}</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Website */}
                                                    <div>
                                                        <label className="block font-urbanist text-sm font-600 text-charcoal mb-2">
                                                            Website
                                                        </label>
                                                        <input
                                                            type="url"
                                                            value={formData.website}
                                                            onChange={(e) => handleInputChange('website', e.target.value)}
                                                            onBlur={() => handleBlur('website')}
                                                            className={`w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 rounded-[12px] text-sm placeholder:text-charcoal/50 font-urbanist text-charcoal focus:outline-none focus:ring-2 transition-all duration-200 ${
                                                                errors.website
                                                                    ? 'border-coral focus:border-coral focus:ring-coral/20'
                                                                    : 'border-charcoal/20 focus:border-sage focus:ring-sage/20'
                                                            }`}
                                                            placeholder="https://www.example.com"
                                                        />
                                                        {touched.website && errors.website && (
                                                            <p className="mt-1 text-xs text-coral font-urbanist">{errors.website}</p>
                                                        )}
                                                    </div>

                                                    {/* Price Range */}
                                                    <div>
                                                        <label className="block font-urbanist text-sm font-600 text-charcoal mb-2">
                                                            Price Range
                                                        </label>
                                                        <select
                                                            value={formData.priceRange}
                                                            onChange={(e) => handleInputChange('priceRange', e.target.value)}
                                                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-[12px] text-sm font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                                                        >
                                                            {priceRanges.map(range => (
                                                                <option key={range.value} value={range.value}>
                                                                    {range.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Business Images Section */}
                                        <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-md border border-white/50 rounded-[12px] ring-1 ring-white/20 p-6 relative overflow-hidden animate-fade-in-up">
                                            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-coral/10 to-transparent rounded-full blur-lg" />
                                            <div className="relative z-10">
                                                <h3 className="font-urbanist text-base font-600 text-charcoal mb-6 flex items-center gap-3">
                                                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-coral/20 to-coral/10">
                                                        <ImageIcon className="w-4 h-4 text-coral" />
                                                    </span>
                                                    Business Photos (Optional)
                                                </h3>

                                                <div className="space-y-4">
                                                    {/* Image Grid */}
                                                    {imagePreviews.length > 0 && (
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                                            {imagePreviews.map((preview, index) => (
                                                                <div key={index} className="relative group aspect-square rounded-lg overflow-hidden bg-white/20 border border-white/50">
                                                                    <Image
                                                                        src={preview}
                                                                        alt={`Business photo ${index + 1}`}
                                                                        width={200}
                                                                        height={200}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeImage(index)}
                                                                        className="absolute top-2 right-2 w-7 h-7 bg-gradient-to-br from-charcoal to-charcoal/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 border border-white/30 shadow-lg"
                                                                        aria-label="Remove image"
                                                                    >
                                                                        <X className="w-4 h-4" strokeWidth={2.5} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Upload Button */}
                                                    <label className="block">
                                                        <div className="w-full min-h-[120px] border-2 border-dashed border-charcoal/30 rounded-lg flex flex-col items-center justify-center gap-3 p-6 cursor-pointer hover:border-sage hover:bg-sage/5 transition-all duration-200">
                                                            <Upload className="w-8 h-8 text-charcoal/60" />
                                                            <div className="text-center">
                                                                <span className="font-urbanist text-sm font-600 text-charcoal block mb-1">
                                                                    {imagePreviews.length === 0 ? 'Add Photos' : 'Add More Photos'}
                                                                </span>
                                                                <span className="font-urbanist text-xs text-charcoal/60">
                                                                    {imagePreviews.length}/10 images • Max 5MB each
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <input
                                                            type="file"
                                                            multiple
                                                            accept="image/*"
                                                            onChange={handleImageUpload}
                                                            className="hidden"
                                                            disabled={uploadingImages || imagePreviews.length >= 10}
                                                        />
                                                    </label>

                                                    {uploadingImages && (
                                                        <div className="flex items-center justify-center gap-2 py-4">
                                                            <Loader2 className="w-4 h-4 animate-spin text-sage" />
                                                            <span className="text-sm text-charcoal/70 font-urbanist">Uploading images...</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Business Hours Section */}
                                        <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-md border border-white/50 rounded-[12px] ring-1 ring-white/20 p-6 relative overflow-hidden animate-fade-in-up">
                                            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg" />
                                            <div className="relative z-10">
                                                <h3 className="font-urbanist text-base font-600 text-charcoal mb-6 flex items-center gap-3">
                                                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-sage/20 to-sage/10">
                                                        <Clock className="w-4 h-4 text-sage" />
                                                    </span>
                                                    Business Hours (Optional)
                                                </h3>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {[
                                                        { key: "monday", label: "Monday" },
                                                        { key: "tuesday", label: "Tuesday" },
                                                        { key: "wednesday", label: "Wednesday" },
                                                        { key: "thursday", label: "Thursday" },
                                                        { key: "friday", label: "Friday" },
                                                        { key: "saturday", label: "Saturday" },
                                                        { key: "sunday", label: "Sunday" },
                                                    ].map(day => (
                                                        <div key={day.key} className="flex items-center gap-3">
                                                            <label className="w-24 font-urbanist text-sm font-600 text-charcoal flex-shrink-0">
                                                                {day.label}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={formData.hours[day.key as keyof typeof formData.hours]}
                                                                onChange={(e) => handleHoursChange(day.key, e.target.value)}
                                                                className="flex-1 px-3 py-2 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-lg text-sm font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                                                                placeholder="e.g., 9:00 AM - 5:00 PM"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Submit Button */}
                                        <div className="flex flex-col sm:flex-row gap-4 justify-end pt-4">
                                            <Link
                                                href="/for-businesses"
                                                className="px-6 py-3 rounded-full border-2 border-charcoal/20 text-charcoal font-urbanist font-600 hover:bg-charcoal/5 transition-all duration-200 text-center"
                                            >
                                                Cancel
                                            </Link>
                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="px-6 py-3 min-h-[48px] bg-gradient-to-br from-sage to-sage/90 text-white rounded-full text-sm font-semibold font-urbanist hover:from-sage/90 hover:to-sage/80 transition-all duration-300 hover:shadow-lg active:scale-[0.98] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        <span>Creating...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="w-4 h-4" />
                                                        <span>Create Business</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                <Footer />
            </div>
        </>
    );
}

