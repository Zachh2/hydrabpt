const axios = require("axios");
const fs = require("fs");
const path = require("path");

// ✅ Universal _dirname fix
const _dirname = path.resolve();

module.exports.config = {
 name: "faceswap",
 version: "2.3.0",
 permission: 0,
 credits: "churchill + fixed by zzach",
 description: "Swap faces of two images using kaiz-apis v2",
 prefix: false,
 premium: false,
 category: "without prefix",
 usages: "",
 cooldowns: 3,
};

const APIKEY = "711a6346-5a94-4ce0-87fd-013ae3f0238d";

module.exports.run = async function ({ api, event }) {
 if (
 !event.messageReply ||
 !event.messageReply.attachments ||
 event.messageReply.attachments.length < 2
 ) {
 return api.sendMessage(
 '⚠️ Please reply to a message containing **two image attachments** with "faceswap".',
 event.threadID,
 event.messageID
 );
 }

 const attachments = event.messageReply.attachments.filter(
 (att) => att.type === "photo"
 );
 if (attachments.length < 2) {
 return api.sendMessage(
 "⚠️ Both attachments must be valid images.",
 event.threadID,
 event.messageID
 );
 }

 const targetUrl = attachments[0].url;
 const sourceUrl = attachments[1].url;

 const apiUrl = `https://kaiz-apis.gleeze.com/api/faceswap-v2?targetUrl=${encodeURIComponent(
 targetUrl
 )}&sourceUrl=${encodeURIComponent(sourceUrl)}&apikey=${APIKEY}`;
 console.log("Faceswap API URL:", apiUrl);

 api.sendMessage("🔄 Swapping faces... Please wait.", event.threadID, event.messageID);

 try {
 const response = await axios.get(apiUrl, { responseType: "stream" });

 const cacheDir = path.join(_dirname, "cache");
 if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

 const filePath = path.join(cacheDir, `faceswap${Date.now()}.jpg`);
 const writer = fs.createWriteStream(filePath);
 response.data.pipe(writer);

 writer.on("finish", async () => {
 await api.sendMessage(
 {
 body: "✅ Here is the face-swapped image:",
 attachment: fs.createReadStream(filePath),
 },
 event.threadID,
 event.messageID
 );

 fs.unlinkSync(filePath);
 });

 writer.on("error", (err) => {
 console.error("Write error:", err);
 api.sendMessage(
 "❌ Failed to save faceswap image.",
 event.threadID,
 event.messageID
 );
 });
 } catch (error) {
 console.error(
 "Faceswap error:",
 error.response ? error.response.data : error.message
 );
 api.sendMessage(
 "❌ Faceswap failed. The API may be down or the images are invalid.",
 event.threadID,
 event.messageID
 );
 }
};