
const turf = require('@turf/turf');
const { getRoadDataFromOSM } = require('../graph_osm.js');


async function addTemporaryNode(node, nodesMap) {
    
  
    const [lat, lng] = node.split(',').map(parseFloat);

    // מציאת הצומת הקרובה ביותר לנקודת המוצא
    let closestNode = null;
    let minDistance = Infinity;

    for (const id in nodesMap) {

        const [nodeLat, nodeLng] = id.split(',').map(parseFloat);
        const distance = turf.distance([lng, lat], [nodeLng, nodeLat], { units: 'meters' });
        if (distance < minDistance) {
            minDistance = distance;
            closestNode = id;
        }
    }

    if (closestNode) {
        const edges = nodesMap[closestNode].edges;
        let bestEdge = null;
        let minEdgeDistance = Infinity;

        for (const edge of edges) {
            const edgeStart = [nodesMap[closestNode].lng, nodesMap[closestNode].lat];
            const edgeEnd = [edge.lng, edge.lat];
            const line = turf.lineString([edgeStart, edgeEnd]);
            const point = turf.point([lng, lat]);
            const distanceToLine = turf.pointToLineDistance(point, line, { units: 'meters' });

            if (distanceToLine < minEdgeDistance) {
                minEdgeDistance = distanceToLine;
                bestEdge = edge;
            }
        }

        if (bestEdge) {
            // הוספת הצומת הזמנית
            nodesMap[node] = {
                type: 'node',
                id: node,
                lat: lat,
                lng: lng,
                edges: []
            };
            // הוספת הקשתות לצומת הזמני
            for (const edge of edges) {
                const roadData = {
                    distance: edge.distance,
                    duration: edge.duration,
                    slope: edge.slope,
                    closed_street: edge.closed_street,
                    complex_transition: edge.complex_transition,
                    WeightTravel: edge.WeightTravel
                };
                nodesMap[node].edges.push({ id: edge.id, ...roadData });
                nodesMap[edge.id].edges.push({ id: node, ...roadData });
            }

            const source = closestNode;
            const target = bestEdge.id;
            const [sourceLat, sourceLng] = source.split(',').map(parseFloat);
            const [targetLat, targetLng] = target.split(',').map(parseFloat);
            const roadData1 = await getRoadDataFromOSM({ lat: sourceLat, lng: sourceLng }, { lat: targetLat, lng: targetLng });

            nodesMap[node].edges.push({ id: source, ...roadData1 });
            nodesMap[node].edges.push({ id: target, ...roadData1 });

            nodesMap[source].edges.push({ id: node, ...roadData1 });
            nodesMap[target].edges.push({ id: node, ...roadData1 });

            return node;
        }
    }

    return null;
}
//מחיקת הצמתים הזמניים
function removeTemporaryNodes(nodeMap, tempNodes) {
    for (const tempNode of tempNodes) {
        if (nodeMap[tempNode]) {
            nodeMap[tempNode].edges.forEach(edge => {
                const adjacentNodeEdges = nodeMap[edge.id].edges;
                nodeMap[edge.id].edges = adjacentNodeEdges.filter(e => e.id !== tempNode);
            });
            delete nodeMap[tempNode];
        }
    }
}

module.exports = {
    addTemporaryNode,
    removeTemporaryNodes
};