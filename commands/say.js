// THIS COMMAND IS USING GOOGLE API FOR TRANSLATE 

const axios = require("axios");

const fs = require("fs");

const path = require("path");

module.exports = {

    name: "say",

    description: "Convert text to speech and send as an audio message.",

    usage: "say <message>",

    category: "fun",

    async run({ api, event, args }) {

        if (!args.length) return api.sendMessage("Please provide a message to convert into speech.", event.threadID);

        const message = args.join(" ");

        const audioPath = path.join(__dirname, "say.mp3");

        try {

            const response = await axios({

                method: "GET",

                url: `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(message)}&tl=en&client=tw-ob`,

                responseType: "stream"

            });

            const writer = fs.createWriteStream(audioPath);

            response.data.pipe(writer);

            writer.on("finish", () => {

                api.sendMessage({ attachment: fs.createReadStream(audioPath) }, event.threadID, () => {

                    fs.unlinkSync(audioPath);

                });

            });

        } catch (error) {

            api.sendMessage("❌ Failed to generate speech audio.", event.threadID);

        }

    }

};