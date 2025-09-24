const nsfwCommand: ShadowBot.Command = {
  config: {
    name: "nsfw",
    description: "Enable or disable NSFW commands in this thread",
    role: 3, // only admins/mods
    nsfw: false,
  },
  run: async (context: ShadowBot.CommandContext) => {
    const { api, event, args } = context;
    const { threadID, messageID } = event;

    const current = global.nsfwEnabled.get(threadID) || false;
    if (args[0] && args[0].toLowerCase() === "on") {
      global.nsfwEnabled.set(threadID, true);
      return api.sendMessage("🔞 NSFW commands have been ENABLED for this thread.", threadID, messageID);
    }
    if (args[0] && args[0].toLowerCase() === "off") {
      global.nsfwEnabled.set(threadID, false);
      return api.sendMessage("✅ NSFW commands have been DISABLED for this thread.", threadID, messageID);
    }
    api.sendMessage(`NSFW is currently ${current ? "ENABLED" : "DISABLED"} in this thread.\n\nUse:\n${global.config.Prefix[0]}nsfw on/off`, threadID);
  },
};

export default nsfwCommand;