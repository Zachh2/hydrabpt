const axios = require("axios");

module.exports.config = {
 name: "cafe",
 version: "1.2.0",
 permission: 0,
 credits: "zzach",
 description: "Check your cafe stats via API and mention you",
 prefix: true,
 premium: false,
 category: "without prefix",
 usages: "Reply /cafe to get your stats",
 cooldowns: 3
};

module.exports.run = async function({ api, event }) {
 try {
 const userID = event.senderID;
 const apiUrl = `https://betadash-api-swordslush-production.up.railway.app/cafe?userid=${userID}`;

 api.sendMessage("☕ Fetching your cafe data... Please wait.", event.threadID, event.messageID);

 const response = await axios.get(apiUrl);
 const data = response.data;

 // Build the message
 let messageBody = `☕ Cafe Stats for @user:\n`;
 for (let key in data) {
 messageBody += `${key}: ${data[key]}\n`;
 }

 // Automatically calculate where '@user' starts
 const tagText = "@user";
 const fromIndex = messageBody.indexOf(tagText);

 const mentions = [{
 tag: tagText,
 id: userID,
 fromIndex: fromIndex,
 length: tagText.length
 }];

 api.sendMessage({ body: messageBody, mentions }, event.threadID, event.messageID);

 } catch (error) {
 console.error("[cafe] Error:", error.response?.data || error.message);
 api.sendMessage("❌ Failed to fetch cafe data. Please try again later.", event.threadID, event.messageID);
 }
};