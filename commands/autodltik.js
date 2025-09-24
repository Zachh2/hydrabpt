const AuroraBetaStyler = require('@aurora/styler');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "autodltik",
    description: "Automatically dl sir",
    category: "Media 📹",
    role: 0,
    nonPrefix: true,
  },
  handleEvent: async ({ api, event }) => {
    const { threadID, messageID, body } = event;
    const styledMessage = (header, body, symbol) =>
      AuroraBetaStyler.styleOutput({
        headerText: header,
        headerSymbol: symbol,
        headerStyle: "bold",
        bodyText: body,
        bodyStyle: "bold",
        footerText: "",
      });
    const tiktokUrlRegex = /(https?:\/\/(www\.)?(tiktok|vm\.tiktok|vt\.tiktok)\.com\/[^\s]+)/i;
    const urlMatch = body && typeof body === 'string' ? body.match(tiktokUrlRegex) : null;
    if (!urlMatch) return;
    const tiktokUrl = urlMatch[0];
    try {
      const response = await axios.get(`https://tikwm.com/api/?url=${encodeURIComponent(tiktokUrl)}`);
      const data = response.data;
      if (data.code !== 0 || !data.data || !data.data.play) {
        await api.sendMessage(
          styledMessage("TikTok Downloader", "Failed to download the TikTok video. Invalid link or API error.", "❌"),
          threadID,
          messageID
        );
        return;
      }
      const videoUrl = data.data.play;
      const videoResponse = await axios({
        method: 'get',
        url: videoUrl,
        responseType: 'stream',
      });
      const tempFilePath = path.join(__dirname, 'temp', `tiktok_${Date.now()}.mp4`);
      fs.mkdirSync(path.dirname(tempFilePath), { recursive: true });
      const writer = fs.createWriteStream(tempFilePath);
      videoResponse.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
      await api.sendMessage(
        {
          body: styledMessage("TikTok Downloader", "Downloaded TikTok video successfully!", "📹"),
          attachment: fs.createReadStream(tempFilePath),
        },
        threadID,
        (err) => {
          fs.unlink(tempFilePath, () => {});
          if (err) {
            console.error("Error sending TikTok video:", err);
            api.sendMessage(
              styledMessage("TikTok Downloader", "Error sending the video.", "❌"),
              threadID,
              messageID
            );
          }
        },
        messageID
      );
    } catch (error) {
      console.error("Error downloading TikTok video:", error);
      await api.sendMessage(
        styledMessage("TikTok Downloader", "Failed to download the TikTok video. Please try again later.", "❌"),
        threadID,
        messageID
      );
    }
  },
};