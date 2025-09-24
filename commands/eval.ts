import util from "util";

const evalCommand: ShadowBot.Command = {
  config: {
    name: "eval",
    aliases: ["ev"],
    description: "Evaluate JavaScript/TypeScript code",
    cooldown: 0,
    role: 3, // only bot owner/admin
  },

  run: async (context: ShadowBot.CommandContext) => {
    const { api, event, args } = context;
    const { threadID, messageID, senderID } = event;


    const input = args.join(" ");
    if (!input) {
      return api.sendMessage("⚠️ Please provide code to evaluate.", threadID, messageID);
    }

    try {
      let result = await eval(`(async () => { ${input} })()`);
      if (typeof result !== "string") {
        result = util.inspect(result, { depth: 1 });
      }

      api.sendMessage(
        {
          body: `${result}`,
        },
        threadID,
        messageID
      );
    } catch (error: any) {
      api.sendMessage(
        {
          body: `❌ Eval Error:\n\`\`\`\n${error.message}\n\`\`\``,
        },
        threadID,
        messageID
      );
    }
  },
};

export default evalCommand;