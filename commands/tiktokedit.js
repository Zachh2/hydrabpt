const axios = require("axios");

module.exports = {

    name: "tiktokedit",

    description: "Search and send TikTok edit videos.",

    usage: "/tiktokedit [search query]",

    async run({ api, event, args }) {

        try {

            const query = args.join(" ");

            if (!query) {

                return api.sendMessage("❌ Please provide a search query.\n\nExample: /tiktokedit Cid Kagenou", event.threadID, event.messageID);

            }

            const response = await axios({

                method: "GET",

                url: `https://haji-mix-api.gleeze.com/api/tiktok?search=${encodeURIComponent(query)}&stream=true`,

                responseType: "stream"

            });

            api.sendMessage({

                body: `Here's your TikTok edit for: ${query}`,

                attachment: response.data

            }, event.threadID, event.messageID);

        } catch (error) {

            console.error(error);

            api.sendMessage("❌ Error fetching TikTok edit video.", event.threadID, event.messageID);

        }

    }

};