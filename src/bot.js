const { Telegraf, Markup } = require('telegraf');

const token = process.env.BOT_TOKEN;

if (!token) {
    throw new Error('BOT_TOKEN is missing. Add it to your .env file.');
}

const bot = new Telegraf(token);

// Write your welcome/explanation text here.
const startMessage = `
Welcome to Forwarder Bot! 👋

Write your explanation here.
`;

// /start displays the explanation text and its buttons.
bot.start((ctx) => {
    return ctx.reply(
        startMessage,
        Markup.inlineKeyboard([
            // This button takes the entire first row (full width).
            [Markup.button.callback('Forward a Message', 'forward')],

            // These two buttons share the second row (50% each).
            [
                Markup.button.callback('Add Bot to a New Group', 'add'),
                Markup.button.callback('Already Joined Groups', 'listgroups'),
            ],
        ]),
    );
});

// These are temporary responses. We will build their real features next.
bot.command('forward', (ctx) => {
    return ctx.reply('Forward a Message selected.');
});

bot.command('add', (ctx) => {
    return ctx.reply('Add Bot to a New Group selected.');
});

bot.command('listgroups', (ctx) => {
    return ctx.reply('Already Joined Groups selected.');
});

// Makes the buttons behave like their matching commands.
bot.action('forward', (ctx) => {
    ctx.answerCbQuery();
    return ctx.reply('Forward a Message selected.');
});

bot.action('add', async (ctx) => {
    await ctx.answerCbQuery();

    const botUsername = process.env.BOT_USERNAME;

    const url =
        `https://t.me/${botUsername}?startgroup=true`;

    return ctx.reply(
        'Choose the group where you want to add me:',
        Markup.inlineKeyboard([
            [
                Markup.button.url(
                    'Add Bot to a New Group',
                    url
                )
            ]
        ])
    );
});

bot.action('listgroups', (ctx) => {
    ctx.answerCbQuery();
    return ctx.reply('Already Joined Groups selected.');
});

bot.catch((error, ctx) => {
    console.error(`Unhandled error for update ${ctx.update.update_id}:`, error);
});

module.exports = bot;

const { addGroup } = require('./storage');

bot.on('my_chat_member', async (ctx) => {
    const update = ctx.myChatMember;

    const chat = update.chat;

    const newStatus = update.new_chat_member.status;

    if (
        chat.type === 'group' ||
        chat.type === 'supergroup'
    ) {
        if (
            newStatus === 'member' ||
            newStatus === 'administrator'
        ) {
            addGroup(chat);

            console.log(
                `Bot joined group: ${chat.title} (${chat.id})`
            );
        }
    }
});
