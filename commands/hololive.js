const fs = require("fs-extra");

const path = require("path");

const axios = require("axios");

module.exports = {

  name: "hololive",

  author: "Aljur pogoy",

  nonPrefix: false,

  description: "Get a random Hololive anime image with caption",

  async run({ api, event }) {

    const { threadID, messageID } = event;

    try {

      const response = await axios.get("https://api.andaraz.com/randomanime/hololive?apikey=zenzkey_8fc8bdedf5", {

        responseType: "json",

      });

      const { caption, image } = response.data.result;

      const imageResponse = await axios({

        url: image,

        method: "GET",

        responseType: "stream",

      });

      const tempImagePath = path.join(__dirname, "../temp/hololive.jpg");

      const writer = fs.createWriteStream(tempImagePath);

      imageResponse.data.pipe(writer);

      await new Promise((resolve, reject) => {

        writer.on("finish", resolve);

        writer.on("error", reject);

      });

      const message = `${caption}\n\n> Thank you for using our Chatbot`;

      const imageStream = fs.createReadStream(tempImagePath);

      await api.sendMessage(

        {

          body: message,

          attachment: imageStream,

        },

        threadID,

        messageID

      );

      fs.unlinkSync(tempImagePath);

    } catch (error) {

      console.error("❌ Error in hololive command:", error.message);

      const errorMessage = `════『 𝗛𝗢𝗟𝗢𝗟𝗜𝗩𝗘 』════\n\n  ┏━━━━━━━┓\n  ┃ 『 𝗜𝗡𝗙𝗢 』 An error occurred while fetching the Hololive image.\n  ┃ ${error.message}\n  ┗━━━━━━━┛\n\n> Thank you for using our Chatbot`;

      api.sendMessage(errorMessage, threadID, messageID);

    }

  },

};