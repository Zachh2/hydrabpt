module.exports = {

  config: {

    name: "reload",

    description: "Reload all commands without restarting the bot",

    role: 3,

    cooldown: 5,

    aliases: ["refresh", "cmdreload"],

  },

  async run({ api, event, admins }) {

    const { threadID, messageID, senderID } = event;
      
    if  (!admins.includes(senderID)) {

            let errorMessage = `════『 Reload 』════\n\n`;

            errorMessage += `  ┏━━━━━━━┓\n`;

            errorMessage += `  ┃ 『 𝗜𝗡𝗙𝗢 』 Only admins can use this command.\n`;

            errorMessage += `  ┗━━━━━━━┛\n\n`;

            return api.sendMessage(errorMessage, threadID, messageID);

        }

    try {

      global.reloadCommands();
        
     await api.setMessageReaction("🔥", messageID);

      await api.sendMessage("✅ Commands reloaded successfully!", threadID, messageID);

    } catch (error) {

      await api.sendMessage(`❌ Error reloading commands: ${error.message}`, threadID, messageID);

      await api.setMessageReaction("❌", messageID, () => {});

    }

  },

};