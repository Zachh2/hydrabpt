const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports.config = {
    name: "tiktok",
    version: "1.3.1",
    hasPermssion: 0,
    credits: "Jonell Hutchin Magallanes",
    description: "Search and download TikTok videos",
    usePrefix: true,
    commandCategory: "media",
    usages: "tiktok [search query]",
    cooldowns: 5,
    dependencies: {
        "axios": "",
        "fs-extra": ""
    }
};

module.exports.run = async function ({ api, event, args }) {
    const query = args.join(" ");
    if (!query) return api.sendMessage("Please provide a search query.", event.threadID, event.messageID);

    try {
        api.setMessageReaction("⏳", event.messageID, () => {}, true);

      
        const searchUrl = `https://ccprojectsapis.zetsu.xyz/api/tiktok/searchvideo?keywords=${encodeURIComponent(query)}`;
        const searchResponse = await axios.get(searchUrl);

        if (searchResponse.data.code !== 0 || !searchResponse.data.data?.videos?.length) {
            api.setMessageReaction("❌", event.messageID, () => {}, true);
            return api.sendMessage("❌ No results found for your search.", event.threadID, event.messageID);
        }

        const videoData = searchResponse.data.data.videos[0];
        const videoUrl = videoData.play;

        const author = videoData.author?.unique_id || "Unknown";
        const nickname = videoData.author?.nickname || "Unknown";
        const title = videoData.title || "No title";
        const duration = videoData.duration || 0;
        const playCount = videoData.play_count || 0;
        const likes = videoData.digg_count || 0;
        const comments = videoData.comment_count || 0;
        const shares = videoData.share_count || 0;

        const videoResponse = await axios.get(videoUrl, { responseType: "stream" });
        const filePath = path.join(__dirname, "cache", `tiktok_${Date.now()}.mp4`);
        const writer = fs.createWriteStream(filePath);
        videoResponse.data.pipe(writer);

        writer.on("finish", async () => {
            api.setMessageReaction("✅", event.messageID, () => {}, true);

            await api.sendMessage({
                body: `𝗧𝗶𝗸𝗧𝗼𝗸 𝗦𝗲𝗮𝗿𝗰𝗵 𝗩𝗶𝗱𝗲𝗼𝘀\n━━━━━━━━━━━━━━━━━━\n\n` +
                      `👤 𝗔𝘂𝘁𝗵𝗼𝗿: ${author} (${nickname})\n` +
                      `📝 𝗧𝗶𝘁𝗹𝗲: ${title}\n` +
                      `⏱ 𝗗𝘂𝗿𝗮𝘁𝗶𝗼𝗻: ${duration}s\n` +
                      `▶️ 𝗩𝗶𝗲𝘄𝘀: ${playCount}\n` +
                      `❤️ 𝗟𝗶𝗸𝗲𝘀: ${likes}\n` +
                      `💬 𝗖𝗼𝗺𝗺𝗲𝗻𝘁𝘀: ${comments}\n` +
                      `🔄 𝗦𝗵𝗮𝗿𝗲𝘀: ${shares}\n` +
                      `🔍 𝗤𝘂𝗲𝗿𝘆: ${query}`,
                attachment: fs.createReadStream(filePath)
            }, event.threadID, () => fs.unlinkSync(filePath));
        });

        writer.on("error", () => {
            api.setMessageReaction("❌", event.messageID, () => {}, true);
            api.sendMessage("❌ Error saving video file.", event.threadID, event.messageID);
        });

    } catch (err) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
        api.sendMessage("⚠️ Error: " + err.message, event.threadID, event.messageID);
    }
};
