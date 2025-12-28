import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/geocode
 * Geocode an address to get latitude and longitude coordinates
 * Query params: address (required)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    if (!address || address.trim().length === 0) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    // Use Google Maps Geocoding API if available
    const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (googleMapsApiKey) {
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleMapsApiKey}`;
      
      const response = await fetch(geocodeUrl);
      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return NextResponse.json({
          success: true,
          lat: location.lat,
          lng: location.lng,
          formatted_address: data.results[0].formatted_address,
        });
      } else {
        return NextResponse.json(
          { error: 'Address not found', details: data.status },
          { status: 404 }
        );
      }
    }

    // Fallback: Use OpenStreetMap Nominatim (free, no API key required)
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'sayso-app/1.0', // Required by Nominatim
      },
    });

    const data = await response.json();

    if (data && data.length > 0) {
      return NextResponse.json({
        success: true,
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        formatted_address: data[0].display_name,
      });
    } else {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      );
    }
  } catch (error: any) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: 'Failed to geocode address', details: error.message },
      { status: 500 }
    );
  }
}

