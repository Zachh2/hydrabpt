
import AuroraBetaStyler from "@aurora/styler";
import axios from "axios";


const uidCommand: ShadowBot.Command = {
  config: {
    name: "uid",
    description: "Get uid",
    role: 0,
    cooldown: 5,
  },
  run: async ({ api, event, args }) => {
    const { threadID, messageID, senderID, messageReply, mentions } = event;

    try {
      let uid: string | null = null;
      let responseText = "";
      if (!args.length && !messageReply && Object.keys(mentions).length === 0) {
        uid = senderID;
        responseText = `${uid}`;
      }
      else if (messageReply) {
        uid = messageReply.senderID;
        responseText = `Replied user: ${uid}`;
      }
      else if (Object.keys(mentions).length > 0) {
        const mention = Object.keys(mentions)[0];
        uid = mention;
        responseText = `${uid}`;
      }
      else if (args[0] && args[0].startsWith("https")) {
        const url = encodeURIComponent(args[0]);
        const apiUrl = `https://kaiz-apis.gleeze.com/api/fbuid?url=${url}&apikey=117cafc8-ef3b-4632-bc1c-13b38b912081`;
        const { data } = await axios.get(apiUrl);

        if (data && data.UID) {
          uid = data.UID;
          responseText = `✅ | UID from URL: ${uid}`;
        } else {
          responseText = "❌";
        }
      } else {
        responseText = "❌";
      }
     /**
     * @aurora-styler
     */
      const replyMessage = AuroraBetaStyler.styleOutput({
        headerText: "UID",
        headerSymbol: "💻",
        headerStyle: "bold",
        bodyText: responseText,
        bodyStyle: "sansSerif",
        footerText: "",
      });

      await api.sendMessage(replyMessage, threadID, messageID);
    } catch (error) {
      console.error("UID Command Error:", error);
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "UID Lookup",
        headerSymbol: "❌",
        headerStyle: "bold",
        bodyText: `${error.message}`,
        bodyStyle: "sansSerif",
        footerText: "",
      });
      api.sendMessage(errorMessage, threadID, messageID);
    }
  },
};

export default uidCommand;
