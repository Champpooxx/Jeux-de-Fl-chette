class UI {
    constructor(domElements, canvasContext, gameState, scoreZones) {
        this.dom = domElements;
        this.ctx = canvasContext;
        this.canvas = this.ctx.canvas;
        this.gameState = gameState;
        this.scoreZones = scoreZones;
        this.updateScores({
            score: 0,
            dartsThrown: 0,
            avgPrecision: '0.00',
            highScore: this.gameState.highScore,
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
        if (this.gameState.targetImage) {
            this.ctx.drawImage(this.gameState.targetImage, 0, 0, this.canvas.width, this.canvas.height);
            this.drawScoreZones();
        } else {
            this.drawWelcomeMessage();
        }
        this.gameState.darts.forEach(d => this.drawProjectile(d.x, d.y, this.gameState.weapons[d.weapon].size, d.weapon));
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

        this.scoreZones.forEach(zone => {
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, zone.radius, 0, Math.PI * 2);
            if (this.gameState.hoveredZone === zone) {
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
        const emoji = this.gameState.weapons[weapon].emoji;
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

export { UI };