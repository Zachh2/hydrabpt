const axios = require("axios");

const path = require("path");

const AuroraBetaStyler = require(path.join(__dirname, "..", "core", "plugins",  "aurora-beta-styler"));

module.exports = {

  name: "animegif",

  description: "Send a random anime GIF",

  author: "Aljur Pogoy",

  role: 0,

  async run({ api, event }) {

    const { threadID, messageID } = event;

    try {

      const response = await axios.get("https://rapido.zetsu.xyz/api/animegif", {

        responseType: "stream",

      });

      const styledMessage = AuroraBetaStyler.styleOutput({

        headerText: "Anime GIF",

        headerSymbol: "🎉",

        headerStyle: "bold",

        bodyText: "Enjoy this random anime GIF!",

        bodyStyle: "fancy",

        footerText: "",

      });

      await api.sendMessage(

        { body: styledMessage, attachment: response.data },

        threadID,

        messageID

      );

    } catch (error) {

      console.error("Error fetching anime GIF:", error);

      const errorMessage = AuroraBetaStyler.styleOutput({

        headerText: "Error",

        headerSymbol: "❌",

        headerStyle: "bold",

        bodyText: "Failed to fetch an anime GIF. Try again later!",

        bodyStyle: "bold",

        footerText: "",

      });

      await api.sendMessage(errorMessage, threadID, messageID);

      await api.setMessageReaction("❌", messageID, () => {});

    }

  },

};