const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const yts = require("yt-search");

module.exports.config = {
 name: "music",
 version: "1.1.0",
 hasPermssion: 0,
 description: "Play and download YouTube music",
 usePrefix: true,
 hide: false,
 commandCategory: "Music",
 usages: "<song name>",
 cooldowns: 5,
 credits: "Jonell Magallanes"
};

module.exports.run = async ({ api, event, args }) => {
 try {
 const query = args.join(" ");
 if (!query) {
 return api.sendMessage("❌ Please provide a song name to search.", event.threadID, event.messageID);
 }

 const search = await yts(query);
 if (!search.videos.length) {
 return api.sendMessage("❌ No results found.", event.threadID, event.messageID);
 }

 const video = search.videos[0];
 const url = video.url;

 api.setMessageReaction("⏳", event.messageID, () => {}, true);

 // Call API to get download link
 const apiUrl = `https://ccproject.serv00.net/ytdl2.php?url=${encodeURIComponent(url)}`;
 const res = await axios.get(apiUrl);

 if (!res.data || !res.data.download) {
 throw new Error("Invalid API response (no download link).");
 }

 const { title, download } = res.data;

 // Ensure cache folder exists
 const cacheDir = path.join(process.cwd(), "cache");
 await fs.ensureDir(cacheDir);

 const filePath = path.join(cacheDir, `${Date.now()}.mp3`);
 const writer = fs.createWriteStream(filePath);

 const response = await axios.get(download, { responseType: "stream" });
 response.data.pipe(writer);

 writer.on("finish", () => {
 api.sendMessage(
 {
 body: `🎶 𝗠𝘂𝘀𝗶𝗰 𝗣𝗹𝗮𝘆𝗲𝗿 𝗬𝗼𝘂𝗧𝘂𝗯𝗲\n━━━━━━━━━━━━━━━━━━\n` +
 `🎵 Title: ${video.title}\n👤 Author: ${video.author.name}\n⏱️ Duration: ${video.timestamp}\n🔗 YouTube: ${video.url}\n⬇️ Download: ${download}`,
 attachment: fs.createReadStream(filePath)
 },
 event.threadID,
 () => {
 api.setMessageReaction("✅", event.messageID, () => {}, true);
 fs.unlinkSync(filePath);
 }
 );
 });

 writer.on("error", () => {
 api.sendMessage("❌ Failed to process the music file.", event.threadID, event.messageID);
 });

 } catch (err) {
 api.sendMessage("❌ Error: Unable to fetch music.\n\n" + err.message, event.threadID, event.messageID);
 }
};