const fs = require("fs");

const path = require("path");

const bannedUsersFile = path.join(__dirname, "../events/bannedUsers.json");

// Load banned users

const loadBannedUsers = () => {

    try {

        return JSON.parse(fs.readFileSync(bannedUsersFile, "utf8"));

    } catch {

        return {};

    }

};

module.exports = {

    name: "banlist",

    author: "Aljur Pogoy",

    description: "Displays a list of all banned users with their names, UID, and reason. Everyone can use this.",

    async run({ api, event }) {

        const { threadID } = event;

        const bannedUsers = loadBannedUsers();

        const bannedList = Object.keys(bannedUsers);

        if (bannedList.length === 0) {

            return api.sendMessage("✅ No users are currently banned.", threadID);

        }

        let message = "🚫 Banned User List:\n";

        let fetchedUsers = 0;

        bannedList.forEach((userID, index) => {

            api.getUserInfo(userID, (err, data) => {

                fetchedUsers++;

                const userInfo = bannedUsers[userID];

                const reason = userInfo.reason || "No reason provided";

                if (err || !data[userID]) {

                    message += `\n${index + 1}. UID: ${userID} | (Name not found) | Reason: ${reason}`;

                } else {

                    message += `\n${index + 1}. ${data[userID].name} | UID: ${userID} | Reason: ${reason}`;

                }

                // Send message after fetching all users

                if (fetchedUsers === bannedList.length) {

                    api.sendMessage(message, threadID);

                }

            });

        });

    }

};