async function geocodeAddress(address) {
    const apiKey = 'AIzaSyDYircLat1lZ745yEtD9rVCDtc5JwpV9BU';
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    
    try {
        const response = await axios.get(url);
        if (response.data.status === 'OK') {
            const location = response.data.results[0].geometry.location;
            const coordString = `${location.lat},${location.lng}`;
            return coordString;
        } else {
            throw new Error(`Geocoding error: ${response.data.status}`);
        }
    } catch (error) {
        throw error;
    }
}