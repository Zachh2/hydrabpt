const axios = require("axios");

module.exports = {
  name: "aidetector",
  category: "Utility",
  execute: async (api, event, args, commands, prefix, admins, appState, sendMessage) => {
    const { threadID } = event;

    if (!args.length) {
      return sendMessage(api, {
        threadID,
        message: "❌ Usage: /aidetector <text>\nExample: /aidetector This is a test message."
      });
    }

    const text = args.join(" "); 

    try {
      const response = await axios.get(`https://kaiz-apis.gleeze.com/api/aidetector?q=${encodeURIComponent(text)}`);

      if (!response.data || !response.data.result) {
        return sendMessage(api, { threadID, message: "❌ Unable to detect AI content. Try again!" });
      }

      sendMessage(api, {
        threadID,
        message: `🤖 AI Detector Result:\n\n📝 Input: ${text}\n📊 Analysis: ${response.data.result}`
      });

    } catch (error) {
      console.error("AI Detector API Error:", error);
      sendMessage(api, { threadID, message: "❌ Error detecting AI content. Try again later!" });
    }
  },
};