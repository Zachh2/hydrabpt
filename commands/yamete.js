const fs = require("fs");

module.exports = {

    name: "yamete",

    author: "VanHung & aljur pogoy",

    description: "Plays 'Yamete' sound when triggered.",

    nonPrefix: true,

    async run({ api, event }) {

        const { threadID, messageID, body } = event;

  

        if (/^yamete/i.test(body)) {

            const audioPath = `${__dirname}/cache/yamate.mp3`;

            if (!fs.existsSync(audioPath)) {

                return api.sendMessage("❌ Audio file not found!", threadID, messageID);

            }

            api.sendMessage({

                attachment: fs.createReadStream(audioPath)

            }, threadID, messageID);

        }

    }

};