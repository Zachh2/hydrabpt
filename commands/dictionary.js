const axios = require("axios");

module.exports = {
  name: "dictionary",
  category: "Utility",
  execute: async (api, event, args, commands, prefix, admins, appState, sendMessage) => {
    const { threadID } = event;

    if (!args.length) {
      return sendMessage(api, {
        threadID,
        message: "❌ Usage: /dictionary <word>\nExample: /dictionary apple"
      });
    }

    const word = args.join(" "); 

    try {
      const response = await axios.get(`https://kaiz-apis.gleeze.com/api/dictionary?word=${encodeURIComponent(word)}`);

      if (!response.data || !response.data.definition) {
        return sendMessage(api, { threadID, message: `❌ No definition found for "${word}".` });
      }

      sendMessage(api, {
        threadID,
        message: `Definition of ${word}:**\n\n${response.data.definition}`
      });

    } catch (error) {
      console.error("Dictionary API Error:", error);
      sendMessage(api, { threadID, message: "❌ Error fetching definition. Try again later!" });
    }
  },
};