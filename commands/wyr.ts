import AuroraBetaStyler from "@aurora/styler";
import axios from "axios";


const wyrCommand: ShadowBot.Command = {
  config: {
    name: "wyr",
    description: "Get a 'Would You Rather' question",
    role: 0,
    cooldown: 10,
  },
  run: async ({ api, event }) => {
    const { threadID, messageID } = event;

    try {
      const apiUrl = "https://api.popcat.xyz/v2/wyr";
      const response = await axios.get(apiUrl);
      const { error, message } = response.data;

      if (error) {
        throw new Error(message || "Unknown error from API");
      }

      const options = `Option 1. ${message.ops1}\nOption 2. ${message.ops2}`;

      const wyrMessage = AuroraBetaStyler.styleOutput({
        headerText: "Would You Rather",
        headerSymbol: "🤔",
        headerStyle: "bold",
        bodyText: options,
        bodyStyle: "sansSerif",
        footerText: "",
      });
      api.sendMessage(wyrMessage, threadID, messageID);
    } catch (error) {
      console.error("WYR Command Error:", error);
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "Would You Rather",
        headerSymbol: "❌",
        headerStyle: "bold",
        bodyText: `Err ${error.message}`, 
        bodyStyle: "default",
        footerText: "",
      });
      api.sendMessage(errorMessage, threadID, messageID);
    }
  },
};

export default wyrCommand;
