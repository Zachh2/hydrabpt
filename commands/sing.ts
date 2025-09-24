import AuroraBetaStyler from "../core/plugins/aurora-beta-styler";
import * as fs from "fs";
import * as path from "path";
import axios from "axios";
import fetch from "node-fetch";
import ytSearch from "yt-search";

namespace ShadowBot {
  export interface Command {
    config: {
      name: string;
      author: string;
      description: string;
      usage: string;
      aliases?: string[];
      category?: string;
    };
    run: (context: { api: any; event: any; args: string[]; db?: { db: (collectionName: string) => any } | null }) => Promise<void>;
  }
}

const singCommand: ShadowBot.Command = {
  config: {
    name: "sing",
    author: "Aljur pogoy",
    description: "Sing or play a song based on the provided name.",
    usage: "sing <song name> (e.g., /sing Shape of You)",
    aliases: ["music", "song"],
    category: "MUSIC",
  },
  run: async ({ api, event, args }) => {
    const { threadID, messageID } = event;
    const songName = args.join(" ");
    const type = "audio";

    if (!songName) {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "Sing",
        headerSymbol: "🚫",
        headerStyle: "bold",
        bodyText: "Please provide a song name (e.g. `sing Shape of You`).",
        bodyStyle: "bold",
        footerText: ": **powered by chatbot(hydra)**",
      });
      await api.sendMessage(errorMessage, threadID, messageID);
      return;
    }

    api.setMessageReaction("⌛", messageID, () => {}, true);

    try {
      const searchResults = await ytSearch(songName);
      if (!searchResults?.videos?.length) throw new Error("No results found.");

      const top = searchResults.videos[0];
      const apiUrl = `https://www-xyz-free.vercel.app/powered by chatbot(hydra)/youtube?id=${top.videoId}&type=${type}&apikey=itzpowered by chatbot(hydra)`;
      const downloadRes = await axios.get(apiUrl);

      if (!downloadRes.data?.downloadUrl) throw new Error("No downloadUrl received.");

      const dlUrl = downloadRes.data.downloadUrl;
      const res = await fetch(dlUrl);

      if (!res.ok) throw new Error(`Download failed (status: ${res.status}).`);

      const fileBuffer = await res.buffer();
      const fileExt = type === "audio" ? "mp3" : "mp4";
      const fileName = `${top.title}.${fileExt}`.replace(/[\\/:"*?<>|]+/g, "");
      const filePath = path.join(__dirname, fileName);

      fs.writeFileSync(filePath, fileBuffer);
      api.setMessageReaction("✅", messageID, () => {}, true);

      await api.sendMessage(
        {
          attachment: fs.createReadStream(filePath),
          body: `🎵 MUSIC\n━━━━━━━━━━━━━━━\n\n${top.title}`,
        },
        threadID,
        () => fs.unlinkSync(filePath),
        messageID
      );
    } catch (err) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "Sing",
        headerSymbol: "❌",
        headerStyle: "bold",
        bodyText: `An error occurred: ${err.message || "Unknown error"}`,
        bodyStyle: "bold",
        footerText: ": **powered by chatbot(hydra)**",
      });
      await api.sendMessage(errorMessage, threadID, messageID);
    }
  },
};

export default singCommand;