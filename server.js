const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const os = require('os');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*' }
});

const PORT = 3000;

// Store connected users and message history
const users = new Map(); // socket.id -> { name, device, avatar }
const messageHistory = [];
const MAX_HISTORY = 200;

// Get local IP addresses
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({ name, address: iface.address });
      }
    }
  }
  return ips;
}

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API: get server info
app.get('/api/info', (req, res) => {
  res.json({
    ips: getLocalIPs(),
    port: PORT,
    hostname: os.hostname(),
    users: Array.from(users.values()).map(u => ({ name: u.name, device: u.device }))
  });
});

// Socket.IO events
io.on('connection', (socket) => {
  console.log(`[+] New connection: ${socket.id} from ${socket.handshake.address}`);

  // Join: user announces themselves
  socket.on('join', ({ name, device }) => {
    const safeName = (name || 'Anônimo').slice(0, 30);
    const safeDevice = device || 'Desconhecido';
    const avatar = generateAvatar(safeName);

    users.set(socket.id, { name: safeName, device: safeDevice, avatar, id: socket.id });
    console.log(`[join] ${safeName} (${safeDevice})`);

    // Send history to new user
    socket.emit('history', messageHistory);

    // Notify all about new user
    io.emit('user_joined', {
      id: socket.id,
      name: safeName,
      device: safeDevice,
      avatar
    });

    // Send updated user list to all
    io.emit('user_list', Array.from(users.values()));

    // System message
    const sysMsg = {
      type: 'system',
      text: `${safeName} entrou no chat`,
      timestamp: Date.now()
    };
    addToHistory(sysMsg);
    io.emit('message', sysMsg);
  });

  // Message: user sends a message
  socket.on('send_message', ({ text, to }) => {
    const user = users.get(socket.id);
    if (!user || !text || !text.trim()) return;

    const msg = {
      type: 'chat',
      id: socket.id,
      name: user.name,
      device: user.device,
      avatar: user.avatar,
      text: text.trim().slice(0, 2000),
      timestamp: Date.now(),
      to: to || null // null = broadcast, socket.id = private
    };

    addToHistory(msg);

    if (to) {
      // Private message: send to sender + recipient
      socket.emit('message', { ...msg, private: true });
      if (io.sockets.sockets.get(to)) {
        io.to(to).emit('message', { ...msg, private: true });
      }
    } else {
      // Broadcast to all
      io.emit('message', msg);
    }
  });

  // Typing indicator
  socket.on('typing', ({ to }) => {
    const user = users.get(socket.id);
    if (!user) return;
    const payload = { id: socket.id, name: user.name };
    if (to) {
      io.to(to).emit('typing', payload);
    } else {
      socket.broadcast.emit('typing', payload);
    }
  });

  socket.on('stop_typing', ({ to }) => {
    const payload = { id: socket.id };
    if (to) {
      io.to(to).emit('stop_typing', payload);
    } else {
      socket.broadcast.emit('stop_typing', payload);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      console.log(`[-] Disconnected: ${user.name}`);
      users.delete(socket.id);

      const sysMsg = {
        type: 'system',
        text: `${user.name} saiu do chat`,
        timestamp: Date.now()
      };
      addToHistory(sysMsg);
      io.emit('message', sysMsg);
      io.emit('user_left', { id: socket.id });
      io.emit('user_list', Array.from(users.values()));
    }
  });
});

function addToHistory(msg) {
  messageHistory.push(msg);
  if (messageHistory.length > MAX_HISTORY) {
    messageHistory.shift();
  }
}

function generateAvatar(name) {
  const colors = ['#6C63FF','#FF6584','#43BCCD','#F9A825','#66BB6A','#EF5350','#AB47BC','#26C6DA','#FFA726','#8D6E63'];
  let hash = 0;
  for (let c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xFFFFFFFF;
  return {
    color: colors[Math.abs(hash) % colors.length],
    initials: name.slice(0, 2).toUpperCase()
  };
}

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIPs();
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║         LocalChat P2P iniciado!      ║');
  console.log('╠══════════════════════════════════════╣');
  console.log(`║  Porta: ${PORT}                      ║`);
  console.log('║  Acesse pelo celular:                ║');
  console.log(`║  → http://${ips[0].address}:${PORT}      ║`);
  console.log('╚══════════════════════════════════════╝\n');
});
