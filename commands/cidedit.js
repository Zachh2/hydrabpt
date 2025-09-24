const axios = require("axios");

module.exports = {

    name: "shoti",

    description: "Sends a Cid Kagenou TikTok edit video.",

    usage: "/shoti",
    nonPrefix: true,

    async run({ api, event }) {

        try {

            const response = await axios({

                method: "GET",

                url: "https://haji-mix.up.railway.app/api/shoti?stream=true",

                responseType: "stream"

            });

            api.sendMessage({

                body: "Here's your Shoti, No Jkol challenge ah",

                attachment: response.data

            }, event.threadID, event.messageID);

        } catch (error) {

            console.error(error);

            api.sendMessage("❌", event.threadID, event.messageID);

        }

    }

};