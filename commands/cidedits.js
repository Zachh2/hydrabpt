const axios = require("axios");

module.exports = {

    name: "cidedits",

    description: "Sends hsredits.",

    author: "Aljur Pogoy",

    usage: "cidedit",

    version: "3.0.0",

    async run({ api, event }) {

        try {

            const response = await axios({

                method: "GET",

                url: "https://haji-mix.up.railway.app/api/tiktok?search=cid kagenou+edits&stream=true",

                responseType: "stream"

            });

            api.sendMessage({

                body: "✨ heres your Cid kagenou edits",

                attachment: response.data

            }, event.threadID, event.messageID);

        } catch (error) {

            console.error(error);

            api.sendMessage("❌", event.threadID, event.messageID);

        }

    }

 };