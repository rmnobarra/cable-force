export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        this.socket = data.socket;
        this.roomId = data.roomId;
        this.players = data.players;
        this.currentSequence = [];
        this.playerSequence = [];
        this.isRoundActive = false;
    }

    getScoreString() {
        return this.players.map(p => `P${p.id.slice(0,4)}: ${p.score}`).join(' | ');
    }

    create() {
        // UI
        this.add.text(10, 10, 'CABLE FORCE', { fontSize: '12px', fill: '#0f0' });
        this.scoreText = this.add.text(10, 25, this.getScoreString(), { fontSize: '10px', fill: '#fff' });
        this.statusText = this.add.text(128, 60, 'READY?', { fontSize: '20px', fill: '#fff' }).setOrigin(0.5);

        // The Kid placeholder (32x32)
        this.kid = this.add.rectangle(128, 180, 32, 32, 0xffccaa);
        this.add.text(128, 180, 'KID', { fontSize: '8px', fill: '#000' }).setOrigin(0.5);

        // Cable visual
        this.cable = this.add.rectangle(128, 200, 256, 4, 0x555555);
        this.cableJitter = 0;

        // Arrow Object Pool (using text for now, but pooled)
        this.arrowPool = [];
        for (let i = 0; i < 10; i++) {
            const arrow = this.add.text(0, 0, '', { fontSize: '16px', fill: '#ffff00' }).setOrigin(0.5).setVisible(false);
            this.arrowPool.push(arrow);
        }

        this.activeArrows = [];
        this.inputProgressText = this.add.text(128, 150, '', { fontSize: '12px', fill: '#00ffff' }).setOrigin(0.5);
        this.cursors = this.input.keyboard.createCursorKeys();

        this.setupSocketListeners();
    }

    setupSocketListeners() {
        this.socket.off('roundStart');
        this.socket.off('roundWin');
        this.socket.off('roundFail');
        this.socket.off('matchGameOver');
        this.socket.off('opponentDisconnected');

        this.socket.on('roundStart', (data) => {
            this.currentSequence = data.sequence;
            this.playerSequence = [];
            this.isRoundActive = true;
            this.statusText.setText('GO!');
            this.displaySequence(this.currentSequence);
            this.inputProgressText.setText('');
        });

        this.socket.on('roundWin', (data) => {
            this.isRoundActive = false;
            this.players = data.players;
            this.scoreText.setText(this.getScoreString());
            this.statusText.setText(data.winnerId === this.socket.id ? 'WINNER!' : 'LOOSER!');
            
            // Winning jump
            this.tweens.add({
                targets: this.kid,
                y: 160,
                duration: 200,
                yoyo: true,
                repeat: 2
            });
        });

        this.socket.on('roundFail', () => {
            this.playerSequence = [];
            this.displaySequence(this.currentSequence); // Reset colors
            this.inputProgressText.setText('FAIL!');
            
            // Stumble effect
            this.tweens.add({
                targets: this.kid,
                x: this.kid.x + 10,
                duration: 100,
                yoyo: true
            });
        });

        this.socket.on('matchGameOver', (data) => {
            this.scene.start('GameOverScene', { winnerId: data.winnerId, isWinner: data.winnerId === this.socket.id });
        });

        this.socket.on('opponentDisconnected', () => {
            this.statusText.setText('OPPONENT LEFT');
            this.time.delayedCall(2000, () => this.scene.start('LobbyScene'));
        });

        this.socket.emit('playerReady', { roomId: this.roomId });
    }

    displaySequence(sequence) {
        this.activeArrows.forEach(a => a.setVisible(false));
        this.activeArrows = [];

        const startX = 128 - ((sequence.length - 1) * 25) / 2;
        sequence.forEach((dir, i) => {
            const arrow = this.arrowPool[i];
            arrow.setPosition(startX + i * 25, 120);
            arrow.setText(this.getArrowChar(dir));
            arrow.setFill('#ffff00');
            arrow.setVisible(true);
            this.activeArrows.push(arrow);
        });
    }

    getArrowChar(dir) {
        switch(dir) {
            case 'UP': return '↑';
            case 'DOWN': return '↓';
            case 'LEFT': return '←';
            case 'RIGHT': return '→';
        }
    }

    update(time, delta) {
        if (this.isRoundActive) {
            this.cableJitter = Math.sin(time / 50) * 2;
            this.cable.y = 200 + this.cableJitter;
            this.kid.x = 128 + Math.sin(time / 100) * 1;

            if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) this.handleInput('UP');
            else if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) this.handleInput('DOWN');
            else if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) this.handleInput('LEFT');
            else if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) this.handleInput('RIGHT');
        }
    }

    handleInput(direction) {
        const nextTarget = this.currentSequence[this.playerSequence.length];
        if (direction === nextTarget) {
            this.activeArrows[this.playerSequence.length].setFill('#00ff00');
            this.playerSequence.push(direction);
            
            // Pull animation
            this.kid.x -= 5;
            this.time.delayedCall(50, () => this.kid.x += 5);
        } else {
            this.socket.emit('submitSequence', { roomId: this.roomId, sequence: ['FAIL'] });
            return;
        }

        if (this.playerSequence.length === this.currentSequence.length) {
            this.isRoundActive = false;
            this.socket.emit('submitSequence', { roomId: this.roomId, sequence: this.playerSequence });
        }
    }
}
