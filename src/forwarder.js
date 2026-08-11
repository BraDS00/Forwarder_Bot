async function forwardToTargets(bot, sourceChatId, messageId, targets) {
    const results = [];

    for (const target of targets) {
        try {
            const message = await bot.telegram.forwardMessage(
                target,
                sourceChatId,
                messageId
            );

            results.push({
                target,
                success: true,
                message
            });

        } catch (error) {
            console.error(
                `Failed to forward message to ${target}:`,
                error.message
            );

            results.push({
                target,
                success: false,
                error: error.message
            });
        }
    }

    return results;
}

module.exports = {
    forwardToTargets
};