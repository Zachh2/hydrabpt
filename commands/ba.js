const fs = require("fs-extra");

const path = require("path");

const axios = require("axios");

module.exports = {

  name: "ba",

  author: "Aljur pogoy",

  nonPrefix: false,

  description: "Get a fun BA image!",

  async run({ api, event }) {

    const { threadID, messageID } = event;

    try {

    

      const apiResponse = await axios.get("https://haji-mix-api.gleeze.com/api/ba", {

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

          url: "https://haji-mix-api.gleeze.com/api/ba",

          method: "GET",

          responseType: "stream",

        });

      }

 

      const tempImagePath = path.join(__dirname, "../temp/ba_image.jpg");

     

      const writer = fs.createWriteStream(tempImagePath);

      imageResponse.data.pipe(writer);

    

      await new Promise((resolve, reject) => {

        writer.on("finish", resolve);

        writer.on("error", reject);

      });

    

      let baMessage = `════『 𝗕𝗔 』════\n\n`;

      baMessage += `✨ Here's your Blue Archive image! ✨\n\n`;

      baMessage += `> Thank you for using our  Chatbot`;

     

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