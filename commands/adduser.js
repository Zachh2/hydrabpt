
const axios = require('axios');

module.exports.config = {

    name: "adduser",

    version: "4.00",
    
    author: "Aljur pogoy",
    

    description: "Add user to the group",

};

module.exports.run = async function ({ api, event, args }) {

    const { threadID, messageID } = event;

    let input = args.join(" ");

    const fbUrlRegex = /^https:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9.]+\/?$/;

    const uidRegex = /^\d+$/;

    if (!fbUrlRegex.test(input) && !uidRegex.test(input)) {

        return api.sendMessage("Invalid Facebook profile URL or UID.", threadID, messageID);

    }

    const prepare = await api.sendMessage("Adding......", threadID, messageID);

    try {

        let uid;

        if (fbUrlRegex.test(input)) {

            const res = await axios.get(`https://facebook-uid-ccpoject.vercel.app/fb?url=${input}`);

            api.editMessage("Verifying User......", prepare.messageID, threadID);

            if (res.data.code) {

                uid = res.data.code;

            } else {

                return api.editMessage("Failed to fetch the Facebook UID.", prepare.messageID, threadID);

            }

        } else {

            uid = input;

        }

        const userDetails = await api.getUserInfo(uid);

        const userName = userDetails[uid].name;

        const threadInfo = await api.getThreadInfo(threadID);

        if (threadInfo.participantIDs.includes(uid)) {

            return api.editMessage(`This user ${userName} has already been added to this group.`, prepare.messageID, threadID);

        }

        await api.addUserToGroup(uid, threadID);

        api.editMessage(`Successfully added ${userName} to this group.`, prepare.messageID, threadID);

    } catch (error) {

        console.error(error);

        api.editMessage("An error occurred while adding the user.", prepare.messageID, threadID);

    }

};