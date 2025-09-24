import AuroraBetaStyler from "@aurora/styler";

const reloadCommand: ShadowBot.Command = {
  config: {
    name: "reload",
    description: "Reload all commands without restarting the bot",
    role: 3,
    cooldown: 5,
    aliases: ["r", "cmdreload"],
  },
  run: async ({ api, event }) => {
    const { threadID, messageID, senderID } = event;
    try {
      global.reloadCommands();

      await api.setMessageReaction("🔥", messageID, (err: Error | null) => {
        if (err) console.error("Reaction error:", err);
      });

      const successMessage = AuroraBetaStyler.styleOutput({
        headerText: "Reload",
        headerSymbol: "✅",
        headerStyle: "bold",
        bodyText: "Commands reloaded successfully!",
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(successMessage, threadID, messageID);
    } catch (error) {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "Reload",
        headerSymbol: "❌",
        headerStyle: "bold",
        bodyText: `Error reloading commands: ${error.message}`,
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(errorMessage, threadID, messageID);

      await api.setMessageReaction("❌", messageID, (err: Error | null) => {
        if (err) console.error("Reaction error:", err);
      });
    }
  },
};

export default reloadCommand;