import AuroraBetaStyler = require('@aurora/styler');
const axios = require('axios');

module.exports = {
  config: {
    name: "aria",
    description: "Processes commands using the Aria API.",
    role: 0,
    usage: "aria <prompt>",
    category: "Utility 🤖",
  },
  run: async ({ api, event, args }) => {
    const { threadID, messageID } = event;
    const prompt = args.join(" ");
    if (!prompt) {
      return api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: "Aria",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "Please provide a prompt (e.g., /aria Hello sir).",
          bodyStyle: "sansSerif",
          footerText: "",
        }),
        threadID,
        messageID
      );
    }
    try {
      const response = await axios.get(`https://rapido.zetsu.xyz/api/aria?prompt=${encodeURIComponent(prompt)}`);
      const data = response.data;
      if (!data || !data.response) {
        return api.sendMessage(
          AuroraBetaStyler.styleOutput({
            headerText: "Aria",
            headerSymbol: "❌",
            headerStyle: "bold",
            bodyText: "Failed to process the command. No response from API.",
            bodyStyle: "sansSerif",
            footerText: "",
          }),
          threadID,
          messageID
        );
      }
      await api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: "Aria",
          headerSymbol: "🤖",
          headerStyle: "bold",
          bodyText: data.response,
          bodyStyle: "sansSerif",
          footerText: "",
        }),
        threadID,
        messageID
      );
    } catch (error) {
      console.error("Error calling Aria API:", error);
      await api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: "Aria",
          headerSymbol: "❌",
          headerStyle: "bold",
          bodyText: "Failed to process the command. Please try again later.",
          bodyStyle: "sansSerif",
          footerText: "",
        }),
        threadID,
        messageID
      );
    }
  },
};