const fs = require("fs-extra");

const path = require("path");

const axios = require("axios");

module.exports = {

  name: "apitest",
  
  role: 3,

  author: "Aljur Pogoy",
   verison: "3.0.0",
  description: "Test an API endpoint and display the response (Admin only). Usage: /apitest <url>",

  async run({ api, event, args, admins }) {

    const { threadID, messageID, senderID } = event;

  if (!admins.includes(senderID)) {

            let errorMessage = `════『 APITEST 』════\n\n`;

            errorMessage += `  ┏━━━━━━━┓\n`;

            errorMessage += `  ┃ 『 𝗜𝗡𝗙𝗢 』 Only admins can use this command.\n`;

            errorMessage += `  ┗━━━━━━━┛\n\n`;

            errorMessage += `> Thank you for using Chatbot`;

            return api.sendMessage(errorMessage, threadID, messageID);

        }


    if (!args[0] || !args[0].startsWith("http")) {

      return api.sendMessage(

        "════『 𝗔𝗣𝗜𝗧𝗘𝗦𝗧 』════\n\n❌ Please provide a valid URL.\nExample: /apitest https://api.example.com/data",

        threadID,

        messageID

      );

    }

    const url = args[0];

    try {

    

      const response = await axios.get(url, {

        responseType: "stream", 

        headers: {

          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",

        },

      });

      const contentType = response.headers["content-type"] || "";

   

      if (contentType.includes("application/json") || contentType.includes("text")) {

      

        const chunks = [];

        for await (const chunk of response.data) {

          chunks.push(chunk);

        }

        const rawData = Buffer.concat(chunks).toString("utf8");

        let jsonData;

        try {

          jsonData = JSON.parse(rawData);

        } catch {

          jsonData = rawData; 

        }

        

        const formattedData = typeof jsonData === "object" ? JSON.stringify(jsonData, null, 2) : jsonData;

        let resultMessage = `════『 𝗔𝗣𝗜𝗧E𝗦𝗧 』════\n\n`;

        resultMessage += `🌐 API Response 🌐\n\n`;

        resultMessage += `📋 Content-Type: ${contentType}\n\n`;

        resultMessage += `📜 Response Data:\n${formattedData}\n\n`;

        resultMessage += `> Thank you for using our Chat bot`;

        return api.sendMessage(resultMessage, threadID, messageID);

      }

    

      if (contentType.includes("image")) {

       
// this part you can also change if you want a real time!!!!
        const tempImagePath = path.join(__dirname, "../temp/apitest_image.jpg");

       

        const writer = fs.createWriteStream(tempImagePath);

        response.data.pipe(writer);

      

        await new Promise((resolve, reject) => {

          writer.on("finish", resolve);

          writer.on("error", reject);

        });

      

        let imageMessage = `════『 𝗔𝗣𝗜𝗧𝗘𝗦𝗧 』════\n\n`;

        imageMessage += `🌐 API Response 🌐\n\n`;

        imageMessage += `📋 Content-Type: ${contentType}\n\n`;

        imageMessage += `🖼️ Image Attachment Below:\n\n`;

        imageMessage += `> Thank you for using our Chat bot`;

        

        const imageStream = fs.createReadStream(tempImagePath);

        await api.sendMessage(

          {

            body: imageMessage,

            attachment: imageStream,

          },

          threadID,

          messageID

        );

     

        fs.unlinkSync(tempImagePath);

      } else {

    

        throw new Error(`Unsupported Content-Type: ${contentType}`);

      }

    } catch (error) {

      console.error("❌ Error in apitest command:", error.message);

      let errorMessage = `════『 𝗔𝗣𝗜𝗧𝗘𝗦𝗧 』════\n\n`;

      errorMessage += `  ┏━━━━━━━┓\n`;

      errorMessage += `  ┃ 『 𝗜𝗡𝗙𝗢 』 An error occurred while fetching the API.\n`;

      errorMessage += `  ┃ Error: ${error.message}\n`;

      errorMessage += `  ┗━━━━━━━┛\n\n`;

      errorMessage += `> Thank you for using our Chat bot`;

      api.sendMessage(errorMessage, threadID, messageID);

    }

  },

};