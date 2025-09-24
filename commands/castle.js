// core/aurora_commands/castle.js

// This file defines a JavaScript command for the ShadowBot to display a styled castle message.

const AuroraBetaStyler = require("../core/plugins/aurora-beta-styler.js");

module.exports = {

  name: "castle",

  author: "Aljur pogoy",

  nonPrefix: false,

  description: "Displays a styled castle message",

  async run({ api, event, args }) {

    const { threadID, messageID } = event;

    const content = args.length > 0 ? args.join(" ") : "A castle";

    try {

      const msg = AuroraBetaStyler.format({

        title: "SkyCastle",

        emoji: "🏰",

        titlefont: "bold",

        content: content,

        contentfont: "fancy",

        footer: "",

      });

      await api.sendMessage(msg, threadID, messageID);

    } catch (error) {

      console.error("❌ Error in castle command:", error.message);

      const errMsg = AuroraBetaStyler.format({

        title: "SkyCastle",

        emoji: "🏰",

        titlefont: "bold",

        content: `┏━━━━━━━┓\n┃ Error: ${error.message}\n┗━━━━━━━┛`,

        contentfont: "fancy",

        footer: "",

      });

      await api.sendMessage(errMsg, threadID, messageID);

    }

  },

};