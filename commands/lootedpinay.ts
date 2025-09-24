import axios from "axios";
import fs from "fs";
import path from "path";
import AuroraBetaStyler from "@aurora/styler";

module.exports = {
  config: {
    name: "lootedpinay",
    description: "Fetches and sends a random Looted Pinay video.",
    cooldown: 5,
    nsfw: true,
    usage: "/lootedpinay",
    category: "Entertainment 🎥",
  },
  run: async ({ api, event }) => {
    const { threadID, messageID } = event;

    // Send "please wait" styled message
    const waitingMessage = AuroraBetaStyler.styleOutput({
      headerText: "Looted Pinay",
      headerSymbol: "🎥",
      headerStyle: "bold",
      bodyText: "Searching for you, please wait...",
      bodyStyle: "sansSerif",
      footerText: "",
    });

    // Type-safe promise to capture the waiting message
    const waitMsg = await new Promise<{ messageID: string }>((resolve) => {
      api.sendMessage(waitingMessage, threadID, (err, info) => resolve(info), messageID);
    });

    try {
      // Fetch video metadata
      const response = await axios.get("https://kaiz-apis.gleeze.com/api/lootedpinay", {
        params: {
          limit: 1,
          apikey: "117cafc8-ef3b-4632-bc1c-13b38b912081",
        },
      });

      const { title, mp4url } = response.data.videos[0];

      // Download the video
      const videoResponse = await axios({
        method: "get",
        url: mp4url,
        responseType: "stream",
      });

      const filePath = path.join(__dirname, "lootedpinay.mp4");
      const writer = fs.createWriteStream(filePath);
      videoResponse.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      // Check file size (Messenger limit ~25MB)
      const stats = fs.statSync(filePath);
      const fileSizeMB = stats.size / (1024 * 1024);

      const styledMessage = AuroraBetaStyler.styleOutput({
        headerText: "Looted Pinay",
        headerSymbol: "🎥",
        headerStyle: "bold",
        bodyText: `Title: ${title}`,
        bodyStyle: "sansSerif",
        footerText: "",
      });

      if (fileSizeMB > 25) {
        // File too big → send only the link
        api.sendMessage(
          {
            body: `${styledMessage}\n\n⚠️ File is too large to upload.\nWatch here: ${mp4url}`,
          },
          threadID,
          () => {
            fs.unlinkSync(filePath);
            api.unsendMessage(waitMsg.messageID);
          },
          messageID
        );
      } else {
        // Send normally
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
      }
    } catch (err) {
      // Handle API / video download errors
      api.sendMessage(
        "⚠️ Failed to fetch Looted Pinay video. Please try again later.",
        threadID,
        () => api.unsendMessage(waitMsg.messageID),
        messageID
      );
      console.error("LootedPinay Error:", err);
    }
  },
};