"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import {
    Store,
    Save,
    Upload,
    X,
    Plus,
    MapPin,
    Phone,
    Mail,
    Globe,
    Clock,
    DollarSign,
    Tag,
    ImageIcon,
    Edit3,
    Trash2,
} from "lucide-react";
import { PageLoader } from "../../../components/Loader";
import { ConfirmationDialog } from "@/components/molecules/ConfirmationDialog";
import EventsForm from "../../../components/BusinessEdit/EventsForm";
import {
    EDIT_BUSINESS_CATEGORIES,
    EDIT_BUSINESS_DAYS,
    EDIT_BUSINESS_PRICE_RANGES,
    useBusinessEditPage,
} from "./useBusinessEditPage";

// CSS animations to match business profile page
const animations = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideInFromTop {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .animate-fade-in-up {
    animation: fadeInUp 0.6s ease-out forwards;
  }
  
  .animate-fade-in {
    animation: fadeIn 0.4s ease-out forwards;
  }
  
  .animate-slide-in-top {
    animation: slideInFromTop 0.5s ease-out forwards;
  }
  
  .animate-delay-100 { animation-delay: 0.1s; opacity: 0; }
  .animate-delay-200 { animation-delay: 0.2s; opacity: 0; }
  .animate-delay-300 { animation-delay: 0.3s; opacity: 0; }
`;

export default function BusinessEditPage() {
    const {
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
    } = useBusinessEditPage();

    const categories = EDIT_BUSINESS_CATEGORIES;
    const priceRanges = EDIT_BUSINESS_PRICE_RANGES;
    const days = EDIT_BUSINESS_DAYS;

    if (!businessId || isChecking || isLoading) {
        return <PageLoader size="lg" variant="wavy" color="sage"  />;
    }

    if (!hasAccess) {
        return (
            <div className="min-h-dvh bg-off-white flex items-center justify-center px-6 text-center">
                <div className="space-y-4 max-w-sm">
                    <h2 className="text-xl font-semibold text-charcoal font-urbanist">Access denied</h2>
                    <p className="text-sm text-charcoal/70 font-urbanist">
                        You must be a verified owner of this business to edit its profile.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            href={`/business/${businessId}`}
                            className="px-5 py-2.5 rounded-full bg-card-bg text-white font-urbanist font-600 hover:bg-card-bg/90 transition-all duration-200"
                        >
                            View Business
                        </Link>
                        <Link
                          href="/claim-business"
                            className="px-5 py-2.5 rounded-full border border-sage/40 text-charcoal font-urbanist font-600 hover:bg-card-bg/10 transition-all duration-200"
                        >
                            Claim Ownership
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-dvh bg-off-white flex items-center justify-center px-6 text-center">
                <div className="space-y-4 max-w-sm">
                    <h2 className="text-xl font-semibold text-charcoal font-urbanist">Error</h2>
                    <p className="text-sm text-charcoal/70 font-urbanist">{error}</p>
                    <Link
                        href={`/business/${businessId}`}
                        className="px-5 py-2.5 rounded-full bg-card-bg text-white font-urbanist font-600 hover:bg-card-bg/90 transition-all duration-200"
                    >
                        Back to Business
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: animations }} />
            {/* Google Fonts */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            {/* SF Pro Font Setup */}
            <style jsx global>{`
                .font-urbanist {
                    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text",
                        "SF Pro Display", "Helvetica Neue", Helvetica, Arial, system-ui,
                        sans-serif;
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                    font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
                }
            `}</style>
            <div
                className="min-h-dvh bg-off-white relative overflow-hidden font-urbanist"
                style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                }}
            >
                {/* Main Header */}

                <div className="min-h-[100dvh] bg-gradient-to-b from-off-white/0 via-off-white/50 to-off-white">
                        <section
                            className="relative"
                            style={{
                                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                            }}
                        >
                            <div className="container mx-auto max-w-[1300px] px-4 sm:px-6 relative z-10">
                                {/* Breadcrumb Navigation */}
                                <nav className="pb-1" aria-label="Breadcrumb">
                                    <ol className="flex items-center gap-2 text-sm sm:text-base flex-nowrap overflow-x-auto scrollbar-hide">
                                        <li className="flex-shrink-0">
                                            <Link href={previousHref} className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium whitespace-nowrap truncate max-w-[150px] sm:max-w-none" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                                {previousLabel}
                                            </Link>
                                        </li>
                                        <li className="flex items-center flex-shrink-0">
                                            <ChevronRight className="w-4 h-4 text-navbar-bg" />
                                        </li>
                                        <li className="min-w-0 flex-1">
                                            <span className="text-charcoal font-semibold truncate block" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                                Edit
                                            </span>
                                        </li>
                                    </ol>
                                </nav>
                                <div className="max-w-6xl mx-auto pt-8 pb-8">
                    <div className="space-y-6">
                        {/* Basic Information Section */}
                        <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-hidden  backdrop-blur-md shadow-md ring-1 ring-white/20 px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12 animate-fade-in-up animate-delay-100">
                            <div className="relative z-10">
                                <h3 className="font-urbanist text-base font-600 text-charcoal mb-6 flex items-center gap-3">
                                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-sage/20 to-sage/10">
                                        <Store className="w-4 h-4 text-navbar-bg" />
                                    </span>
                                    Basic Information
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>Business Name</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-full text-sm placeholder:text-charcoal/70 font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                                            placeholder="Enter business name"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>Category</label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => handleInputChange('category', e.target.value)}
                                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-full text-sm font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                                        >
                                            {categories.map(category => (
                                                <option key={category} value={category}>{category}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-white mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>Description</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => handleInputChange('description', e.target.value)}
                                            rows={4}
                                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-[12px] text-sm placeholder:text-charcoal/70 font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200 resize-none"
                                            placeholder="Describe your business..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Images Section */}
                        <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-hidden  backdrop-blur-md shadow-md ring-1 ring-white/20 px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12 animate-fade-in-up animate-delay-200">
                            <div className="relative z-10">
                                <h3 className="font-urbanist text-base font-600 text-charcoal mb-6 flex items-center gap-3">
                                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-sage/20 to-sage/10">
                                        <ImageIcon className="w-4 h-4 text-navbar-bg" />
                                    </span>
                                    Business Photos
                                </h3>

                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                                    {formData.images.map((image, index) => (
                                        <div key={index} className="relative group">
                                            <div className="aspect-square rounded-sm overflow-hidden bg-white/20  relative">
                                                {deletingImageIndex === index ? (
                                                    <div className="w-full h-full flex items-center justify-center bg-charcoal/20">
                                                        <PageLoader size="sm" variant="wavy" color="sage" />
                                                    </div>
                                                ) : (
                                                    <Image
                                                        src={image}
                                                        alt={`Business photo ${index + 1}`}
                                                        width={200}
                                                        height={200}
                                                        className="w-full h-full object-cover"
                                                    />
                                                )}
                                                {index === 0 && (
                                                    <div className="absolute top-2 left-2 bg-card-bg text-white text-xs px-2 py-1 rounded-full font-semibold">
                                                        Primary
                                                    </div>
                                                )}
                                            </div>
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 rounded-sm flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                                {index !== 0 && (
                                                    <button
                                                        onClick={() => setAsPrimary(index)}
                                                        disabled={reorderingImage === index}
                                                        className="bg-card-bg hover:bg-card-bg/90 text-white px-3 py-1.5 rounded-sm text-xs font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                                        aria-label="Set as primary image"
                                                    >
                                                        {reorderingImage === index ? (
                                                            <>
                                                                <PageLoader size="xs" variant="wavy" color="white" />
                                                                <span>Setting...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Edit3 className="w-3 h-3 text-navbar-bg" />
                                                                <span>Set Primary</span>
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => removeImage(index)}
                                                    disabled={deletingImageIndex === index}
                                                    className="bg-gradient-to-br from-charcoal to-charcoal/90 hover:from-charcoal/90 hover:to-charcoal/80 text-white px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                                    aria-label="Remove image"
                                                >
                                                    {deletingImageIndex === index ? (
                                                        <>
                                                            <PageLoader size="xs" variant="wavy" color="white" />
                                                            <span>Deleting...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <X className="w-3 h-3 text-navbar-bg" strokeWidth={2.5} />
                                                            <span>Delete</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {formData.images.length < 10 && (
                                        <label className="aspect-square rounded-sm border-2 border-dashed border-charcoal/30 flex items-center justify-center cursor-pointer hover:border-sage hover:bg-card-bg/5 transition-all duration-200">
                                            <div className="text-center">
                                                <Upload className="w-8 h-8 text-navbar-bg mx-auto mb-2" />
                                                <span className="font-urbanist text-sm text-charcoal/60">Add Photo</span>
                                                <span className="font-urbanist text-xs text-charcoal/60 block mt-1">
                                                    {10 - formData.images.length} remaining
                                                </span>
                                            </div>
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="hidden"
                                                disabled={uploadingImages || formData.images.length >= 10}
                                            />
                                        </label>
                                    )}
                                </div>

                                {uploadingImages && (
                                    <div className="text-center py-4">
                                        <PageLoader size="sm" variant="wavy" color="sage"  />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Contact Information Section */}
                        <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-hidden  backdrop-blur-md shadow-md ring-1 ring-white/20 px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12 animate-fade-in-up animate-delay-300">
                            <div className="relative z-10">
                                <h3 className="font-urbanist text-base font-600 text-charcoal mb-6 flex items-center gap-3">
                                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-sage/20 to-sage/10">
                                        <Phone className="w-4 h-4 text-navbar-bg" />
                                    </span>
                                    Contact Information
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                            <MapPin className="w-4 h-4 text-navbar-bg" />
                                            Address
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.address}
                                            onChange={(e) => handleInputChange('address', e.target.value)}
                                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-full text-sm placeholder:text-charcoal/70 font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                                            placeholder="Enter business address"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                            <Phone className="w-4 h-4 text-navbar-bg" />
                                            Phone Number
                                        </label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => handleInputChange('phone', e.target.value)}
                                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-full text-sm placeholder:text-charcoal/70 font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                                            placeholder="Enter phone number"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                            <Mail className="w-4 h-4 text-navbar-bg" />
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => handleInputChange('email', e.target.value)}
                                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-full text-sm placeholder:text-charcoal/70 font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                                            placeholder="Enter email address"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                            <Globe className="w-4 h-4 text-navbar-bg" />
                                            Website
                                        </label>
                                        <input
                                            type="url"
                                            value={formData.website}
                                            onChange={(e) => handleInputChange('website', e.target.value)}
                                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-full text-sm placeholder:text-charcoal/70 font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                                            placeholder="Enter website URL"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                            <DollarSign className="w-4 h-4 text-navbar-bg" />
                                            Price Range
                                        </label>
                                        <select
                                            value={formData.priceRange}
                                            onChange={(e) => handleInputChange('priceRange', e.target.value)}
                                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-full text-sm font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                                        >
                                            {priceRanges.map(range => (
                                                <option key={range.value} value={range.value}>{range.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Business Hours Section */}
                        <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-hidden  backdrop-blur-md shadow-md ring-1 ring-white/20 px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12 animate-fade-in-up">
                            <div className="relative z-10">
                                <h3 className="font-urbanist text-base font-600 text-charcoal mb-6 flex items-center gap-3">
                                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-sage/20 to-sage/10">
                                        <Clock className="w-4 h-4 text-navbar-bg" />
                                    </span>
                                    Business Hours
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {days.map(day => (
                                        <div key={day.key} className="flex items-center gap-3">
                                            <label className="w-24 text-sm font-semibold text-white" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>{day.label}</label>
                                            <input
                                                type="text"
                                                value={formData.hours[day.key as keyof typeof formData.hours]}
                                                onChange={(e) => handleHoursChange(day.key, e.target.value)}
                                                className="flex-1 px-3 py-2 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-full text-sm font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                                                placeholder="e.g., 9:00 AM - 5:00 PM"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Specials Section */}
                        <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-hidden  backdrop-blur-md shadow-md ring-1 ring-white/20 px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12 animate-fade-in-up">
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-urbanist text-base font-600 text-charcoal flex items-center gap-3">
                                        <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-sage/20 to-sage/10">
                                            <Tag className="w-4 h-4 text-navbar-bg" />
                                        </span>
                                        Specials & Offers
                                    </h3>
                                    <button
                                        onClick={addSpecial}
                                        className="bg-card-bg hover:bg-card-bg/90 text-white px-4 py-2 rounded-full text-sm font-600 font-urbanist transition-all duration-300 flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4 text-navbar-bg" />
                                        Add Special
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {formData.specials.map((special) => (
                                        <div key={special.id} className="bg-white/40 backdrop-blur-sm rounded-full p-4  group relative">
                                            <button
                                                onClick={() => removeSpecial(special.id)}
                                                className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-br from-charcoal to-charcoal/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 border border-white/30 shadow-lg z-10"
                                                aria-label="Remove special"
                                            >
                                                <X className="w-4 h-4 text-navbar-bg" strokeWidth={2.5} />
                                            </button>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-sm font-semibold text-white mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>Name</label>
                                                    <input
                                                        type="text"
                                                        value={special.name}
                                                        onChange={(e) => updateSpecial(special.id, 'name', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-full text-sm font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                                                        placeholder="Special name"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-white mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>Description</label>
                                                    <input
                                                        type="text"
                                                        value={special.description}
                                                        onChange={(e) => updateSpecial(special.id, 'description', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-full text-sm font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                                                        placeholder="When available"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Events & Specials Management */}
                        <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-hidden  backdrop-blur-md shadow-md ring-1 ring-white/20 px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12">
                            <div className="relative z-10">
                                {businessId && formData.name && (
                                    <EventsForm businessId={businessId} businessName={formData.name} />
                                )}
                            </div>
                        </div>

                        {/* Danger Zone - Delete Business */}
                        <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-hidden  backdrop-blur-md shadow-md ring-1 ring-white/20 px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12">
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-navbar-bg/20 to-navbar-bg/10">
                                        <Trash2 className="w-5 h-5 text-navbar-bg" />
                                    </span>
                                    <h3 className="text-base font-semibold text-charcoal">
                                        Danger Zone
                                    </h3>
                                </div>
                                <div className="border-t border-coral/20 pt-4">
                                    <h4 className="text-base font-600 text-coral mb-2" style={{ fontFamily: '"SF Pro New", -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}>Delete Business</h4>
                                    <p className="text-sm text-charcoal/70 mb-4" style={{ fontFamily: '"SF Pro New", -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif', fontWeight: 600 }}>
                                        Permanently delete this business and all associated data. This action cannot be undone.
                                    </p>
                                    <button
                                        onClick={handleDeleteClick}
                                        disabled={isDeleting}
                                        className="px-6 py-2 rounded-full text-sm font-600 bg-white/40 text-coral border border-coral hover:bg-coral hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{ fontFamily: '"SF Pro New", -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif', fontWeight: 600 }}
                                    >
                                        {isDeleting ? "Deleting..." : "Delete Business"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-between items-center gap-3">
                            <Link
                                href={`/business/${businessId}`}
                                className="px-6 py-3 bg-white/40 text-charcoal rounded-full text-sm font-600 font-urbanist transition-all duration-300 hover:bg-white/60 "
                            >
                                Cancel
                            </Link>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-6 py-3 bg-card-bg hover:bg-card-bg/90 text-white rounded-full text-sm font-600 font-urbanist transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
                            >
                                <Save className="w-4 h-4 text-navbar-bg" />
                                {isSaving ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                                </div>
                            </div>
                        </section>
                </div>
            </div>

            {/* Delete Business Confirmation Dialog */}
            <ConfirmationDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => {
                    setIsDeleteDialogOpen(false);
                    setDeleteError(null);
                }}
                onConfirm={handleConfirmDelete}
                title="Delete Business"
                message={`Are you sure you want to delete "${formData.name}"? This action cannot be undone. All business data, images, reviews, and statistics will be permanently deleted.`}
                confirmText={isDeleting ? "Deleting..." : "Delete Business"}
                cancelText="Cancel"
                variant="danger"
                isLoading={isDeleting}
                error={deleteError}
                requireConfirmText="DELETE"
            />
        </>
    );
}


