import AuroraBetaStyler from "@aurora/styler";
import fs from "fs";
import path from "path";


const prefixCommand: ShadowBot.Command = {
  config: {
    name: "prefix",
    author: "Aljur Pogoy",
    nonPrefix: true,
    description: "Shows the bot's current prefix attach",
    cooldown: 5,
  },
  run: async ({ api, event, prefix }) => {
    const { threadID, messageID } = event;

    const mp4Path = path.join(__dirname, "cache", "zach.gif");

    try {
      if (!fs.existsSync(mp4Path)) {
        const errorMessage = AuroraBetaStyler.styleOutput({
          headerText: "Prefix",
          headerSymbol: "⚠️",
          headerStyle: "italic",
          bodyText: "ERROR.",
          bodyStyle: "sansSerif",
          footerText: "",
        });
        return api.sendMessage(errorMessage, threadID, messageID);
      }

      const successMessage = AuroraBetaStyler.styleOutput({
        headerText: "HYDRA",
        headerSymbol: "🌐",
        headerStyle: "italic",
        bodyText: `> [ ${prefix} ] : 𝙋𝙍𝙀𝙁𝙄𝙓                                                                                                                                             ⁞ ❏. 𝖳𝗁𝖾 𝖼𝗈𝗆𝗆𝖺𝗇𝖽 𝗒𝗈𝗎 𝖺𝗋𝖾 𝗎𝗌𝗂𝗇𝗀 𝖽𝗈𝖾𝗌 𝗇𝗈𝗍 𝖾𝗑𝗂𝗌                                                                                                                           ⁞ ❏. 𝗍𝗒𝗉𝖾 -𝗁𝖾𝗅𝗉 𝗍𝗈 𝗌𝖾𝖾 𝖺𝗅𝗅 𝖺𝗏𝖺𝗂𝗅𝖺𝖻𝗅𝖾 𝖼𝗈𝗆𝗆𝖺𝗇𝖽𝗌.`,
        bodyStyle: "sansSerif",
        footerText: "",
      });

      await api.sendMessage(
        {
          body: successMessage,
          attachment: fs.createReadStream(mp4Path),
        },
        threadID,
        messageID
      );
    } catch (error) {
      console.error("Error sending prefix with MP4:", error);

      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "Prefix",
        headerSymbol: "❌",
        headerStyle: "double_struck",
        bodyText: "Failed to display the prefix. Mission failed.",
        bodyStyle: "sansSerif",
        footerText: "",
      });

      api.sendMessage(errorMessage, threadID, messageID);
    }
  },
};

export default prefixCommand;