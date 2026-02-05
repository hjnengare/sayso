/**
 * Maps OSM/category label (e.g. "Restaurant", "Bank") to our canonical subcategory slug.
 * Used by seed and update-images for primary_subcategory_slug.
 */
export function getSubcategorySlugForOsmCategory(
  category: string,
  businessName?: string
): string {
  const normalizedCategory = category.trim();

  if (businessName) {
    const nameLower = businessName.toLowerCase();
    if (
      nameLower.includes('cell') ||
      nameLower.includes('mobile') ||
      nameLower.includes('vodacom') ||
      nameLower.includes('mtn') ||
      nameLower.includes('telkom') ||
      nameLower.includes('telecom') ||
      nameLower.includes('phone') ||
      nameLower.includes('cellular')
    ) {
      return 'electronics';
    }
    if (
      nameLower.includes('restaurant') ||
      nameLower.includes('cafe') ||
      nameLower.includes('bistro') ||
      nameLower.includes('diner') ||
      nameLower.includes('pizza') ||
      nameLower.includes('burger') ||
      nameLower.includes('food') ||
      nameLower.includes('kitchen')
    ) {
      return 'restaurants';
    }
    if (
      nameLower.includes('boutique') ||
      nameLower.includes('fashion') ||
      nameLower.includes('clothing') ||
      nameLower.includes('apparel')
    ) {
      return 'fashion';
    }
    if (
      nameLower.includes('gym') ||
      nameLower.includes('fitness') ||
      nameLower.includes('health') ||
      nameLower.includes('wellness')
    ) {
      return 'gyms';
    }
  }

  const categoryMap: Record<string, string> = {
    Restaurant: 'restaurants',
    'Fast Food': 'fast-food',
    'Coffee Shop': 'cafes',
    Bar: 'bars',
    Bakery: 'restaurants',
    'Ice Cream': 'fast-food',
    Supermarket: 'fast-food',
    Grocery: 'fast-food',
    Salon: 'salons',
    Wellness: 'wellness',
    Fitness: 'gyms',
    Spa: 'spas',
    Bank: 'finance-insurance',
    ATM: 'finance-insurance',
    Pharmacy: 'finance-insurance',
    Dental: 'education-learning',
    Veterinary: 'veterinarians',
    Clinic: 'education-learning',
    Hospital: 'education-learning',
    Museum: 'museums',
    'Art Gallery': 'galleries',
    Theater: 'theaters',
    Cinema: 'theaters',
    'Music Venue': 'concerts',
    Nightclub: 'nightlife',
    Bookstore: 'books',
    Clothing: 'fashion',
    Jewelry: 'fashion',
    Florist: 'home-decor',
    Electronics: 'electronics',
    Park: 'hiking',
    Zoo: 'family-activities',
    Aquarium: 'family-activities',
    Attraction: 'events-festivals',
    'Gas Station': 'transport-travel',
    Parking: 'transport-travel',
    Hotel: 'transport-travel',
    Hostel: 'transport-travel',
    Business: 'electronics',
  };

  if (categoryMap[normalizedCategory]) {
    return categoryMap[normalizedCategory];
  }
  const lowerCategory = normalizedCategory.toLowerCase();
  const matchingKey = Object.keys(categoryMap).find(
    (key) => key.toLowerCase() === lowerCategory
  );
  if (matchingKey) {
    return categoryMap[matchingKey];
  }
  return 'electronics';
}
