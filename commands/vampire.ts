import axios from "axios";
import fs from "fs-extra";
import path from "path";
import AuroraBetaStyler from "@aurora/styler";

module.exports = {
  config: {
    name: "vampire",
    version: "2.0.0",
    author: "Aljur Pogoy",
  },
  run: async ({ api, event }) => {
    const { threadID, messageID, messageReply } = event;

    const waitingMessage = AuroraBetaStyler.styleOutput({
      headerText: "Vampire",
      headerSymbol: "🧛",
      headerStyle: "bold",
      bodyText: "Please wait...",
      bodyStyle: "sansSerif",
      footerText: "",
    });

    const waitMsg = await new Promise<{ messageID: string }>((resolve) => {
      api.sendMessage(waitingMessage, threadID, (err, info) => resolve(info), messageID);
    });

    if (
      !messageReply ||
      !messageReply.attachments ||
      messageReply.attachments.length === 0 ||
      messageReply.attachments[0].type !== "photo"
    ) {
      api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: "Vampire",
          headerSymbol: "🧛",
          headerStyle: "bold",
          bodyText: "🖼 Please reply to an image to transform it into vampire style.",
          bodyStyle: "sansSerif",
          footerText: "",
        }),
        threadID,
        () => api.unsendMessage(waitMsg.messageID),
        messageID
      );
      return;
    }

    const imageUrl = encodeURIComponent(messageReply.attachments[0].url);
    const apiUrl = `https://kaiz-apis.gleeze.com/api/vampire?imageUrl=${imageUrl}&apikey=0ff49fce-1537-4798-9d90-69db487be671`;

    try {
      const res = await axios.get(apiUrl, { responseType: "arraybuffer" });

      const outputPath = path.join(__dirname, "cache", `vampire_${Date.now()}.jpg`);
      await fs.ensureDir(path.join(__dirname, "cache"));
      fs.writeFileSync(outputPath, Buffer.from(res.data, "binary"));

      const styledMessage = AuroraBetaStyler.styleOutput({
        headerText: "Vampire",
        headerSymbol: "🧛",
        headerStyle: "bold",
        bodyText: "🧛 Here's your vampire transformation!",
        bodyStyle: "sansSerif",
        footerText: "",
      });

      api.sendMessage(
        {
          body: styledMessage,
          attachment: fs.createReadStream(outputPath),
        },
        threadID,
        () => {
          fs.unlinkSync(outputPath);
          api.unsendMessage(waitMsg.messageID);
        },
        messageID
      );
    } catch (err) {
      api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: "Vampire",
          headerSymbol: "🧛",
          headerStyle: "bold",
          bodyText: "🚫 Error: Couldn't fetch vampire image. Try again later.",
          bodyStyle: "sansSerif",
          footerText: "",
        }),
        threadID,
        () => api.unsendMessage(waitMsg.messageID),
        messageID
      );
      console.error("[vampire.ts] API Error:", err.message || err);
    }
  },
};