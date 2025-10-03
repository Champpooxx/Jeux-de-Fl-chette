class ErrorHandler {
    constructor(errorElement) {
        this.errorElement = errorElement;
    }

    showError(message) {
        this.errorElement.textContent = message;
        this.errorElement.style.display = 'block';
        setTimeout(() => {
            this.hideError();
        }, 3000);
    }

    hideError() {
        this.errorElement.style.display = 'none';
    }
}

let audioContext;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playHitSound() {
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.2);
    oscillator.stop(audioContext.currentTime + 0.2);
}


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


class UI {
    constructor(domElements, canvasContext) {
        this.dom = domElements;
        this.ctx = canvasContext;
        this.canvas = this.ctx.canvas;
        this.updateScores({
            score: 0,
            dartsThrown: 0,
            avgPrecision: '0.00',
            highScore: gameState.highScore,
            lastScore: 0,
        });
        this.redrawCanvas();
    }

    updateScores(stats) {
        this.dom.scoreEl.textContent = stats.score;
        this.dom.lastScoreEl.textContent = stats.lastScore;
        this.dom.dartsThrownEl.textContent = stats.dartsThrown;
        this.dom.avgPrecisionEl.textContent = stats.avgPrecision;
        this.dom.highScoreEl.textContent = stats.highScore;
    }

    redrawCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (gameState.targetImage) {
            this.ctx.drawImage(gameState.targetImage, 0, 0, this.canvas.width, this.canvas.height);
            this.drawScoreZones();
        } else {
            this.drawWelcomeMessage();
        }
        gameState.darts.forEach(d => this.drawProjectile(d.x, d.y, gameState.weapons[d.weapon].size, d.weapon));
    }

    drawWelcomeMessage() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';
        this.ctx.font = '20px Arial';
        this.ctx.fillText("Chargez une image pour commencer !", this.canvas.width / 2, this.canvas.height / 2);
    }

    drawScoreZones() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        scoreZones.forEach(zone => {
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, zone.radius, 0, Math.PI * 2);
            if (gameState.hoveredZone === zone) {
                this.ctx.strokeStyle = 'rgba(255, 223, 0, 1)';
                this.ctx.lineWidth = 3;
            } else {
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                this.ctx.lineWidth = 2;
            }
            this.ctx.stroke();
        });
    }

    drawProjectile(x, y, size, weapon) {
        const emoji = gameState.weapons[weapon].emoji;
        this.ctx.font = `${size}px serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(emoji, x, y);
    }

    setActiveButton(weapon) {
        this.dom.weaponButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.weapon === weapon) {
                btn.classList.add('active');
            }
        });
    }

    handleImageUpload(event, errorHandler, onImageLoad) {
        const file = event.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                errorHandler.showError('Veuillez sélectionner un fichier image.');
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    const aspectRatio = img.width / img.height;
                    let newWidth = MAX_WIDTH;
                    let newHeight = MAX_HEIGHT;

                    if (img.width > img.height) {
                        newHeight = MAX_WIDTH / aspectRatio;
                    } else {
                        newWidth = MAX_HEIGHT * aspectRatio;
                    }

                    this.canvas.width = newWidth;
                    this.canvas.height = newHeight;
                    onImageLoad(img);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }
}


document.addEventListener('DOMContentLoaded', () => {
    const domElements = {
        canvas: document.getElementById('dartboard'),
        uploader: document.getElementById('uploader'),
        resetButton: document.getElementById('reset-button'),
        changeImageButton: document.getElementById('change-image-button'),
        weaponButtons: document.querySelectorAll('.weapon-button'),
        scoreEl: document.getElementById('score'),
        lastScoreEl: document.getElementById('last-score'),
        dartsThrownEl: document.getElementById('darts-thrown'),
        avgPrecisionEl: document.getElementById('avg-precision'),
        highScoreEl: document.getElementById('high-score'),
        errorContainer: document.getElementById('error-container')
    };

    const ctx = domElements.canvas.getContext('2d');
    const ui = new UI(domElements, ctx);
    const errorHandler = new ErrorHandler(domElements.errorContainer);

    function onImageLoad(img) {
        gameState.targetImage = img;
        resetGame();
        ui.redrawCanvas();
        ui.updateScores({
            score: 0,
            dartsThrown: 0,
            avgPrecision: '0.00',
            highScore: gameState.highScore,
            lastScore: 0,
        });
    }

    domElements.uploader.addEventListener('change', (e) => ui.handleImageUpload(e, errorHandler, onImageLoad));
    domElements.changeImageButton.addEventListener('click', () => domElements.uploader.click());

    domElements.canvas.addEventListener('click', (event) => {
        initAudio();
        const rect = domElements.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        handleCanvasClick(x, y, domElements.canvas, ui);
    });

    domElements.canvas.addEventListener('mousemove', (event) => {
        const rect = domElements.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        handleMouseMove(x, y, domElements.canvas, ui);
    });

    domElements.canvas.addEventListener('mouseleave', () => handleMouseLeave(ui));

    domElements.resetButton.addEventListener('click', () => {
        resetGame();
        ui.redrawCanvas();
        ui.updateScores({
            score: 0,
            dartsThrown: 0,
            avgPrecision: '0.00',
            highScore: gameState.highScore,
            lastScore: 0,
        });
    });

    domElements.weaponButtons.forEach(button => {
        button.addEventListener('click', () => {
            const weapon = button.dataset.weapon;
            changeWeapon(weapon);
            ui.setActiveButton(weapon);
        });
    });
});
