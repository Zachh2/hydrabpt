import axios from "axios";
import fs from "fs-extra";
import path from "path";
import AuroraBetaStyler from "@aurora/styler";

const SEARCH_URL = "https://kaiz-apis.gleeze.com/api/ytsearch";
const DOWNLOAD_URL = "https://kaiz-apis.gleeze.com/api/ytmp3-v2";
const API_KEY = "b5e85d38-1ccc-4aeb-84fd-a56a08e8361a";

module.exports = {
  config: {
    name: "ytmusic",
    version: "8.0.0",
    role: 0,
    author: "Aljur Pogoy",
  },
  run: async ({ api, event, args }) => {
    const songName = args.join(" ");
    const { threadID, messageID } = event;

    const waitingMessage = AuroraBetaStyler.styleOutput({
      headerText: "YouTube Music",
      headerSymbol: "🎧",
      headerStyle: "bold",
      bodyText: "Searching for you, please wait...",
      bodyStyle: "sansSerif",
      footerText: "",
    });

    const waitMsg = await new Promise<{ messageID: string }>((resolve) => {
      api.sendMessage(waitingMessage, threadID, (err, info) => resolve(info), messageID);
    });

    if (!songName) {
      api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: "YouTube Music",
          headerSymbol: "🎧",
          headerStyle: "bold",
          bodyText: "❗ Please provide the title of the song.",
          bodyStyle: "sansSerif",
          footerText: "",
        }),
        threadID,
        () => api.unsendMessage(waitMsg.messageID),
        messageID
      );
      return;
    }

    try {
      const searchRes = await axios.get(SEARCH_URL, {
        params: { q: songName, apikey: API_KEY },
      });

      const item = searchRes.data?.items?.[0];
      if (!item) {
        api.sendMessage(
          AuroraBetaStyler.styleOutput({
            headerText: "YouTube Music",
            headerSymbol: "🎧",
            headerStyle: "bold",
            bodyText: "❌ No song found.",
            bodyStyle: "sansSerif",
            footerText: "",
          }),
          threadID,
          () => api.unsendMessage(waitMsg.messageID),
          messageID
        );
        return;
      }

      const { title, thumbnail, url, duration } = item;

      const downloadRes = await axios.get(DOWNLOAD_URL, {
        params: { url, apikey: API_KEY },
      });

      const { download_url, quality } = downloadRes.data;

      if (!download_url) {
        api.sendMessage(
          AuroraBetaStyler.styleOutput({
            headerText: "YouTube Music",
            headerSymbol: "🎧",
            headerStyle: "bold",
            bodyText: "❌ Failed to fetch MP3 download link.",
            bodyStyle: "sansSerif",
            footerText: "",
          }),
          threadID,
          () => api.unsendMessage(waitMsg.messageID),
          messageID
        );
        return;
      }

      const fileName = `${Date.now()}_ytmusic.mp3`;
      const filePath = path.join(__dirname, "cache", fileName);
      await fs.ensureDir(path.join(__dirname, "cache"));

      const downloadStream = await axios({
        method: "GET",
        url: download_url,
        responseType: "stream",
      });

      const writer = fs.createWriteStream(filePath);
      downloadStream.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      const styledMessage = AuroraBetaStyler.styleOutput({
        headerText: "YouTube Music",
        headerSymbol: "🎧",
        headerStyle: "bold",
        bodyText: `🎧 ${title}\nDuration: ${duration} | Quality: ${quality}`,
        bodyStyle: "sansSerif",
        footerText: "",
      });

      api.sendMessage(
        {
          body: styledMessage,
          attachment: fs.createReadStream(filePath),
        },
        threadID,
        () => {
          fs.unlinkSync(filePath);
          api.unsendMessage(waitMsg.messageID);
        },
        messageID
      );
    } catch (err) {
      api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: "YouTube Music",
          headerSymbol: "🎧",
          headerStyle: "bold",
          bodyText: "❌ An error occurred while processing your request.",
          bodyStyle: "sansSerif",
          footerText: "",
        }),
        threadID,
        () => api.unsendMessage(waitMsg.messageID),
        messageID
      );
      console.error("YouTube music error:", err.message);
    }
  },
};
