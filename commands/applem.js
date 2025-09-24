const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

module.exports.config = {
 name: "applem",
 version: "1.2.0",
 hasPermssion: 0,
 description: "Search and play Apple Music tracks (preview)",
 usePrefix: true,
 hide: false,
 commandCategory: "Music",
 usages: "<song name>",
 cooldowns: 5,
 credits: " zzach"
};

module.exports.run = async ({ api, event, args }) => {
 try {
 const query = args.join(" ");
 if (!query) {
 return api.sendMessage(
 "❌ Please provide a song name to search.",
 event.threadID,
 event.messageID
 );
 }

 api.setMessageReaction("⏳", event.messageID, () => {}, true);

 // 🔍 Call Apple Music API
 const apiUrl = `https://kaiz-apis.gleeze.com/api/apple-music?search=${encodeURIComponent(
 query
 )}&apikey=711a6346-5a94-4ce0-87fd-013ae3f0238d`;

 const res = await axios.get(apiUrl);
 if (!res.data || !res.data.response || res.data.response.length === 0) {
 throw new Error("No results found.");
 }

 const song = res.data.response[0]; // First result only
 const {
 url,
 title,
 artist,
 album,
 releaseDate,
 duration,
 thumbnail,
 previewMp3,
 } = song;

 // 📂 Prepare cache folder
 const cacheDir = path.join(process.cwd(), "cache");
 await fs.ensureDir(cacheDir);

 // 🖼️ Download thumbnail
 const thumbPath = path.join(cacheDir, `${Date.now()}_cover.jpg`);
 const thumbRes = await axios.get(thumbnail, { responseType: "arraybuffer" });
 fs.writeFileSync(thumbPath, Buffer.from(thumbRes.data, "binary"));

 // 🎵 Download preview audio
 const filePath = path.join(cacheDir, `${Date.now()}_preview.mp3`);
 const audioStream = await axios.get(previewMp3, { responseType: "arraybuffer" });
 fs.writeFileSync(filePath, Buffer.from(audioStream.data, "binary"));

 // ✅ First send info + cover art
 await api.sendMessage(
 {
 body:
 `🍏 𝗔𝗽𝗽𝗹𝗲 𝗠𝘂𝘀𝗶𝗰\n━━━━━━━━━━━━━━━━━━\n` +
 `🎵 Title: ${title}\n` +
 `👤 Artist: ${artist}\n` +
 `💽 Album: ${album}\n` +
 `📅 Release: ${releaseDate}\n` +
 `⏱️ Duration: ${duration}\n` +
 `🔗 Apple Music: ${url}`,
 attachment: fs.createReadStream(thumbPath),
 },
 event.threadID
 );

 // ✅ Then send audio separately
 await api.sendMessage(
 {
 body: "🎶 Preview Audio:",
 attachment: fs.createReadStream(filePath),
 },
 event.threadID,
 () => {
 api.setMessageReaction("✅", event.messageID, () => {}, true);
 fs.unlinkSync(filePath);
 fs.unlinkSync(thumbPath);
 }
 );
 } catch (err) {
 api.sendMessage(
 "❌ Error: Unable to fetch Apple Music.\n\n" + err.message,
 event.threadID,
 event.messageID
 );
 }
};