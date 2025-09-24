const axios = require('axios');

module.exports.config = {
 name: "text2ghibli",
 version: "1.0.0",
 credits: "developer",
 description: "Generates a Ghibli-style image from the given prompt.",
 hasPrefix: true,
 cooldown: 5,
 aliases: ["ghibli", "ghibliimg"],
};

module.exports.run = async function ({ api, event, args }) {
 try {
 const prompt = args.join(" ");
 if (!prompt) {
 return api.sendMessage(
 "Please provide a prompt to generate a Ghibli-style image.\n\nExample: text2ghibli dog",
 event.threadID,
 event.messageID
 );
 }

 api.sendMessage("Generating your Ghibli image, please wait...", event.threadID, async () => {
 try {
 const apiUrl = `https://api.ferdev.my.id/tools/text2ghibli?prompt=${encodeURIComponent(prompt)}&apikey=lain-lain`;
 const response = await axios.get(apiUrl, { responseType: "stream" });

 if (!response.data) {
 return api.sendMessage("Failed to retrieve the image.", event.threadID, event.messageID);
 }

 return api.sendMessage({
 body: `Here is your Ghibli-style image for: "${prompt}"`,
 attachment: response.data,
 }, event.threadID, event.messageID);
 } catch (error) {
 console.error("Ghibli image generation error:", error);
 api.sendMessage("An error occurred while generating the Ghibli image. Please try again later.", event.threadID, event.messageID);
 }
 });
 } catch (err) {
 console.error("Unexpected error:", err);
 api.sendMessage("Something went wrong. Please try again.", event.threadID, event.messageID);
 }
};