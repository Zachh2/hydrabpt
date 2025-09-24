const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
module.exports = {
  name: "waifu18",
  author: "Aljur pogoy",
  role: 2,
  nonPrefix: false,
  description: "Get a fun BA image!",
  async run({ api, event }) {
    const { threadID, messageID } = event;
    try {
      const apiResponse = await axios.get("https://kaiz-apis.gleeze.com/api/waifu-nsfw?apikey=6345c38b-47b1-4a9a-8a70-6e6f17d6641b", {
        responseType: "json",
      });
      let imageUrl;
      let imageResponse;
      if (apiResponse.headers["content-type"].includes("application/json")) {
        const data = apiResponse.data;
        imageUrl = data.url || data.image || data.result;
        if (!imageUrl) {
          throw new Error("No image URL found in API response");
        }
        imageResponse = await axios({
          url: imageUrl,
          method: "GET",
          responseType: "stream",
        });
      } else {
        imageResponse = await axios({
          url: "https://kaiz-apis.gleeze.com/api/waifu-nsfw?apikey=6345c38b-47b1-4a9a-8a70-6e6f17d6641b",
          method: "GET",
          responseType: "stream",
        });
      }
      const tempImagePath = path.join(__dirname, "../temp/Waifu_image.jpg");
      const writer = fs.createWriteStream(tempImagePath);
      imageResponse.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });
      let baMessage = `════『 𝗕𝗔 』════\n\n`;
      baMessage += `💦 +18 Waifu \n\n`;
      baMessage += `Gooning well`;
      const imageStream = fs.createReadStream(tempImagePath);
      await api.sendMessage(
        {
          body: baMessage,
          attachment: imageStream,
        },
        threadID,
        messageID
      );
      fs.unlinkSync(tempImagePath);
    } catch (error) {
      console.error("❌ Error in ba command:", error.message);
      let errorMessage = `════『 𝗕𝗔 』════\n\n`;
      errorMessage += `  ┏━━━━━━━┓\n`;
      errorMessage += `  ┃ 『 𝗜𝗡𝗙𝗢 』 An error occurred while fetching the image.\n`;
      errorMessage += `  ┃ ${error.message}\n`;
      errorMessage += `  ┗━━━━━━━┛\n\n`;
      errorMessage += `> Thank you for using our Chatbot`;
      api.sendMessage(errorMessage, threadID, messageID);
    }
  },
};
