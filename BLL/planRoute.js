
const fs = require('fs');
const { planOptimalRouteWithStops } = require('./planOptimalRouteWithStops.js');
const { planFitnessRoute } = require('./planFitnessRoute.js');

async function planRoute(start, end, stops, t, fitnessLevel, purpose) {
    let result;

    if (purpose === 'traveling') {
        result = await planOptimalRouteWithStops(start, end, stops);
    } else if (purpose === 'sports') {
        const maxSlope = {
            EASY: 0.03,
            MEDIUM: 0.06,
            HARD: 0.1
        }[fitnessLevel];

        result = await planFitnessRoute(start, maxSlope, t);
    }
    return result;
}





const start = "32.048183936573544, 34.95423867526422";
const end = "32.0557044001091, 34.96314498291853";
const stops = ["32.050460740370006, 34.95366863781907"];
const t = 300; 
const fitnessLevel = 'HARD'; 
const purpose = 'traveling';  // sports - traveling

(async () => {
    await planRoute(start, end, stops, t, fitnessLevel, purpose);
})();

module.exports = { planRoute };