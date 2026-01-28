"use client";

import { useState, useEffect, useRef } from 'react';
import { MapPin, X, Search, Loader } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface LocationPickerProps {
  address?: string;
  location?: string;
  lat?: number | null;
  lng?: number | null;
  onLocationSelect: (lat: number, lng: number, formattedAddress?: string) => void;
  onClose: () => void;
}

export default function LocationPicker({
  address,
  location,
  lat: initialLat,
  lng: initialLng,
  onLocationSelect,
  onClose,
}: LocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [selectedLat, setSelectedLat] = useState<number | null>(initialLat || null);
  const [selectedLng, setSelectedLng] = useState<number | null>(initialLng || null);
  const [formattedAddress, setFormattedAddress] = useState<string>('');

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!mapboxToken) {
      console.warn('Mapbox token not found');
      return;
    }

    mapboxgl.accessToken = mapboxToken;

    // Default center (Cape Town)
    let center: [number, number] = [18.4241, -33.9249];
    let zoom = 12;

    // Use existing coordinates if available
    if (initialLat && initialLng) {
      center = [initialLng, initialLat];
      zoom = 15;
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: center,
      zoom: zoom,
      interactive: true,
    });

    // Add click handler to map
    map.current.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      setSelectedLat(lat);
      setSelectedLng(lng);
      
      // Reverse geocode to get address
      reverseGeocode(lat, lng);
      
      // Update marker
      if (marker.current) {
        marker.current.setLngLat([lng, lat]);
      } else {
        marker.current = new mapboxgl.Marker({ color: '#722F37' })
          .setLngLat([lng, lat])
          .addTo(map.current!);
      }
    });

    // Add initial marker if coordinates exist
    if (initialLat && initialLng) {
      marker.current = new mapboxgl.Marker({ color: '#722F37' })
        .setLngLat([initialLng, initialLat])
        .addTo(map.current);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Reverse geocode coordinates to address
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        setFormattedAddress(data.features[0].place_name);
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  };

  // Geocode search query
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsGeocoding(true);
    try {
      const response = await fetch(`/api/geocode?address=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();

      if (data.success && data.lat && data.lng) {
        const lat = data.lat;
        const lng = data.lng;

        setSelectedLat(lat);
        setSelectedLng(lng);
        setFormattedAddress(data.formatted_address || searchQuery);

        // Update map center and marker
        if (map.current) {
          map.current.flyTo({
            center: [lng, lat],
            zoom: 15,
            duration: 1000,
          });

          if (marker.current) {
            marker.current.setLngLat([lng, lat]);
          } else {
            marker.current = new mapboxgl.Marker({ color: '#722F37' })
              .setLngLat([lng, lat])
              .addTo(map.current);
          }
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleConfirm = () => {
    if (selectedLat && selectedLng) {
      onLocationSelect(selectedLat, selectedLng, formattedAddress || undefined);
      onClose();
    }
  };

  const handleGeocodeAddress = async () => {
    const fullAddress = address || location || '';
    if (!fullAddress.trim()) return;

    setIsGeocoding(true);
    try {
      const response = await fetch(`/api/geocode?address=${encodeURIComponent(fullAddress)}`);
      const data = await response.json();

      if (data.success && data.lat && data.lng) {
        const lat = data.lat;
        const lng = data.lng;

        setSelectedLat(lat);
        setSelectedLng(lng);
        setFormattedAddress(data.formatted_address || fullAddress);

        // Update map center and marker
        if (map.current) {
          map.current.flyTo({
            center: [lng, lat],
            zoom: 15,
            duration: 1000,
          });

          if (marker.current) {
            marker.current.setLngLat([lng, lat]);
          } else {
            marker.current = new mapboxgl.Marker({ color: '#722F37' })
              .setLngLat([lng, lat])
              .addTo(map.current);
          }
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    } finally {
      setIsGeocoding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[12px] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, sans-serif' }}>
            Select Location
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-charcoal/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-charcoal" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-charcoal/60" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search for an address..."
                className="w-full pl-10 pr-4 py-2 border border-charcoal/20 rounded-full focus:outline-none focus:ring-2 focus:ring-sage/30"
                style={{ fontFamily: 'Urbanist, sans-serif' }}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isGeocoding || !searchQuery.trim()}
              className="px-4 py-2 bg-sage text-white rounded-full hover:bg-sage/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ fontFamily: 'Urbanist, sans-serif' }}
            >
              {isGeocoding ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Searching...
                </>
              ) : (
                'Search'
              )}
            </button>
          </div>
          
          {/* Geocode from address button */}
          {(address || location) && (
            <button
              onClick={handleGeocodeAddress}
              disabled={isGeocoding}
              className="mt-2 w-full px-4 py-2 bg-charcoal/10 text-charcoal rounded-full hover:bg-charcoal/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              style={{ fontFamily: 'Urbanist, sans-serif' }}
            >
              {isGeocoding ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Getting coordinates...
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4" />
                  Get coordinates from address
                </>
              )}
            </button>
          )}
        </div>

        {/* Map */}
        <div className="flex-1 relative min-h-[400px]">
          <div ref={mapContainer} className="w-full h-full" />
        </div>

        {/* Selected Location Info */}
        {(selectedLat && selectedLng) && (
          <div className="p-4 border-t bg-sage/5">
            <p className="text-sm text-charcoal/70 mb-2" style={{ fontFamily: 'Urbanist, sans-serif' }}>
              Selected Location:
            </p>
            {formattedAddress && (
              <p className="text-sm font-semibold text-charcoal mb-2" style={{ fontFamily: 'Urbanist, sans-serif' }}>
                {formattedAddress}
              </p>
            )}
            <p className="text-xs text-charcoal/60" style={{ fontFamily: 'Urbanist, sans-serif' }}>
              Coordinates: {selectedLat.toFixed(6)}, {selectedLng.toFixed(6)}
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-charcoal/20 text-charcoal rounded-full hover:bg-charcoal/5 transition-colors"
            style={{ fontFamily: 'Urbanist, sans-serif' }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedLat || !selectedLng}
            className="flex-1 px-4 py-3 bg-sage text-white rounded-full hover:bg-sage/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ fontFamily: 'Urbanist, sans-serif' }}
          >
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
}

