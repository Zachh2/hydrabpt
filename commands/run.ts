import AuroraBetaStyler from "@aurora/styler";


const runCommand: ShadowBot.Command = {
  config: {
    name: "run",
    description: "Run bot scripts (moderator only). Reply to a message with code or use /run <script>.",
    usage: "${prefix}run <kod>",
    aliases: ["ebal", "execute", "exec"],
    role: 3,
    category: "Developer 🛠️",
  },
  run: async ({ api, event, args }) => {
    const { threadID, messageID, senderID } = event;
    let code = args.join(" ").trim();

    if (event.messageReply && event.messageReply.body) {
      code = event.messageReply.body.trim();
    }

    if (!code) {
      const usageMessage = AuroraBetaStyler.styleOutput({
        headerText: "Run Command",
        headerSymbol: "📌",
        headerStyle: "bold",
        bodyText: "Please provide JavaScript code.",
        bodyStyle: "bold",
        footerText: "Credits: **Aljur Pogoy** | **Jimmuel Revira**",
      });
      await api.sendMessage(usageMessage, threadID, messageID);
      return;
    }

    try {
      
      const context = { api, event, global: global.Kagenou };
      const result = await eval(`(async () => { ${code} })()`);
      const output = result !== undefined ? JSON.stringify(result, null, 2) : "No output";

      const successMessage = AuroraBetaStyler.styleOutput({
        headerText: "Run Command",
        headerSymbol: "✅",
        headerStyle: "bold",
        bodyText: `Result:\n${output}`,
        bodyStyle: "bold",
        footerText: "Credits: **Aljur Pogoy** | **Jimmuel Revira**",
      });
      await api.sendMessage(successMessage, threadID, messageID);
    } catch (err) {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "Run Command",
        headerSymbol: "❌",
        headerStyle: "bold",
        bodyText: `Error:\n${err instanceof Error ? err.message : String(err)}`,
        bodyStyle: "bold",
        footerText: "Credits: **Aljur Pogoy** | **Jimmuel Revira**",
      });
      await api.sendMessage(errorMessage, threadID, messageID);
     }
  },
};

export default runCommand;