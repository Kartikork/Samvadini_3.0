import React from 'react';
import { Dimensions } from 'react-native';
// import Sound from 'react-native-sound';
import { Item, SlicedItem } from './renderers'; // Import both renderers

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const GRAVITY = 0.6;
// const SLICE_SOUND = new Sound(require('../audio/slice.mp3'));

const lineCircleIntersection = (p1, p2, circleCenter, radius) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    if (dx === 0 && dy === 0) {
        const distSq = (p1.x - circleCenter[0]) ** 2 + (p1.y - circleCenter[1]) ** 2;
        return distSq <= radius ** 2;
    }

    const t = ((circleCenter[0] - p1.x) * dx + (circleCenter[1] - p1.y) * dy) / (dx * dx + dy * dy);
    const clampedT = Math.max(0, Math.min(1, t));

    const closestX = p1.x + clampedT * dx;
    const closestY = p1.y + clampedT * dy;

    const distSq = (closestX - circleCenter[0]) ** 2 + (closestY - circleCenter[1]) ** 2;
    return distSq <= radius ** 2;
};

export const SpawnSystem = (entities, { time }) => {
    const spawnRate = 1200;
    if (!entities.lastSpawn || time.current - entities.lastSpawn > spawnRate) {
        const id = `item_${time.current}`;
        const itemType = Math.random() < 0.15 ? 'bomb' : (Math.random() < 0.5 ? 'fruit1' : 'fruit2');
        const size = itemType === 'bomb' ? [70, 70] : [90, 90];
        entities[id] = {
            type: itemType, size, renderer: <Item />,
            position: [Math.random() * (screenWidth - size[0]) + size[0] / 2, screenHeight + 50],
            velocity: [(Math.random() - 0.5) * 6, -(18 + Math.random() * 8)],
            sliced: false,
        };
        entities.lastSpawn = time.current;
    }
    return entities;
};

// --- MODIFIED SliceSystem ---
export const SliceSystem = (entities, { touches, events, dispatch, time }) => {
    const { slice } = entities;

    // Process both standard touches and manual dispatch events
    const moveInputs = [
        ...touches.filter(t => t.type === 'move').map(t => ({ x: t.event.pageX, y: t.event.pageY })),
        ...(events || []).filter(e => e.type === 'move').map(e => ({ x: e.event.x, y: e.event.y }))
    ];

    const startInputs = [
        ...touches.filter(t => t.type === 'start').map(t => ({ x: t.event.pageX, y: t.event.pageY })),
        ...(events || []).filter(e => e.type === 'start').map(e => ({ x: e.event.x, y: e.event.y }))
    ];

    const endInputs = [
        ...touches.filter(t => t.type === 'end'),
        ...(events || []).filter(e => e.type === 'end')
    ];

    if (startInputs.length > 0) {
        slice.lastPoint = startInputs[0];
    }

    if (moveInputs.length > 0) {
        moveInputs.forEach(newPoint => {
            if (slice.lastPoint) {
                const segment = [slice.lastPoint, newPoint];
                for (const key in entities) {
                    if (key.startsWith('item_') && !entities[key].sliced) {
                        const item = entities[key];
                        const radius = (Math.max(item.size[0], item.size[1]) / 2) * 1.2;

                        if (lineCircleIntersection(segment[0], segment[1], item.position, radius)) {
                            item.sliced = true;
                            if (item.type === 'bomb') {
                                dispatch({ type: 'lose-life' });
                            } else {
                                dispatch({ type: 'score-point' });

                                // --- CREATE THE TWO HALVES ---
                                const half1Id = `half1_${time.current}_${key}`;
                                const half2Id = `half2_${time.current}_${key}`;

                                entities[half1Id] = {
                                    type: `${item.type}-half1`,
                                    size: item.size,
                                    position: [...item.position],
                                    velocity: [-4, -8],
                                    rotation: 0,
                                    rotationSpeed: (Math.random() - 0.5) * 15,
                                    renderer: <SlicedItem />
                                };

                                entities[half2Id] = {
                                    type: `${item.type}-half2`,
                                    size: item.size,
                                    position: [...item.position],
                                    velocity: [4, -8],
                                    rotation: 0,
                                    rotationSpeed: (Math.random() - 0.5) * 15,
                                    renderer: <SlicedItem />
                                };
                            }
                            delete entities[key];
                        }
                    }
                }
            }
            slice.lastPoint = newPoint;
            slice.points.push(newPoint);
            if (slice.points.length > 15) { slice.points.shift(); }
        });
    }

    if (endInputs.length > 0) {
        slice.lastPoint = null;
        slice.points = [];
    }
    return entities;
};

// --- MODIFIED MoveSystem ---
export const MoveSystem = (entities) => {
    for (const key in entities) {
        // This condition now handles both whole items and sliced halves
        if (key.startsWith('item_') || key.startsWith('half')) {
            const item = entities[key];
            const { position, velocity } = item;
            velocity[1] += GRAVITY;
            position[0] += velocity[0];
            position[1] += velocity[1];

            // Apply rotation to halves
            if (item.rotationSpeed) {
                item.rotation += item.rotationSpeed;
            }

            // Bounce whole items off walls
            if (key.startsWith('item_')) {
                const itemRadius = item.size[0] / 2;
                if (position[0] - itemRadius < 0 && velocity[0] < 0) { velocity[0] *= -1; }
                if (position[0] + itemRadius > screenWidth && velocity[0] > 0) { velocity[0] *= -1; }
            }
        }
    }
    return entities;
};

// --- MODIFIED CleanupSystem ---
export const CleanupSystem = (entities, { dispatch }) => {
    for (const key in entities) {
        // This condition now cleans up both whole items and sliced halves
        if ((key.startsWith('item_') || key.startsWith('half')) && entities[key].position[1] > screenHeight + 50) {
            // Only lose a life for unsliced, whole fruits
            if (key.startsWith('item_') && !entities[key].sliced && entities[key].type !== 'bomb') {
                dispatch({ type: 'lose-life' });
            }
            delete entities[key];
        }
    }
    return entities;
};