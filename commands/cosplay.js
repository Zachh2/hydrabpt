const axios = require("axios");
const fs = require("fs");
const path = require("path");
const AuroraBetaStyler = require(path.join(__dirname, "..", "core", "plugins", "aurora-beta-styler"));
module.exports = {
  name: "cosplay",
  aliases: ["goon"],
  description: "Fetch a random cosplay image from the Haji Mix API",
  author: "Aljur Pogoy",
  nsfw: true,
  cooldown: 5,
  async run({ api, event, args }) {
    const { threadID, messageID, senderID} = event;
    const styledMessage = (header, body, symbol) => AuroraBetaStyler.styleOutput({
      headerText: header,
      headerSymbol: symbol,
      headerStyle: "bold",
      bodyText: body,
      bodyStyle: "bold",
      footerText: ""
    });
      const goonerStats = db ? db.db("gooner_stats") : null;
if (goonerStats) {
  let username = `Player${senderID}`;
  try {
    const userInfo = await api.getUserInfo([senderID]);
    username = userInfo[senderID]?.name || username;
  } catch (error) {
    console.log("getUserInfo Error:", error.message);
  }
  goonerStats.updateOne(
    { userID: senderID },
    { $inc: { count: 1 }, $set: { username } },
    { upsert: true }
  );
    }
    try {
      const response = await axios.get("https://haji-mix.up.railway.app/api/cgcosplay?search=&stream=true", { responseType: "stream" });
      const filePath = path.join(__dirname, `../temp/cosplay_${Date.now()}.jpg`);
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on("finish", () => resolve());
        writer.on("error", reject);
      });
      const bodyText = "Gooner Cosplay 💦 ";
      await api.sendMessage({ body: styledMessage("Goon time!", bodyText, "🎭"), attachment: fs.createReadStream(filePath) }, threadID, () => {
        fs.unlink(filePath, () => {});
      }, messageID);
    } catch (error) {
      const errorMessage = styledMessage("Error", "Failed to fetch cosplay image. Please try again later.", "❌");
      await api.sendMessage(errorMessage, threadID, messageID);
      await api.setMessageReaction("❌", messageID, () => {});
    }
  }
};