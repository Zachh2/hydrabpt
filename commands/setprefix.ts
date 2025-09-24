
const setprefixCommand: ShadowBot.Command = {
  config: {
    name: "setprefix",
    aliases: ["changeprefix"],
    description: "Change the prefix for this thread",
    usage: "setprefix <newPrefix>",
    cooldown: 3,
    role: 2,
    author: "ShadowBot Team",
  },

  run: async (context: ShadowBot.CommandContext) => {
    const { api, event, args } = context;
    const threadID = event.threadID;
    const senderID = event.senderID;

    const newPrefix = args[0];
    if (!newPrefix) {
      return api.sendMessage("⚠️ Please provide a new prefix.\nUsage: setprefix <newPrefix>", threadID);
    }

    if (!global.threadConfigs) global.threadConfigs = new Map();
    global.threadConfigs.set(threadID, { prefix: newPrefix });

    api.sendMessage(`✅ Prefix has been updated to: \`${newPrefix}\``, threadID);
  },
};

export default setprefixCommand;
