
import AuroraBetaStyler from "@aurora/styler";
import axios from "axios";
import fs from "fs";
import path from "path";


const adpicCommand: ShadowBot.Command = {
  config: {
    name: "adpic",
    description: "Generate an adpic for a user (reply, mention, or UID)",
    role: 0,
    cooldown: 10,
  },
  run: async ({ api, event, args }) => {
    const { threadID, messageID, senderID, messageReply, mentions } = event;
    let targetUID: string;
    if (messageReply && messageReply.senderID) {
      targetUID = messageReply.senderID; 
    } else if (mentions && Object.keys(mentions).length > 0) {
      targetUID = Object.keys(mentions)[0];
    } else if (args.length > 0) {
      targetUID = args[0]; 
    } else {
      targetUID = senderID;
    }

    try {
      const apiUrl = `https://api-canvass.vercel.app/adpic?userid=${encodeURIComponent(targetUID)}`;
      const response = await axios.get(apiUrl, { responseType: "stream" });
      const fileName = `${Date.now()}_adpic.png`;
      const filePath = path.join(process.cwd(), "cache", fileName);
      if (!fs.existsSync(path.join(process.cwd(), "cache"))) fs.mkdirSync(path.join(process.cwd(), "cache"));
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });
      const successMessage = AuroraBetaStyler.styleOutput({
        headerText: "AdPic",
        headerSymbol: "📸",
        headerStyle: "bold",
        bodyText: "Ads 🫡",
        bodyStyle: "sansSerif",
        footerText: "a",
      });
      await api.sendMessage(
        { body: successMessage, attachment: fs.createReadStream(filePath) },
        threadID,
        () => fs.unlinkSync(filePath),
        messageID
      );
    } catch (error) {
      console.error("AdPic Command Error:", error);
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "AdPic",
        headerSymbol: "❌",
        headerStyle: "bold",
        bodyText: `Error: ${error.message}`,
        bodyStyle: "sansSerif",
        footerText: "a",
      });
      api.sendMessage(errorMessage, threadID, messageID);
    }
  },
};

export default adpicCommand;
