// commands/removeuser.js
module.exports = {
    name: 'removeuser',
    description: 'Removes a user from the group.',
    execute: async (api, event, args, commands, prefix, admins, vips, appState, sendMessage) => {
        const { threadID, senderID } = event;
        const isAdmin = admins.includes(senderID);

        if (!isAdmin) {
            sendMessage(api, { threadID, message: 'You do not have permission to use this command.' });
            return;
        }

        if (args.length < 2) {
            sendMessage(api, { threadID, message: `Usage: ${prefix}removeuser [user_id] or ${prefix}removeuser @[username]` });
            return;
        }

        let userIDToRemove;
        
        if (args[1].startsWith('@')) {

          const username = args[1].substring(1);
        
          try {
            const users = await api.searchForUsers(username);
            if (users.length === 0) {
              sendMessage(api, { threadID, message: `User '${username}' not found.` });
              return;
            }
            
            userIDToRemove = users[0].userID;
          } catch (error) {
            sendMessage(api, { threadID, message: `Error searching for user: ${error.message}` });
            return;
          }

        } else {
            userIDToRemove = args[1];
        }

        try {
            await api.removeUserFromGroup(userIDToRemove, threadID);
            sendMessage(api, { threadID, message: `User ${userIDToRemove} removed from group.` });
        } catch (error) {
            console.error('Error removing user:', error);
            sendMessage(api, { threadID, message: `Error removing user: ${error.message}` });
        }
    },
};
