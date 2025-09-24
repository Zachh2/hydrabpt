const AuroraBetaStyler = require('@aurora/styler');

const axios = require('axios');

const threadStates = {};

module.exports = {

  config: {

    name: "autobot",

    description: "Processes messages starting with # using the Autobot API with on/off toggle.",

    usage: "/autobot [on|off]",

    category: "Utility 🤖",

    role: 2,

    nonPrefix: true,

  },

  run: async ({ api, event, args }) => {

    const { threadID, messageID } = event;

    const styledMessage = (header, body, symbol) =>

      AuroraBetaStyler.styleOutput({

        headerText: header,

        headerSymbol: symbol,

        headerStyle: "bold",

        bodyText: body,

        bodyStyle: "bold",

        footerText: "",

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

    const action = args[0]?.toLowerCase();

    if (action === "on") {

      threadStates[threadID] = true;

      await api.sendMessage(

        styledMessage("Autobot", "Autobot is now enabled for this thread.", "✅"),

        threadID,

        messageID

      );

    } else if (action === "off") {

      threadStates[threadID] = false;

      await api.sendMessage(

        styledMessage("Autobot", "Autobot is now disabled for this thread.", "❌"),

        threadID,

        messageID

      );

    } else {

      await api.sendMessage(

        styledMessage("Autobot", "Usage: /autobot [on|off]", "⚠️"),

        threadID,

        messageID

      );

    }

  },

  handleEvent: async ({ api, event }) => {

    const { threadID, messageID, senderID, body } = event;

    const styledMessage = (header, body, symbol) =>

      AuroraBetaStyler.styleOutput({

        headerText: header,

        headerSymbol: symbol,

        headerStyle: "bold",

        bodyText: body,

        bodyStyle: "bold",

        footerText: "",

      });

    if (!threadStates[threadID] || !body || typeof body !== 'string' || !body.startsWith('#')) return;

    try {

      const response = await axios.get(`https://autobot-kagenou-gmmp.onrender.com/api/postWReply?senderID=${senderID}&threadID=${threadID}&body=${encodeURIComponent(body)}`);

      const data = response.data;

      if (data.status !== "success" || !data.result || !data.result.body) {

        await api.sendMessage(

          styledMessage("Autobot", "Failed to process the command. No response from API.", "❌"),

          threadID,

          messageID

        );

        return;

      }

      await api.sendMessage(

        styledMessage("Autobot", data.result.body, "🤖"),

        threadID,

        messageID

      );

    } catch (error) {

      console.error("Error calling Autobot API:", error);

      await api.sendMessage(

        styledMessage("Autobot", "Failed to process the command. Please try again later.", "❌"),

        threadID,

        messageID

      );

    }

  },

};