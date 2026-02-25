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
            // If we are on port 80 (standard), don't append a port.
            // Otherwise, if we are on another port (like 3000 in dev), use that.
            const url = window.location.port ? `${window.location.protocol}//${host}:${window.location.port}` : `${window.location.protocol}//${host}`;
            console.log(`Connecting to socket at ${url}`);
            this.socket = io(url, { transports: ['websocket', 'polling'] });
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
