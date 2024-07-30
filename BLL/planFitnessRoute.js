

const fs = require('fs');
const axios = require('axios');
const turf = require('@turf/turf');

const { addTemporaryNode, removeTemporaryNodes } = require('./services/temporary_nodes.js');

const nodeMap = JSON.parse(fs.readFileSync('./BLL/data/nodeMap_API.json', 'utf8'));

const LEVELS = {
  EASY: { maxSlope: 0.03 },
  MEDIUM: { maxSlope: 0.06 },
  HARD: { maxSlope: 0.1 }
};

async function planFitnessRoute(start, maxSlope, t) {
  let closestPath = null;
  let closestTimeDiff = Infinity;

  const tempNodes = [];

  // הוספת נקודת התחלה זמנית אם לא קיימת
  if (!nodeMap[start]) {
    const tempNode = await addTemporaryNode(start, nodeMap);
    if (tempNode) tempNodes.push(tempNode);
  }

  function dfs(node, currentTime, visited, path) {
    if (node === start && path.length > 1 && currentTime <= t) {
      const timeDiff = Math.abs(t - currentTime);
      if (timeDiff < closestTimeDiff) {
        closestTimeDiff = timeDiff;
        closestPath = path.slice();
      }
    }

    visited.add(node);
    path.push(node);

    for (let edge of nodeMap[node].edges) {
      const { id: nextNode, slope, duration: time } = edge;
      if (Math.abs(slope) <= maxSlope && currentTime + time <= t && !visited.has(nextNode)) {
        dfs(nextNode, currentTime + time, visited, path);
      } else if (nextNode === start && Math.abs(slope) <= maxSlope && currentTime + time <= t) {
        const timeDiff = Math.abs(t - (currentTime + time));
        if (timeDiff < closestTimeDiff) {
          closestTimeDiff = timeDiff;
          closestPath = [...path, start];
        }
      }
    }

    visited.delete(node);
    path.pop();
  }

  dfs(start, 0, new Set(), []);

  // הסרת הצמתים הזמניים
  removeTemporaryNodes(nodeMap, tempNodes);

  if (closestPath) {
    fs.writeFileSync('route_fitness.json', JSON.stringify(closestPath));
  }

  return closestPath ? closestPath : null;
}

module.exports = { planFitnessRoute };