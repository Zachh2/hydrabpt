
const axios = require("axios");

module.exports = {

    name: "hsredit",
    description: "Sends hsredits.",
    author: "Aljur Pogoy",
    usage: "/hsredit",
    version: "3.0.0",

    async run({ api, event }) {

        try {

            const response = await axios({

                method: "GET",

                url: "https://haji-mix.up.railway.app/api/tiktok?search=Hsr+edits&stream=true",

                responseType: "stream"

            });

            api.sendMessage({

                body: "✨ heres your Hsr edits",

                attachment: response.data

            }, event.threadID, event.messageID);

        } catch (error) {

            console.error(error);

            api.sendMessage("❌ Error sending TikTok edit video.", event.threadID, event.messageID);

        }

    }
 };