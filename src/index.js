require('dotenv').config();
const {
    connectDatabase,
    closeDatabase
} = require('./storage');

const http = require('http');
const bot = require('./bot');

const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/plain'
    });

    res.end('Forwarder Bot is running!');
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Web server is running on port ${PORT}`);
});

async function startBot() {
    await connectDatabase();
    await bot.launch();

    console.log('Forwarder Bot is running.');
    console.log('Bot is ready to forward messages.');
}

startBot().catch((error) => {
    console.error('Failed to start the bot:', error);
    process.exit(1);
});

async function stopApplication(signal) {
    bot.stop(signal);
    await closeDatabase();

    server.close();
}

process.once('SIGINT', () => {
    stopApplication('SIGINT');
});

process.once('SIGTERM', () => {
    stopApplication('SIGTERM');
});