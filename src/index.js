require('dotenv').config();

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
    await bot.launch();

    console.log('Forwarder Bot is running.');
    console.log('Bot is ready to forward messages.');
}

startBot().catch((error) => {
    console.error('Failed to start the bot:', error);
    process.exit(1);
});

process.once('SIGINT', () => {
    bot.stop('SIGINT');
    server.close();
});

process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
    server.close();
});