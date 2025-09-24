const path = require("path");

const AuroraBetaStyler = require(path.join(__dirname, "..", "core", "plugins", "aurora-beta-styler"));

module.exports = {

  name: "threadlist",

  description: "Display the current threads of the bot",

  author: "Aljur Pogoy",

  role: 3,

  async run({ api, event, admins }) {

    const { threadID, messageID, senderID } = event;

    if (!admins.includes(senderID)) {

      const errorMessage = AuroraBetaStyler.styleOutput({

        headerText: "Access Denied",

        headerSymbol: "❌",

        headerStyle: "bold",

        bodyText: "Only admins can view the thread list.",

        bodyStyle: "bold",

        footerText: "",

      });

      await api.sendMessage(errorMessage, threadID, messageID);

      return;

    }

    try {

      const threadList = await api.getThreadList(100, null, ["INBOX"]);

      const threads = threadList.filter(thread => thread.isGroup && thread.name !== thread.threadID && thread.threadID !== event.threadID);

      if (threads.length === 0) {

        const noThreadsMessage = AuroraBetaStyler.styleOutput({

          headerText: "Thread List",

          headerSymbol: "📋",

          headerStyle: "bold",

          bodyText: "No active group threads found.",

          bodyStyle: "bold",

          footerText: "",

        });

        await api.sendMessage(noThreadsMessage, threadID, messageID);

        return;

      }

      const bodyText = [

        "Active Threads:",

        ...threads.map(thread => `  - ${thread.name || thread.threadID} (ID: ${thread.threadID})`),

      ].join("\n");

      const styledMessage = AuroraBetaStyler.styleOutput({

        headerText: "Thread List",

        headerSymbol: "📋",

        headerStyle: "bold",

        bodyText,

        bodyStyle: "bold",

        footerText: "Powered by: **Aljur pogoy**",

      });

      await api.sendMessage(styledMessage, threadID, messageID);

    } catch (error) {

      console.error("Error fetching thread list:", error);

      const errorMessage = AuroraBetaStyler.styleOutput({

        headerText: "Error",

        headerSymbol: "❌",

        headerStyle: "bold",

        bodyText: "Failed to fetch thread list. Check bot permissions or session.",

        bodyStyle: "bold",

        footerText: "",

      });

      await api.sendMessage(errorMessage, threadID, messageID);

      await api.setMessageReaction("❌", messageID, () => {});

    }

  },

};