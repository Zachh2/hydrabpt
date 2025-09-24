const AuroraBetaStyler = require('@aurora/styler');

const modsCmdsCommand = {
  config: {
    name: "mods-cmds",
    description: "Displays command names and roles for moderators.",
    usage: "/mods-cmds",
    aliases: ["modcommands", "mc"],
    category: "Moderation 🔧",
    role: 2,
  },
  run: async ({ api, event }) => {
    const { threadID, messageID, senderID } = event;
    const styledMessage = (header, body, symbol) =>
      AuroraBetaStyler.styleOutput({
        headerText: header,
        headerSymbol: symbol,
        headerStyle: "bold",
        bodyText: body,
        bodyStyle: "bold",
        footerText: "Only for **Moderators Commands**",
      });
    const getUserRole = (uid) => {
      uid = String(uid);
      if (!global.config || !global.config.developers || !global.config.moderators || !global.config.admins) {
        return 0;
      }
      const developers = global.config.developers.map(String);
      const moderators = global.config.moderators.map(String);
      const admins = global.config.admins.map(String);
      if (developers.includes(uid)) return 3;
      if (moderators.includes(uid)) return 2;
      if (admins.includes(uid)) return 1;
      return 0;
    };
    const userRole = getUserRole(senderID);
    if (userRole < 2) {
      await api.sendMessage(
        styledMessage("Moderator Commands", "Only Moderators or higher can use this command.", "🛑"),
        threadID,
        messageID
      );
      return;
    }
    const modCommands = [];
    const seenCommands = new Set();
    for (const command of global.commands.values()) {
      if (!command) continue;
      const cmdName = command.config?.name || command.name;
      if (!cmdName || seenCommands.has(cmdName)) continue;
      const commandRole = command.config?.role ?? command.role ?? 0;
      if (commandRole === 2) {
        modCommands.push({ name: cmdName, role: commandRole });
        seenCommands.add(cmdName);
      }
    }
    const commandList = modCommands
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(cmd => `${cmd.name} - ${cmd.role}`)
      .join("\n");
    await api.sendMessage(
      styledMessage(
        "Moderator Commands",
        commandList || "No moderator commands available.",
        "🔧"
      ),
      threadID,
      messageID
    );
  },
};

module.exports = modsCmdsCommand;