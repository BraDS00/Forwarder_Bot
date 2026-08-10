require('dotenv').config();

const bot = require('./bot');

async function startBot() {
    await bot.launch();
    console.log('Forwarder Bot is running. Press Ctrl+C to stop it.');
    console.log('Bot is ready to forward messages.');
    console.log(req.body);
}

startBot().catch((error) => {
    console.error('Failed to start the bot:', error);
    process.exit(1);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));