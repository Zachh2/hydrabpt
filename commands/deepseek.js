const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "deepseek",
  category: "AI",
  execute: async (api, event, args, commands, prefix, admins, appState, sendMessage) => {
    const { threadID, messageID, senderID, attachments } = event;

  
    const userID = senderID || Math.floor(Math.random() * 10000);
    

    const question = args.join(" ") || "Hello";
    let apiUrl = `https://kaiz-apis.gleeze.com/api/deepseek-v3?ask=${encodeURIComponent(question)}&uid=${userID}`;

    try {
      if (attachments && attachments.length > 0) {
      
        const image = attachments[0];
        if (image.type === "photo") {
        
          const tempFilePath = path.join(__dirname, "temp_image.jpg");
          const imageStream = fs.createWriteStream(tempFilePath);

          const imageRequest = await axios.get(image.url, { responseType: "stream" });
          imageRequest.data.pipe(imageStream);

          imageStream.on("finish", async () => {
            
            const formData = new FormData();
            formData.append("file", fs.createReadStream(tempFilePath));

            const response = await axios.post(apiUrl, formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });

            sendMessage(api, { threadID, message: response.data.response || "I couldn't analyze the image." });
            fs.unlinkSync(tempFilePath); // Delete temp image
          });
        } else {
          sendMessage(api, { threadID, message: "❌ Please send an image!" });
        }
      } else {
        
        const response = await axios.get(apiUrl);
        sendMessage(api, { threadID, message: response.data.response || "I couldn't understand your question." });
      }
    } catch (error) {
      console.error("Error using Deepseek AI:", error);
      sendMessage(api, { threadID, message: "❌ Deepseek AI is unavailable." });
    }
  },
};
