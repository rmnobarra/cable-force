export class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    init(data) {
        this.isWinner = data.isWinner;
    }

    create() {
        const resultText = this.isWinner ? 'YOU WIN THE MATCH!' : 'GAME OVER - YOU LOSE';
        this.add.text(128, 100, resultText, { fontSize: '16px', fill: '#fff' }).setOrigin(0.5);
        this.add.text(128, 140, 'Click to Replay', { fontSize: '12px', fill: '#ffff00' }).setOrigin(0.5);

        this.input.on('pointerdown', () => {
            this.scene.start('BootScene');
        });
    }
}
