import { playHitSound } from './utils.js';

const scoreZones = [
    { radius: 24, points: 100 },
    { radius: 48, points: 50 },
    { radius: 96, points: 25 },
    { radius: 144, points: 10 },
    { radius: 240, points: 5 },
];

const gameState = {
    score: 0,
    dartsThrown: 0,
    totalDistance: 0,
    targetImage: null,
    darts: [],
    isAnimating: false,
    hoveredZone: null,
    highScore: localStorage.getItem('highScore') || 0,
    currentWeapon: 'dart',
    weapons: {
        dart: { emoji: '🎯', size: 24 },
        chainsaw: { emoji: '🪚', size: 24 },
        pistol: { emoji: '🔫', size: 20 },
        laser: { emoji: '💥', size: 30 },
    }
};

function calculateScore(x, y, canvas) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));

    let currentScore = 0;
    for (const zone of scoreZones) {
        if (distance <= zone.radius) {
            currentScore = zone.points;
            break;
        }
    }

    gameState.score += currentScore;
    gameState.totalDistance += distance;
    return currentScore;
}

function updateStats(lastScore) {
    gameState.dartsThrown++;

    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('highScore', gameState.highScore);
    }
    return {
        score: gameState.score,
        dartsThrown: gameState.dartsThrown,
        avgPrecision: (gameState.totalDistance / gameState.dartsThrown).toFixed(2),
        highScore: gameState.highScore,
        lastScore: lastScore,
    };
}

function resetGame() {
    gameState.score = 0;
    gameState.dartsThrown = 0;
    gameState.totalDistance = 0;
    gameState.darts = [];
}

function changeWeapon(weapon) {
    if (gameState.weapons[weapon]) {
        gameState.currentWeapon = weapon;
    }
}

function handleCanvasClick(x, y, canvas, ui) {
    if (!gameState.targetImage || gameState.isAnimating) {
        return;
    }

    gameState.isAnimating = true;
    const duration = 500; // ms
    const start = { x: canvas.width / 2, y: canvas.height + 50, size: 100 };
    const end = { x, y, size: gameState.weapons[gameState.currentWeapon].size };

    let startTime = null;

    function animationStep(timestamp) {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);

        const currentX = start.x + (end.x - start.x) * easeOutQuart;
        const currentY = start.y + (end.y - start.y) * easeOutQuart;
        const currentSize = start.size + (end.size - start.size) * easeOutQuart;

        ui.redrawCanvas();
        ui.drawProjectile(currentX, currentY, currentSize, gameState.currentWeapon);

        if (progress < 1) {
            requestAnimationFrame(animationStep);
        } else {
            gameState.darts.push({ x: x, y: y, weapon: gameState.currentWeapon });
            playHitSound();
            const lastScore = calculateScore(x, y, canvas);
            const stats = updateStats(lastScore);
            ui.updateScores(stats);
            gameState.isAnimating = false;
            ui.redrawCanvas();
        }
    }

    requestAnimationFrame(animationStep);
}

function handleMouseMove(x, y, canvas, ui) {
    if (!gameState.targetImage || gameState.isAnimating) return;

    const distance = Math.sqrt(Math.pow(x - canvas.width / 2, 2) + Math.pow(y - canvas.height / 2, 2));

    let currentHoveredZone = null;
    for (const zone of scoreZones) {
        if (distance <= zone.radius) {
            currentHoveredZone = zone;
            break;
        }
    }

    if (gameState.hoveredZone !== currentHoveredZone) {
        gameState.hoveredZone = currentHoveredZone;
        ui.redrawCanvas();
    }
}

function handleMouseLeave(ui) {
    if (gameState.hoveredZone) {
        gameState.hoveredZone = null;
        ui.redrawCanvas();
    }
}

export { gameState, scoreZones, calculateScore, updateStats, resetGame, changeWeapon, handleCanvasClick, handleMouseMove, handleMouseLeave };