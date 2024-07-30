const fs = require('fs');
const axios = require('axios');
const turf = require('@turf/turf');

const nodesMap = {};


const API_KEY = 'API_KEY';

// מהירות ממוצעת של רכיבה באופניים (במטרים לשעה)
const AVERAGE_CYCLING_SPEED = 15000; // 15 קמ"ש = 15000 מטר לשעה

async function fetchWaysFromOverpass(cityName) {
    const overpassQuery = `
    [out:json][timeout:25];
    area[name="${cityName}"]->.ny;
    (
      way(area.ny)["highway"~"^(trunk|primary|secondary|tertiary|unclassified|residential)$"];
      way(area.ny)["highway"~"^(cycleway|path|track)$"];
    );
    out body geom;
    `;
    
    try {
        const response = await axios.post('https://overpass-api.de/api/interpreter', overpassQuery, {
            headers: { 'Content-Type': 'text/plain' }
        });

        const roads = response.data.elements
            .filter(element => element.type === 'way')
            .map(element => {
                const coords = element.geometry.map(node => [node.lon, node.lat]);
                const line = turf.lineString(coords);
                const length = turf.length(line, { units: 'meters' });

                const startCoord = coords[0];
                const endCoord = coords[coords.length - 1];

                return {
                    id: element.id,
                    name: element.tags && element.tags.name ? element.tags.name : 'unknown',
                    length: length,
                    startCoordinates: startCoord,
                    endCoordinates: endCoord,
                    coords: coords
                };
            });

        return roads;
    } catch (error) {
        console.error('Error fetching data from Overpass API:', error.message);
        return null;
    }
}

async function getElevation(start, end) {
    try {
        const elevationUrl = `https://maps.googleapis.com/maps/api/elevation/json?locations=${start.lat},${start.lng}|${end.lat},${end.lng}&key=${API_KEY}`;
        const elevationResponse = await axios.get(elevationUrl);

        if (elevationResponse.data.status === 'OK' && elevationResponse.data.results.length > 1) {
            const elevations = elevationResponse.data.results;
            const elevationStart = elevations[0].elevation;
            const elevationEnd = elevations[1].elevation;
            return elevationEnd - elevationStart;
        } else {
            console.error('Error fetching elevation data:', elevationResponse.data.status);
            return null;
        }
    } catch (error) {
        console.error('Error fetching elevation data from Google API:', error.message);
        return null;
    }
}

function calculateEdgeWeightTravel(edgeData) {
    const alpha = 1;
    const beta = 2;
    const gamma = 0.5;
    const delta = 0.5;
    return alpha * edgeData.distance + beta * edgeData.duration + gamma * edgeData.slope + delta * edgeData.complex_transition;
}

async function getRoadDataFromOSM(start, end) {
    const startPoint = turf.point([start.lng, start.lat]);
    const endPoint = turf.point([end.lng, end.lat]);
    const distance = turf.distance(startPoint, endPoint, { units: 'meters' });

    const elevation = await getElevation(start, end);
    let slope = 0;
    if (elevation !== null) {
        slope = elevation / distance;
    }

    const duration = distance / AVERAGE_CYCLING_SPEED;
    const complex_transition = slope;
    const edgeData = {
        distance: distance,
        duration: duration * 3600, // convert to seconds
        slope: slope,
        complex_transition: complex_transition
    };
    const weightTravel = calculateEdgeWeightTravel(edgeData);
    return {
        ...edgeData,
        weightTravel
    };
}

async function buildGraph(cityName) {
    const roads = await fetchWaysFromOverpass(cityName);
    if (!roads) return;

    roads.forEach(way => {
        way.coords.forEach((coord) => {
            const nodeId = `${coord[1]},${coord[0]}`;
            if (!nodesMap[nodeId]) {
                nodesMap[nodeId] = {
                    type: 'node',
                    id: nodeId,
                    lat: coord[1],
                    lng: coord[0],
                    edges: []
                };
            }
        });
    });


    for (const way of roads) {
        for (let i = 0; i < way.coords.length - 1; i++) {
            const sourceCoord = way.coords[i];
            const targetCoord = way.coords[i + 1];
            const source = `${sourceCoord[1]},${sourceCoord[0]}`;
            const target = `${targetCoord[1]},${targetCoord[0]}`;
            if (nodesMap[source] && nodesMap[target]) {
                if ((!nodesMap[source].edges.some(edge => edge.id === target)) || (!nodesMap[target].edges.some(edge => edge.id === source))) {
                    try {
                        const roadData = await getRoadDataFromOSM({ lat: sourceCoord[1], lng: sourceCoord[0] }, { lat: targetCoord[1], lng: targetCoord[0] });
                        if (roadData) {
                            const edgeData = {
                                distance: roadData.distance,
                                duration: roadData.duration,
                                slope: roadData.slope,
                                closed_street: false,
                                complex_transition: roadData.complex_transition,
                                weightTravel: roadData.weightTravel
                            };
                            if (!nodesMap[source].edges.some(edge => edge.id === target)) {
                                nodesMap[source].edges.push({
                                    id: target,
                                    lat: nodesMap[target].lat,
                                    lng: nodesMap[target].lng,
                                    ...edgeData
                                });
                            }
                            if (!nodesMap[target].edges.some(edge => edge.id === source)) {
                                nodesMap[target].edges.push({
                                    id: source,
                                    lat: nodesMap[source].lat,
                                    lng: nodesMap[source].lng,
                                    ...edgeData
                                });
                            }
                        }
                    } catch (error) {
                        console.error('Error fetching road data from OSM:', error.message);
                    }
                }
            }
        }
    }

    fs.writeFileSync('nodeMap_API.json', JSON.stringify(nodesMap, null, 2));
}

(async () => {
    const cityName = 'כרמיאל';
    await buildGraph(cityName);
})();

module.exports = {
    buildGraph,
    getRoadDataFromOSM
};
