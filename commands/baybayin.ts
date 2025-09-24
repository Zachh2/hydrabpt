import axios from "axios";

import { format } from "cassidy-styler";

// Define the ShadowBot namespace and Command interface (adjust as needed)

namespace ShadowBot {

  export interface Command {

    config: {

      name: string;

      description: string;

      usage: string;

      nonPrefix?: boolean;

    };

    run: (context: { api: any; event: any; args: string[] }) => Promise<void>;

  }

}

const baybayinCommand: ShadowBot.Command = {

  config: {

    name: "baybayin",

    description: "Convert text to Baybayin script using an API.",

    usage: "#baybayin <text>",

  },

  run: async ({ api, event, args }: { api: any; event: any; args: string[] }) => {

    const { threadID, messageID } = event;

    const query = args.join(" ").trim();

    if (!query) {

      const msg = format({

        title: "Baybayin",

        titlePattern: "{word}",

        titleFont: "double_struck",

        contentFont: "fancy_italic",

        content: `❌ Please provide text to convert.\n> Usage: #baybayin <text>\n> Example: #baybayin hello\n> Thanks for using Chatbot`,

      });

      return api.sendMessage(msg, threadID, messageID);

    }

    try {

      // Send query to Baybayin API

      const response = await axios.get("https://cid-kagenou-api-production.up.railway.app/api/baybayin", {

        params: {

          q: query,

        },

      });

      const baybayinText = response.data.result || "No response from Baybayin API.";

      const content = `✍️ Converted "${query}" to Baybayin:\n> ${baybayinText}\n> Thanks for using Chatbot`;

      const msg = format({

        title: "Baybayin",

        titlePattern: "{word}",

        titleFont: "double_struck",

        contentFont: "fancy_italic",

        content,

      });

      await api.sendMessage(msg, threadID, messageID);

    } catch (error) {

      console.error("Error querying Baybayin API:", error);

      const errMsg = format({

        title: "Baybayin",

        titlePattern: "{word}",

        titleFont: "double_struck",

        contentFont: "fancy_italic",

        content: `┏━━━━━━━┓\n┃ Error: ${error.message}\n┗━━━━━━━┛\n> Thanks for using Chatbot`,

      });

      api.sendMessage(errMsg, threadID, messageID);

    }

  },

};

export default baybayinCommand;