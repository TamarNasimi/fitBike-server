const axios = require('axios');

const API_KEY = 'AIzaSyDYircLat1lZ745yEtD9rVCDtc5JwpV9BU'; // החלף במפתח ה-API שלך

async function getCityName(latitude, longitude) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${API_KEY}&language=he`;

    try {
        const response = await axios.get(url);
        const results = response.data.results;

        if (results.length > 0) {
            const addressComponents = results[0].address_components;
            for (let component of addressComponents) {
                if (component.types.includes('locality')) {
                    return component.long_name;
                }
            }
            return 'City not found';
        } else {
            return 'No results found';
        }
    } catch (error) {
        console.error(error);
        return 'Error occurred';
    }
}


    module.exports = {
        getCityName
    };
    

