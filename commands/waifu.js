const fs = require("fs-extra");

const path = require("path");

const axios = require("axios");

module.exports = {

  name: "waifu",

  author: "Aljur pogoy",

  nonPrefix: true,

  description: "Get a random waifu image",

  async run({ api, event }) {

    const { threadID, messageID } = event;

    try {

      const response = await axios.get("https://kaiz-apis.gleeze.com/api/waifu?apikey=6345c38b-47b1-4a9a-8a70-6e6f17d6641b", {

        responseType: "json",

      });

      const imageUrl = response.data.imageUrl;

      const imageResponse = await axios({

        url: imageUrl,

        method: "GET",

        responseType: "stream",

      });

      const tempImagePath = path.join(__dirname, "../temp/waifu.jpg");

      const writer = fs.createWriteStream(tempImagePath);

      imageResponse.data.pipe(writer);

      await new Promise((resolve, reject) => {

        writer.on("finish", resolve);

        writer.on("error", reject);

      });

      const imageStream = fs.createReadStream(tempImagePath);

      await api.sendMessage(

        {

          attachment: imageStream,

        },

        threadID,

        messageID

      );

      fs.unlinkSync(tempImagePath);

    } catch (error) {

      console.error("Error in waifu command:", error.message);

      api.sendMessage("Error fetching waifu image: " + error.message, threadID, messageID);

    }

  },

};