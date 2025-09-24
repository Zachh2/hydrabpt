import axios from "axios";
import fs from "fs";
import path from "path";
import AuroraBetaStyler from "@aurora/styler";

module.exports = {
  config: {
    name: "neko",
    description: "Fetches and sends a neko image.",
    role: 0,
    usage: "/neko",
    category: "Fun 🐱",
  },
  run: async ({ api, event }) => {
    const { threadID, messageID } = event;

    const waitingMessage = AuroraBetaStyler.styleOutput({
      headerText: "Neko",
      headerSymbol: "🐱",
      headerStyle: "bold",
      bodyText: "Searching for you, please wait...",
      bodyStyle: "sansSerif",
      footerText: "",
    });

    const waitMsg = await new Promise<{ messageID: string }>((resolve) => {
      api.sendMessage(waitingMessage, threadID, (err, info) => resolve(info), messageID);
    });

    try {
      const response = await axios.get("https://nekos.best/api/v2/neko/f30c1cce-5a43-47f9-ac5c-10a90027348e.png", {
        responseType: "stream",
      });

      const filePath = path.join(__dirname, "neko.png");
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      const stats = fs.statSync(filePath);
      const fileSizeMB = stats.size / (1024 * 1024);

      const styledMessage = AuroraBetaStyler.styleOutput({
        headerText: "Neko",
        headerSymbol: "🐱",
        headerStyle: "bold",
        bodyText: "Here’s your neko image!",
        bodyStyle: "sansSerif",
        footerText: "",
      });

      if (fileSizeMB > 25) {
        api.sendMessage(
          {
            body: `${styledMessage}\n\n⚠️ Image is too large to upload.\nView here: https://nekos.best/api/v2/neko/f30c1cce-5a43-47f9-ac5c-10a90027348e.png`,
          },
          threadID,
          () => {
            fs.unlinkSync(filePath);
            api.unsendMessage(waitMsg.messageID);
          },
          messageID
        );
      } else {
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
      api.sendMessage(
        "⚠️ Failed to fetch neko image. Please try again later.",
        threadID,
        () => api.unsendMessage(waitMsg.messageID),
        messageID
      );
      console.error("Neko Error:", err);
    }
  },
};