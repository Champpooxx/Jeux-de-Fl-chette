import { gameState, scoreZones, resetGame, changeWeapon, handleCanvasClick, handleMouseMove, handleMouseLeave } from './game.js';
import { UI } from './ui.js';
import { ErrorHandler, initAudio } from './utils.js';

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
    const ui = new UI(domElements, ctx, gameState, scoreZones);
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