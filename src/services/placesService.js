import axios from 'axios';
import { GOOGLE_MAPS_API_KEY } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MOCK_PLACES_FALLBACK = [
    {
        id: 'mock-1',
        name: 'The Blue Tokai Coffee Roasters',
        type: 'Cafe',
        geometry: { location: { lat: 28.5355, lng: 77.3910 } },
        isOpen: true,
        rating: 4.6,
        photoUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&q=60'
    },
    {
        id: 'mock-2',
        name: 'Starbucks Coffee',
        type: 'Cafe',
        geometry: { location: { lat: 28.5356, lng: 77.3911 } },
        isOpen: true,
        rating: 4.4,
        photoUrl: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=400&q=60'
    },
    {
        id: 'mock-3',
        name: 'Haldiram\'s Restaurant',
        type: 'Restaurant',
        geometry: { location: { lat: 28.5358, lng: 77.3915 } },
        isOpen: true,
        rating: 4.2,
        photoUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=60'
    },
    {
        id: 'mock-4',
        name: 'DLF Mall of India',
        type: 'Shopping mall',
        geometry: { location: { lat: 28.5360, lng: 77.3920 } },
        isOpen: true,
        rating: 4.7,
        photoUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=400&q=60'
    },
    {
        id: 'mock-5',
        name: 'Chaayos - Meri Wali Chai',
        type: 'Cafe',
        geometry: { location: { lat: 28.5354, lng: 77.3908 } },
        isOpen: true,
        rating: 4.5,
        photoUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&q=60'
    }
];

// Using Google Places API (New) v1
const PLACES_API_URL = 'https://places.googleapis.com/v1/places:searchNearby';

const CACHE_KEY = '@places_amenities_cache';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 1 day in milliseconds

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
};

const fetchCategory = async (latitude, longitude, types, categoryLabel, limit = 5, radius = 2000) => {
    if (!GOOGLE_MAPS_API_KEY) {
        console.warn(`PlacesService Error: GOOGLE_MAPS_API_KEY is missing for category ${categoryLabel}.`);
        return [];
    }

    // Ensure latitude and longitude are valid numbers
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
        console.error(`PlacesService Error: Invalid coordinates for ${categoryLabel} -> lat: ${latitude}, lng: ${longitude}`);
        return [];
    }

    const requestBody = {
        includedTypes: types,
        maxResultCount: limit,
        locationRestriction: {
            circle: {
                center: {
                    latitude: lat,
                    longitude: lng
                },
                radius: radius
            }
        }
    };

    console.log(`PlacesService: Requesting ${categoryLabel} nearby (${lat}, ${lng}) with types:`, types);

    try {
        const response = await axios.post(
            PLACES_API_URL,
            requestBody,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
                    'X-Goog-FieldMask': 'places.displayName,places.id,places.location,places.businessStatus,places.rating,places.types,places.photos',
                    // Using Android package headers to bypass restrictions if API key is Android-restricted.
                    // NOTE: If the API key is strictly restricted and this SHA-1 does not match your release
                    // or current debug Keystore, the request WILL FAIL with a 403 Forbidden.
                    'X-Android-Package': 'com.bentork.application',
                    'X-Android-Cert': '5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25', // Standard Debug SHA1
                }
            }
        );

        const fetchedCount = response.data?.places?.length || 0;
        console.log(`PlacesService: Successfully fetched ${fetchedCount} ${categoryLabel}s.`);

        if (response.data && response.data.places) {
            return response.data.places.map((place) => {
                let photoUrl = null;
                if (place.photos && place.photos.length > 0) {
                    const photoName = place.photos[0].name;
                    photoUrl = `https://places.googleapis.com/v1/${photoName}/media?key=${GOOGLE_MAPS_API_KEY}&maxWidthPx=400`;
                }

                return {
                    id: place.id,
                    name: place.displayName?.text || 'Unknown Place',
                    rating: place.rating || 0,
                    geometry: {
                        location: {
                            lat: place.location?.latitude,
                            lng: place.location?.longitude,
                        }
                    },
                    type: categoryLabel,
                    isOpen: place.businessStatus === 'OPERATIONAL',
                    photoUrl: photoUrl
                };
            });
        }
        return [];
    } catch (error) {
        // Detailed error logging for debugging API issues
        if (error.response) {
            console.error(`PlacesService API Error (${categoryLabel}):`, {
                status: error.response.status,
                data: error.response.data,
                headers: error.response.headers,
                requestBody: requestBody // Log the request payload to see if it was malformed
            });
        } else if (error.request) {
            console.error(`PlacesService Network Error (${categoryLabel}): No response received.`, error.message);
        } else {
            console.error(`PlacesService Request Setup Error (${categoryLabel}):`, error.message);
        }
        return [];
    }
};

const placesService = {
    fetchNearbyAmenities: async (latitude, longitude) => {
        try {
            if (!GOOGLE_MAPS_API_KEY) {
                console.warn('PlacesService: Google Maps API Key is missing. Returning fallback mock amenities.');
                return MOCK_PLACES_FALLBACK;
            }

            // --- 1. Check Local Cache (Time + Distance Validation) ---
            try {
                const cachedDataStr = await AsyncStorage.getItem(CACHE_KEY);
                if (cachedDataStr) {
                    const cachedData = JSON.parse(cachedDataStr);
                    const now = Date.now();

                    // Check Expired (1 day)
                    if (now - cachedData.timestamp < CACHE_EXPIRY_MS) {
                        // Check Geo-Proximity (within 2 km of cached origin)
                        const distance = calculateDistance(latitude, longitude, cachedData.latitude, cachedData.longitude);
                        if (distance <= 2) {
                            console.log(`PlacesService: Using CACHED amenities. Distance from cached origin: ${distance.toFixed(2)}km`);
                            return cachedData.amenities;
                        } else {
                            console.log(`PlacesService: Cache found but user moved ${distance.toFixed(2)}km away. Invalidating...`);
                        }
                    } else {
                        console.log('PlacesService: Cache expired (> 1 day). Invalidating...');
                    }
                }
            } catch (cacheReadError) {
                console.warn('PlacesService Error reading cache:', cacheReadError.message);
            }

            // --- 2. Fetch Fresh Data ---
            console.log(`PlacesService: Initiating parallel fetch for amenities (New API) near ${latitude}, ${longitude}`);

            // Parallel requests for 5 of each category
            const [cafes, restaurants, malls] = await Promise.all([
                fetchCategory(latitude, longitude, ['cafe', 'coffee_shop'], 'Cafe'),
                fetchCategory(latitude, longitude, ['restaurant'], 'Restaurant'),
                fetchCategory(latitude, longitude, ['shopping_mall'], 'Shopping mall'),
            ]);

            const allAmenities = [...cafes, ...restaurants, ...malls];

            // Deduplicate by place ID
            const uniqueAmenities = Array.from(new Map(allAmenities.map(item => [item.id, item])).values());

            console.log(`PlacesService: Total amenities fetched: ${allAmenities.length}, Unique: ${uniqueAmenities.length}`);

            // --- 3. Save to Cache ---
            try {
                const cacheObject = {
                    timestamp: Date.now(),
                    latitude: latitude,
                    longitude: longitude,
                    amenities: uniqueAmenities
                };
                await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheObject));
                console.log('PlacesService: Saved new amenities to device cache.');
            } catch (cacheWriteError) {
                console.warn('PlacesService Error writing to cache:', cacheWriteError.message);
            }

            return uniqueAmenities;

        } catch (error) {
            console.error('PlacesService Global Error during fetchNearbyAmenities:', error.message);
            return MOCK_PLACES_FALLBACK;
        }
    },
};

export default placesService;
