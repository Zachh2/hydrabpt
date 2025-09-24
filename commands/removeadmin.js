module.exports = {
    name: 'removeadmin',
    category: 'Admin',
    execute: async (api, event, args, commands, prefix, admins, appState, sendMessage) => {
        const { threadID } = event;
        const adminIDToRemove = args[1];
        if (!adminIDToRemove) {
            sendMessage(api, { threadID, message: 'Please provide the user ID to remove as an admin.' });
            return;
        }
        const index = admins.indexOf(adminIDToRemove);
        if (index > -1) {
            admins.splice(index, 1);
            sendMessage(api, { threadID, message: `Removed ${adminIDToRemove} from admins.` });
        } else {
            sendMessage(api, { threadID, message: `${adminIDToRemove} is not an admin.` });
        }
    },
};
