export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        console.log('BootScene preload');
        // Add loading indicators here
    }

    create() {
        console.log('BootScene create');
        this.add.text(64, 110, 'CABLE FORCE ⚡️', { fontSize: '16px', fill: '#fff' });
        this.add.text(48, 140, 'Click to Start', { fontSize: '12px', fill: '#fff' });

        this.input.on('pointerdown', () => {
            console.log('Starting Lobby Scene...');
            this.scene.start('LobbyScene');
        });
    }
}
