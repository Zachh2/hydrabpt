module.exports = {
    name: 'restart',
    description: 'Restarts the bot.',
    execute: async (api, event, args, commands, prefix, admins, appState, sendMessage) => {
        const { threadID, senderID } = event;
        if (!admins.includes(senderID)) {
            sendMessage(api, { threadID, message: 'You do not have permission to use this command.' });
            return;
        }
        sendMessage(api, { threadID, message: 'Restarting...' });
        setTimeout(() => {
            process.exit(0);
        }, 1000); 
    }
};
