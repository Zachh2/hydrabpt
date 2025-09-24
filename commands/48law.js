const axios = require("axios");

module.exports = {
  config: {
    name: "48law",
    description: "Get the 48 Laws of Power by law number.",
    usage: "/48law <number>",
    author: "aljur pogoy",
    aliases: ["law"],
    nonPrefix: false,
    role: 0,
  },

  run: async ({ api, event, args }) => {
    const { threadID, messageID } = event;
    const number = args[0]?.trim();

    if (!number || isNaN(number) || number < 1 || number > 48) {
      return api.sendMessage(
        "⚠️ Please provide a valid law number (1-48).",
        threadID,
        messageID
      );
    }

    try {
      const response = await axios.get("https://haji-mix.up.railway.app/api/law?", {
        params: { law: number, apikey: "9c63310a1e2f7deff483846ac199a6acce24e9ecec12565715a1c1cef6d78039" }
      });

      const lawData = response.data;
      const title = lawData.title || "Unknown Law";
      const description = lawData.law || "No description available.";

      const message = `Law #${number}: ${title}\n\n${description}`;
      api.sendMessage(message, threadID, messageID);

    } catch (error) {
      console.error("Error fetching law:", error);
      api.sendMessage("❌ An error occurred while fetching the law.", threadID, messageID);
    }
  },
};