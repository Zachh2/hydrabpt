const { format, UNIRedux } = require("cassidy-styler");

const fs = require("fs-extra");

const path = require("path");

const statsFile = path.join(__dirname, "../database/stats.json");

module.exports = {

  name: "stats",

  author: "Aljur Pogoy",

  version: "3.0.0",

  description: "Show bot statistics (Admin only). Usage: #stats",

  async run({ api, event, args, admins }) {

    const { threadID, messageID, senderID } = event;

    // Check if the user is an admin

    if (!admins.includes(senderID)) {

      return api.sendMessage(

        `════『 𝗦𝗧𝗔𝗧𝗦 』════\n\n❌ Only admins can use this command.\n\n> Thank you for using our Chatbot`,

        threadID,

        messageID

      );

    }

    // Load or initialize stats

    let statsData = {};

    try {

      if (!fs.existsSync(statsFile)) {

        fs.writeFileSync(statsFile, JSON.stringify({ messagesHandled: 0, activeThreads: 0 }, null, 2));

      }

      statsData = JSON.parse(fs.readFileSync(statsFile, "utf8"));

    } catch {

      statsData = { messagesHandled: 0, activeThreads: 0 };

    }

    // Update active threads

    try {

      const threadList = await api.getThreadList(100, null, ["INBOX"]);

      statsData.activeThreads = threadList.length;

      fs.writeFileSync(statsFile, JSON.stringify(statsData, null, 2));

    } catch (error) {

      console.error("Error updating thread count:", error.message);

    }

    return api.sendMessage(

      `════『 𝗦𝗧𝗔𝗧𝗦 』════\n\n📊 Total messages handled: ${statsData.messagesHandled}\n📊 Active threads: ${statsData.activeThreads}\n\n> Thank you for using our Chatbot`,

      threadID,

      messageID

    );

  },

};