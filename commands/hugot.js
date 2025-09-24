/*
* @param
* @Author?
* Just a simple command without a styler
* Converted structure nvm 
*/

const axios = require("axios");

module.exports.config = {
 name: "hugot",
 role: 0,
 hasPrefix: false,
 aliases: ["sawi","lovelines"],
 description: "Get a random hugot line with a keyword.",
 usage: "hugot <keyword>",
 credits: "Aljur pogoy", // Converted structure 
 cooldown: 3,
};

module.exports.run = async function ({ api, event, args }) {
 const keyword = args.join(" ").trim();
 const senderID = event.senderID;
 const threadID = event.threadID;
 const messageID = event.messageID;

 if (!keyword) {
 return api.sendMessage("Please provide a keyword.\n\nExample: hugot love", threadID, messageID);
 }

 api.sendMessage(`Generating hugot about "${keyword}"...`, threadID, async (err, info) => {
 if (err) return;

 try {
 const res = await axios.get(`https://urangkapolka.vercel.app/api/hugot?keyword=${encodeURIComponent(keyword)}`);
 const quote = res.data?.hugot || "No hugot found.";

 api.getUserInfo(senderID, (err, userInfo) => {
 const userName = userInfo?.[senderID]?.name || "Unknown User";
 const timePH = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });

 const replyMessage = `HUGOT LINE\n----------------------\n${quote}\n----------------------\nTopic: ${keyword}\nBy: ${userName}\nTime: ${timePH}`;
 api.editMessage(replyMessage, info.messageID);
 });

 } catch (error) {
 console.error("[hugot.js] Error:", error);
 const errMsg = "Error: " + (error.response?.data?.message || error.message || "Unknown error.");
 api.editMessage(errMsg, info.messageID);
 }
 });
};