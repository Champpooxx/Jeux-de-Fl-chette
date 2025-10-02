// ============================================================================
//  Jeu de Fléchettes - A simple dart game in HTML, CSS, and JavaScript
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------------------------------
    //  DOM Elements
    // ----------------------------------------------------------------------------

    const canvas = document.getElementById('dartboard');
    const ctx = canvas.getContext('2d');
    const uploader = document.getElementById('uploader');
    const resetButton = document.getElementById('reset-button');
    const changeImageButton = document.getElementById('change-image-button');
    const scoreEl = document.getElementById('score');
    const lastScoreEl = document.getElementById('last-score');
    const dartsThrownEl = document.getElementById('darts-thrown');
    const avgPrecisionEl = document.getElementById('avg-precision');
    const highScoreEl = document.getElementById('high-score');

    // ----------------------------------------------------------------------------
    //  Game State
    // ----------------------------------------------------------------------------

    let score = 0;
    let dartsThrown = 0;
    let totalDistance = 0;
    let targetImage = null;
    let darts = [];
    let isAnimating = false;
    let hoveredZone = null;
    let highScore = localStorage.getItem('highScore') || 0;
    let audioContext;

    // ----------------------------------------------------------------------------
    //  Configuration
    // ----------------------------------------------------------------------------

    const MAX_WIDTH = 500;
    const MAX_HEIGHT = 500;

    const scoreZones = [
        { radius: 15, points: 100 },
        { radius: 30, points: 50 },
        { radius: 60, points: 25 },
        { radius: 90, points: 10 },
        { radius: 150, points: 5 },
    ];

    // ----------------------------------------------------------------------------
    //  Initialization
    // ----------------------------------------------------------------------------

    highScoreEl.textContent = highScore;
    redrawCanvas();

    // ----------------------------------------------------------------------------
    //  Event Listeners
    // ----------------------------------------------------------------------------

    uploader.addEventListener('change', handleImageUpload);
    changeImageButton.addEventListener('click', () => uploader.click());
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    resetButton.addEventListener('click', resetGame);

    // ----------------------------------------------------------------------------
    //  Image Handling
    // ----------------------------------------------------------------------------

    /**
     * Handles the image upload process.
     * @param {Event} event - The file input change event.
     */
    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert('Veuillez sélectionner un fichier image.');
                return;
            }
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    const aspectRatio = img.width / img.height;
                    let newWidth = MAX_WIDTH;
                    let newHeight = MAX_HEIGHT;

                    if (img.width > img.height) {
                        newHeight = MAX_WIDTH / aspectRatio;
                    } else {
                        newWidth = MAX_HEIGHT * aspectRatio;
                    }

                    canvas.width = newWidth;
                    canvas.height = newHeight;
                    targetImage = img;
                    resetGame();
                }
                img.src = e.target.result;
            }
            reader.readAsDataURL(file);
        }
    }

    // ----------------------------------------------------------------------------
    //  Mouse and Click Handlers
    // ----------------------------------------------------------------------------

    /**
     * Handles mouse movement over the canvas to highlight scoring zones.
     * @param {MouseEvent} event - The mouse move event.
     */
    function handleMouseMove(event) {
        if (!targetImage || isAnimating) return;

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const distance = Math.sqrt(Math.pow(x - canvas.width / 2, 2) + Math.pow(y - canvas.height / 2, 2));

        let currentHoveredZone = null;
        for (const zone of scoreZones) {
            if (distance <= zone.radius) {
                currentHoveredZone = zone;
                break;
            }
        }

        if (hoveredZone !== currentHoveredZone) {
            hoveredZone = currentHoveredZone;
            redrawCanvas();
        }
    }

    /**
     * Handles the mouse leaving the canvas area.
     */
    function handleMouseLeave() {
        if (hoveredZone) {
            hoveredZone = null;
            redrawCanvas();
        }
    }

    /**
     * Handles clicks on the canvas to throw a dart.
     * @param {MouseEvent} event - The click event.
     */
    function handleCanvasClick(event) {
        if (!targetImage || isAnimating) {
            return;
        }
        initAudio();

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        animateDart({ x, y });
    }

    // ----------------------------------------------------------------------------
    //  Animation and Drawing
    // ----------------------------------------------------------------------------

    /**
     * Animates the dart throw.
     * @param {object} target - The x and y coordinates of the target.
     */
    function animateDart(target) {
        isAnimating = true;
        const duration = 500; // ms
        const start = { x: canvas.width / 2, y: canvas.height + 50, size: 100 };
        const end = { x: target.x, y: target.y, size: 24 };

        let startTime = null;

        function animationStep(timestamp) {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);

            const currentX = start.x + (end.x - start.x) * easeOutQuart;
            const currentY = start.y + (end.y - start.y) * easeOutQuart;
            const currentSize = start.size + (end.size - start.size) * easeOutQuart;

            redrawCanvas();
            drawDart(currentX, currentY, currentSize);

            if (progress < 1) {
                requestAnimationFrame(animationStep);
            } else {
                darts.push(target);
                playHitSound();
                calculateScore(target.x, target.y);
                updateStats();
                isAnimating = false;
                redrawCanvas();
            }
        }

        requestAnimationFrame(animationStep);
    }

    /**
     * Draws a dart on the canvas.
     * @param {number} x - The x coordinate.
     * @param {number} y - The y coordinate.
     * @param {number} size - The size of the dart emoji.
     */
    function drawDart(x, y, size = 24) {
        ctx.font = `${size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🎯', x, y);
    }

    /**
     * Redraws the entire canvas.
     */
    function redrawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (targetImage) {
            ctx.drawImage(targetImage, 0, 0, canvas.width, canvas.height);
            drawScoreZones();
        } else {
            drawWelcomeMessage();
        }
        darts.forEach(d => drawDart(d.x, d.y));
    }

    /**
     * Draws the welcome message on the canvas.
     */
    function drawWelcomeMessage() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = '20px Arial';
        ctx.fillText("Chargez une image pour commencer !", canvas.width / 2, canvas.height / 2);
    }

    /**
     * Draws the scoring zones on the canvas.
     */
    function drawScoreZones() {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        scoreZones.forEach(zone => {
            ctx.beginPath();
            ctx.arc(centerX, centerY, zone.radius, 0, Math.PI * 2);
            if (hoveredZone === zone) {
                ctx.strokeStyle = 'rgba(255, 223, 0, 1)';
                ctx.lineWidth = 3;
            } else {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.lineWidth = 2;
            }
            ctx.stroke();
        });
    }

    // ----------------------------------------------------------------------------
    //  Scoring and Stats
    // ----------------------------------------------------------------------------

    /**
     * Calculates the score based on the dart's position.
     * @param {number} x - The x coordinate of the dart.
     * @param {number} y - The y coordinate of the dart.
     */
    function calculateScore(x, y) {
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

        score += currentScore;
        lastScoreEl.textContent = currentScore;
        scoreEl.textContent = score;
        totalDistance += distance;
    }

    /**
     * Updates the game statistics.
     */
    function updateStats() {
        dartsThrown++;
        dartsThrownEl.textContent = dartsThrown;

        const avgPrecision = totalDistance / dartsThrown;
        avgPrecisionEl.textContent = avgPrecision.toFixed(2);

        if (score > highScore) {
            highScore = score;
            localStorage.setItem('highScore', highScore);
            highScoreEl.textContent = highScore;
        }
    }

    // ----------------------------------------------------------------------------
    //  Game Management
    // ----------------------------------------------------------------------------

    /**
     * Resets the game to its initial state.
     */
    function resetGame() {
        score = 0;
        dartsThrown = 0;
        totalDistance = 0;
        darts = [];
        scoreEl.textContent = '0';
        lastScoreEl.textContent = '0';
        dartsThrownEl.textContent = '0';
        avgPrecisionEl.textContent = '0';
        redrawCanvas();
    }

    // ----------------------------------------------------------------------------
    //  Audio
    // ----------------------------------------------------------------------------

    /**
     * Initializes the AudioContext.
     */
    function initAudio() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    /**
     * Plays a hit sound effect.
     */
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
});