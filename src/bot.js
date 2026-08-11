const { Telegraf, Markup } = require('telegraf');

const {
    addGroup,
    removeGroup,
    getGroups,
    addUser,
    getUsers
} = require('./storage');

const {
    forwardToTargets
} = require('./forwarder');

const token = process.env.BOT_TOKEN;
const ownerId = Number(process.env.OWNER_ID);

if (!token) {
    throw new Error('BOT_TOKEN is missing. Add it to your .env file.');
}

if (!ownerId) {
    throw new Error('OWNER_ID is missing. Add it to your .env file.');
}

const bot = new Telegraf(token);

/*
 * Temporary forwarding sessions.
 *
 * Example:
 *
 * {
 *     messageId: 42,
 *     sourceChatId: 123456789,
 *     targets: [-100111111111, 123456789]
 * }
 */
const sessions = new Map();

function isOwner(ctx) {
    return ctx.from?.id === ownerId;
}

function getSession(userId) {
    if (!sessions.has(userId)) {
        sessions.set(userId, {
            messageId: null,
            sourceChatId: null,
            targets: []
        });
    }

    return sessions.get(userId);
}

function clearSession(userId) {
    sessions.delete(userId);
}

function buildTargetKeyboard(session) {
    const groups = getGroups();
    const users = getUsers();

    const rows = [];

    for (const group of groups) {
        const selected = session.targets.includes(group.id);

        rows.push([
            Markup.button.callback(
                `${selected ? '✅' : '☐'} ${group.title}`,
                `target:g:${group.id}`
            )
        ]);
    }

    for (const user of users) {
        const selected = session.targets.includes(user.id);

        const name = user.username
            ? `@${user.username}`
            : user.firstName || String(user.id);

        rows.push([
            Markup.button.callback(
                `${selected ? '✅' : '☐'} ${name}`,
                `target:u:${user.id}`
            )
        ]);
    }

    rows.push([
        Markup.button.callback(
            'SEND',
            'target:send'
        )
    ]);

    rows.push([
        Markup.button.callback(
            'CANCEL',
            'target:cancel'
        )
    ]);

    return Markup.inlineKeyboard(rows);
}


// ---------------------------------------------------------
// START
// ---------------------------------------------------------

bot.start(async (ctx) => {

    addUser(ctx.from);

    return ctx.reply(
        `
Welcome to ForwarderBot.

Select what you want to do.
        `,
        Markup.inlineKeyboard([
            [
                Markup.button.callback(
                    'Forward a Message',
                    'forward'
                )
            ],
            [
                Markup.button.callback(
                    'Add Bot to a New Group',
                    'add'
                ),
                Markup.button.callback(
                    'Already Joined Groups',
                    'listgroups'
                )
            ]
        ])
    );
});


// ---------------------------------------------------------
// ADD BOT TO GROUP
// ---------------------------------------------------------

bot.action('add', async (ctx) => {

    await ctx.answerCbQuery();

    if (!isOwner(ctx)) {
        return ctx.reply('You are not authorized to operate this bot.');
    }

    const me = await ctx.telegram.getMe();

    const url =
        `https://t.me/${me.username}?startgroup=true`;

    return ctx.reply(
        'Choose the group where you want to add the bot:',
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


// ---------------------------------------------------------
// GROUP LIST
// ---------------------------------------------------------

bot.action('listgroups', async (ctx) => {

    await ctx.answerCbQuery();

    if (!isOwner(ctx)) {
        return ctx.reply('You are not authorized to operate this bot.');
    }

    const groups = getGroups();

    if (groups.length === 0) {
        return ctx.reply(
            'The bot has not joined any groups yet.'
        );
    }

    let text = 'Groups currently registered:\n\n';

    for (const group of groups) {
        text += `• ${group.title}\n`;
        text += `  ID: ${group.id}\n`;
        text += `  Type: ${group.type}\n\n`;
    }

    return ctx.reply(text);
});


// ---------------------------------------------------------
// BOT GROUP MEMBERSHIP CHANGES
// ---------------------------------------------------------

bot.on('my_chat_member', async (ctx) => {

    const update = ctx.myChatMember;
    const chat = update.chat;

    if (
        chat.type !== 'group' &&
        chat.type !== 'supergroup'
    ) {
        return;
    }

    const status = update.new_chat_member.status;

    if (
        status === 'member' ||
        status === 'administrator'
    ) {
        addGroup(chat);

        console.log(
            `Bot joined group: ${chat.title} (${chat.id})`
        );

        return;
    }

    if (
        status === 'left' ||
        status === 'kicked'
    ) {
        removeGroup(chat.id);

        console.log(
            `Bot left group: ${chat.title} (${chat.id})`
        );
    }
});


// ---------------------------------------------------------
// FORWARD FLOW
// ---------------------------------------------------------

bot.action('forward', async (ctx) => {

    await ctx.answerCbQuery();

    if (!isOwner(ctx)) {
        return ctx.reply('You are not authorized to operate this bot.');
    }

    const userId = ctx.from.id;

    clearSession(userId);

    getSession(userId);

    return ctx.reply(
        'Send me the message you want to forward.'
    );
});


// ---------------------------------------------------------
// RECEIVE MESSAGE TO FORWARD
// ---------------------------------------------------------

bot.on('message', async (ctx) => {

    if (!isOwner(ctx)) {
        return;
    }

    if (ctx.chat.type !== 'private') {
        return;
    }

    if (ctx.message.text?.startsWith('/')) {
        return;
    }

    const session = sessions.get(ctx.from.id);

    if (!session) {
        return;
    }

    session.messageId = ctx.message.message_id;
    session.sourceChatId = ctx.chat.id;
    session.targets = [];

    return ctx.reply(
        'Select the destinations:',
        buildTargetKeyboard(session)
    );
});


// ---------------------------------------------------------
// SELECT / DESELECT GROUP
// ---------------------------------------------------------

bot.action(/^target:g:(-?\d+)$/, async (ctx) => {

    await ctx.answerCbQuery();

    if (!isOwner(ctx)) {
        return;
    }

    const groupId = Number(ctx.match[1]);
    const session = sessions.get(ctx.from.id);

    if (!session) {
        return ctx.reply(
            'There is no active forwarding session.'
        );
    }

    const index = session.targets.indexOf(groupId);

    if (index === -1) {
        session.targets.push(groupId);
    } else {
        session.targets.splice(index, 1);
    }

    return ctx.editMessageReplyMarkup(
        buildTargetKeyboard(session).reply_markup
    );
});


// ---------------------------------------------------------
// SELECT / DESELECT USER
// ---------------------------------------------------------

bot.action(/^target:u:(\d+)$/, async (ctx) => {

    await ctx.answerCbQuery();

    if (!isOwner(ctx)) {
        return;
    }

    const userId = Number(ctx.match[1]);
    const session = sessions.get(ctx.from.id);

    if (!session) {
        return ctx.reply(
            'There is no active forwarding session.'
        );
    }

    const index = session.targets.indexOf(userId);

    if (index === -1) {
        session.targets.push(userId);
    } else {
        session.targets.splice(index, 1);
    }

    return ctx.editMessageReplyMarkup(
        buildTargetKeyboard(session).reply_markup
    );
});


// ---------------------------------------------------------
// SEND
// ---------------------------------------------------------

bot.action('target:send', async (ctx) => {

    await ctx.answerCbQuery();

    if (!isOwner(ctx)) {
        return;
    }

    const userId = ctx.from.id;
    const session = sessions.get(userId);

    if (!session) {
        return ctx.reply(
            'There is no active forwarding session.'
        );
    }

    if (!session.messageId || !session.sourceChatId) {
        return ctx.reply(
            'No message has been selected.'
        );
    }

    if (session.targets.length === 0) {
        return ctx.reply(
            'Please select at least one destination.'
        );
    }

    await ctx.reply(
        `Forwarding to ${session.targets.length} destination(s)...`
    );

    const results = await forwardToTargets(
        bot,
        session.sourceChatId,
        session.messageId,
        session.targets
    );

    const successful = results.filter(
        result => result.success
    );

    const failed = results.filter(
        result => !result.success
    );

    let text =
        `Forwarding completed.\n\n` +
        `Successful: ${successful.length}\n` +
        `Failed: ${failed.length}`;

    if (failed.length > 0) {

        text += '\n\nFailed destinations:\n';

        for (const failure of failed) {
            text += `\n${failure.target}\n`;
            text += `${failure.error}\n`;
        }
    }

    clearSession(userId);

    return ctx.reply(text);
});


// ---------------------------------------------------------
// CANCEL
// ---------------------------------------------------------

bot.action('target:cancel', async (ctx) => {

    await ctx.answerCbQuery();

    if (!isOwner(ctx)) {
        return;
    }

    clearSession(ctx.from.id);

    return ctx.editMessageText(
        'Forwarding cancelled.'
    );
});


// ---------------------------------------------------------
// ERROR HANDLING
// ---------------------------------------------------------

bot.catch((error, ctx) => {
    console.error(
        `Unhandled error for update ${ctx.update.update_id}:`,
        error
    );
});

module.exports = bot;