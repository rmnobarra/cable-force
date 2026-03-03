import ws from 'k6/ws';
import { check, sleep } from 'k6';

export const options = {
    vus: 50,
    duration: '30s',
};

// Use the exact URL format Socket.io-client uses
const URL = 'ws://cableforce.127.0.0.1.nip.io/socket.io/?EIO=4&transport=websocket';

export default function () {
    const res = ws.connect(URL, {}, function (socket) {
        socket.on('open', () => {
            // Handshake 1: Connect
            socket.send('40');
            
            // Handshake 2: Join Game
            socket.setTimeout(() => {
                socket.send('42["joinGame"]');
            }, 200);

            // Heartbeat
            socket.setInterval(() => {
                socket.send('2');
            }, 10000);
        });

        socket.on('message', (data) => {
            // If server sends '0', it's the open packet with SID
            // If server sends '2', send '3' (pong)
            if (data.startsWith('2')) {
                socket.send('3');
            }
        });

        socket.on('error', (e) => {
            console.log(`Error: ${e.error()}`);
        });

        sleep(20);
        socket.close();
    });

    check(res, { 'status is 101': (r) => r && r.status === 101 });
}
