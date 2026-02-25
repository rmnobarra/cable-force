export class LobbyScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LobbyScene' });
    }

    init(data) {
        this.socket = data.socket;
    }

    create() {
        this.add.text(128, 60, 'LOBBY', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);
        this.statusText = this.add.text(128, 120, 'Connecting...', { fontSize: '12px', fill: '#fff' }).setOrigin(0.5);

        if (!this.socket) {
            const host = window.location.hostname;
            const port = '3000';
            console.log(`Connecting to socket at http://${host}:${port}`);
            this.socket = io(`http://${host}:${port}`);
        }

        this.socket.emit('joinGame');

        this.socket.on('waitingForOpponent', () => {
            this.statusText.setText('Waiting for opponent...');
        });

        this.socket.on('matchFound', (data) => {
            console.log('Match found event received', data);
            this.statusText.setText('Match Found! Starting...');
            this.time.delayedCall(1000, () => {
                console.log('Transitioning to GameScene');
                this.scene.start('GameScene', { socket: this.socket, roomId: data.roomId, players: data.players });
            });
        });
    }
}
