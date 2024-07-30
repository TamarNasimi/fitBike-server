const fs = require('fs');
const axios = require('axios');
const PriorityQueue = require('js-priority-queue');
const turf = require('@turf/turf');

const { addTemporaryNode, removeTemporaryNodes } = require('./services/temporary_nodes.js');

const nodesMap = JSON.parse(fs.readFileSync('./BLL/data/nodeMap_API.json', 'utf8'));

function dijkstra(start, end, nodesMap) {
    const distances = {};
    const previous = {};
    const queue = new PriorityQueue({ comparator: (a, b) => a.priority - b.priority });

    Object.keys(nodesMap).forEach(node => {
        distances[node] = Infinity;
        previous[node] = null;
    });

    distances[start] = 0;
    queue.queue({ node: start, priority: 0 });

    while (queue.length > 0) {
        const { node: current } = queue.dequeue();

        if (current === end) break;

        const edges = nodesMap[current].edges;
        for (const edge of edges) {
            const { id: neighbor, weightTravel: weight } = edge;
            const alt = distances[current] + weight;

            if (alt < distances[neighbor]) {
                distances[neighbor] = alt;
                previous[neighbor] = current;
                queue.queue({ node: neighbor, priority: alt });
            }
        }
    }

    const path = [];
    let u = end;
    while (previous[u]) {
        path.unshift(u);
        u = previous[u];
    }
    if (distances[end] !== Infinity) path.unshift(start);

    return { distance: distances[end], path };
}

async function planOptimalRouteWithStops(start, end, stops) {
    const tempNodes = [];

    // הוספת נקודות זמניות
    if (!nodesMap[start]) {
        const tempNode = await addTemporaryNode(start, nodesMap);
        if (tempNode) tempNodes.push(tempNode);
    }

    if (!nodesMap[end]) {
        const tempNode = await addTemporaryNode(end, nodesMap);
        if (tempNode) tempNodes.push(tempNode);
    }

    for (const stop of stops) {
        if (!nodesMap[stop]) {
            const tempNode = await addTemporaryNode(stop, nodesMap);
            if (tempNode) tempNodes.push(tempNode);
        }
    }

    let totalDistance = 0;
    let fullPath = [];

    let currentStart = start;
    for (const stop of stops) {
        const { distance, path } = dijkstra(currentStart, stop, nodesMap);
        if (path.length === 0) {
            console.log(`No path found from ${currentStart} to ${stop}`);
            return null;
        }
        totalDistance += distance;
        fullPath = fullPath.concat(path.slice(0, -1));
        currentStart = stop;
    }

    const { distance, path } = dijkstra(currentStart, end, nodesMap);
    if (path.length === 0) {
        console.log(`No path found from ${currentStart} to ${end}`);
        return null;
    }
    totalDistance += distance;
    fullPath = fullPath.concat(path);

    // הסרת הצמתים הזמניים
    removeTemporaryNodes(nodesMap, tempNodes);


    // שמירת המסלול והנקודות עצירה לקובץ JSON
    fs.writeFileSync('route_stops.json', JSON.stringify({ start: start, end: end, stops:  stops, path: fullPath }));
    return { path: fullPath };
}

module.exports = { planOptimalRouteWithStops };
