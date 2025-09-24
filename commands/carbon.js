const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
 name: "carbon",
 version: "1.0.0",
 role: 0,
 credits: "Rized", // Your name or preferred credit
 description: "Generate a carbon-style code image",
 hasPrefix: true,
 aliases: [],
 usage: "[carbon <text>]",
 cooldown: 5
};

module.exports.run = async function({ api, event, args }) {
 const { threadID, messageID } = event;
 const text = args.join(" ");

 if (!text) {
 return api.sendMessage("❌ Usage: carbon <your text here>", threadID, messageID);
 }

 const encodedText = encodeURIComponent(text);
 const apiUrl = `https://api.ferdev.my.id/maker/carbon?text=${encodedText}&apikey=lain-lain`;
 const imagePath = path.join(__dirname, "cache", `carbon_${Date.now()}.png`);

 try {
 api.sendMessage("⌛ Generating carbon image, please wait...", threadID, messageID);

 const response = await axios({
 method: 'GET',
 url: apiUrl,
 responseType: 'stream',
 headers: {
 "Content-Type": "image/png"
 }
 });

 fs.ensureDirSync(path.dirname(imagePath));
 const writer = fs.createWriteStream(imagePath);
 response.data.pipe(writer);

 writer.on('finish', () => {
 api.sendMessage({
 attachment: fs.createReadStream(imagePath)
 }, threadID, () => fs.unlinkSync(imagePath), messageID);
 });

 writer.on('error', (err) => {
 console.error("Stream error:", err);
 api.sendMessage("❌ Failed to write the image file.", threadID, messageID);
 });

 } catch (error) {
 console.error("API error:", error);
 api.sendMessage("❌ Failed to generate carbon image.", threadID, messageID);
 }
};