import AuroraBetaStyler from "@aurora/styler";
import axios from "axios";
import fs from "fs";
import path from "path";

const scCommand: ShadowBot.Command = {
  config: {
    name: "sc",
    description: "Search and send a SoundCloud track audio",
    role: 2,
    usage: "/sc <search query>",
    aliases: ["soundcloud"],
    category: "Media 🎵",
  },
  run: async ({ api, event, args }) => {
    const { threadID, messageID } = event;

    if (!args[0]) {
      const usageMessage = AuroraBetaStyler.styleOutput({
        headerText: "❌ SoundCloud Error",
        headerSymbol: "⚠️",
        headerStyle: "bold",
        bodyText: "Please provide a search query.",
        bodyStyle: "sansSerif",
        footerText: "",
      });
      return api.sendMessage(usageMessage, threadID, messageID);
    }

    const query = encodeURIComponent(args.join(" "));
    const apiUrl = `https://betadash-search-download.vercel.app/sc?search=${query}`;

    try {
      const response = await axios.get(apiUrl, {
        responseType: "stream",
        headers: { "Accept": "audio/mpeg" },
      });

      const fileName = `${query.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.mp3`;
      const filePath = path.join(process.cwd(), "cache", fileName);
      if (!fs.existsSync(path.join(process.cwd(), "cache"))) {
        fs.mkdirSync(path.join(process.cwd(), "cache"));
      }
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      const successMessage = AuroraBetaStyler.styleOutput({
        headerText: "🎵 SoundCloud Track",
        headerSymbol: "🔊",
        headerStyle: "bold",
        bodyText: `Found "${args.join(" ")}"!`,
        bodyStyle: "sansSerif",
        footerText: "",
      });

      await api.sendMessage(
        {
          body: successMessage,
          attachment: fs.createReadStream(filePath),
        },
        threadID,
        () => fs.unlinkSync(filePath),
        messageID
      );
    } catch (error) {
      console.error("EROR:", error);

      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "❌ SoundCloud Error",
        headerSymbol: "⚠️",
        headerStyle: "bold",
        bodyText: `Error fetching audio: ${error.message}`,
        bodyStyle: "sansSerif",
        footerText: "",
      });

      api.sendMessage(errorMessage, threadID, messageID);
    }
  },
};

export default scCommand;