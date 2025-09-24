import AuroraBetaStyler from "@aurora/styler";

const catfactCommand: ShadowBot.Command = {
  config: {
    name: "catfact",
    author: "Aljur pogoy",
    nonPrefix: false,
    description: "Send catfacts",
  },
  run: async (context: ShadowBot.CommandContext) => {
    const { api, event } = context;
    const { threadID, messageID } = event;

    try {
      const response = await fetch("https://catfact.ninja/fact");
      if (!response.ok) throw new Error("Failed to fetch cat fact");

      const data = await response.json();
      const fact = data.fact;

      const styledMessage = AuroraBetaStyler.styleOutput({
        headerText: "Cat Fact",
        headerSymbol: "🐱",
        headerStyle: "bold",
        bodyText: fact,
        bodyStyle: "bold",
        footerText: "",
      });

      await api.sendMessage(styledMessage, threadID, messageID);
    } catch (error) {
      console.error("Error fetching cat fact:", error);
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "Cat Fact",
        headerSymbol: "❌",
        headerStyle: "bold",
        bodyText: "Oops! Couldn’t fetch a cat fact right now. Try again later!",
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(errorMessage, threadID, messageID);
    }
  },
};

export default catfactCommand;