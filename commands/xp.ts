
import { createCanvas, loadImage } from "canvas";
import fs from "fs";
import path from "path";
import axios from "axios";
import AuroraBetaStyler from "@aurora/styler";

const xpCommand: ShadowBot.Command = {
  config: {
    name: "xp",
    author: "Aljur Pogoy",
    aliases: ["level", "profile"],
    description: "Check your XP and level with a profile card",
    cooldown: 5,
    role: 0,
  },
  run: async (context: ShadowBot.CommandContext) => {
    const { api, event, db, usersData } = context;
    const { senderID, threadID, messageID } = event;

    try {
      let user = usersData.get(senderID) || { balance: 0, bank: 0, xp: 0, level: 0 };
      user.xp = await global.getXP(senderID);
      user.level = await global.getLevel(senderID);
      usersData.set(senderID, user);
      if (db) {
        const usersCollection = db.db("users");
        await usersCollection.updateOne(
          { userId: senderID },
          { $set: { userId: senderID, data: { ...user, xp: user.xp, level: user.level } } },
          { upsert: true }
        );
        global.log.success(`XP synced for ${senderID} in MongoDB: ${user.xp} XP, Level ${user.level}`);
      } else {
        global.log.warn(`No MongoDB connected for ${senderID} XP sync`);
      }

    
      const width = 800;
      const height = 300;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      const cacheDir = path.join(__dirname, "cache");
      const files = fs.readdirSync(cacheDir).filter(f => f.endsWith(".jpg") || f.endsWith(".png"));
      if (files.length === 0) throw new Error("No background images found in cache folder!");
      const randomBg = files[Math.floor(Math.random() * files.length)];
      const bgPath = path.join(cacheDir, randomBg);
      const background = await loadImage(bgPath);
      ctx.drawImage(background, 0, 0, width, height);

      const avatarURL = `https://graph.facebook.com/${senderID}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
      const response = await axios.get(avatarURL, { responseType: "arraybuffer" });
      const avatar = await loadImage(Buffer.from(response.data, "binary"));

      const avatarSize = 180;
      const avatarX = 100;
      const avatarY = 150;

      const randomColor = `hsl(${Math.floor(Math.random() * 360)}, 100%, 50%)`;

      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, avatarSize / 2 + 8, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.strokeStyle = randomColor;
      ctx.lineWidth = 8;
      ctx.shadowBlur = 30;
      ctx.shadowColor = randomColor;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
      ctx.restore();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 32px Sans";
      ctx.fillText(`Level ${user.level}`, 250, 120);

      ctx.font = "24px Sans";
      ctx.fillText(`XP: ${user.xp}`, 250, 160);

      const progress = user.xp % 100;
      const barWidth = 400;
      const barHeight = 30;

      ctx.fillStyle = "#334155";
      ctx.fillRect(250, 200, barWidth, barHeight);

      ctx.fillStyle = "#3b82f6";
      ctx.fillRect(250, 200, (progress / 100) * barWidth, barHeight);

      ctx.strokeStyle = "#ffffff";
      ctx.strokeRect(250, 200, barWidth, barHeight);

      ctx.fillStyle = "#ffffff";
      ctx.font = "20px Sans";
      ctx.fillText(`${progress} / 100 XP`, 250 + 150, 223);

      const filePath = path.join(process.cwd(), `xp_${senderID}.png`);
      fs.writeFileSync(filePath, canvas.toBuffer("image/png"));

      const styledMessage = AuroraBetaStyler.styleOutput({
        headerText: "🎮 XP Profile",
        headerSymbol: "⭐",
        headerStyle: "bold",
        bodyText: `Here is your profile card with XP and level progress.`,
        bodyStyle: "sansSerif",
        footerText: "Gain +50 XP for being active!",
      });

      try {
        await api.sendMessage(
          {
            body: styledMessage,
            attachment: fs.createReadStream(filePath),
          },
          threadID,
          messageID
        );
      } finally {
        try {
          fs.unlinkSync(filePath);
        } catch {}
      }
    } catch (error: any) {
      global.log.error(`XP Command Error for ${senderID}: ${error.message}`);
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "XP Profile Error",
        headerSymbol: "⚠️",
        headerStyle: "bold",
        bodyText: `Error: ${error.message}`,
        bodyStyle: "sansSerif",
        footerText: "Try again later.",
      });
      api.sendMessage(errorMessage, threadID, messageID);
    }
  },
};

export default xpCommand;
