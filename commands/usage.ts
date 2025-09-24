import { createCanvas, CanvasRenderingContext2D } from "canvas";
import fs from "fs";
import path from "path";
import AuroraBetaStyler from "@aurora/styler";

const usageCommand: ShadowBot.Command = {
  config: {
    name: "usage",
    aliases: ["usages", "commandusage"],
    description: "Show top 3 most used commands with percentage stats",
    cooldown: 5,
    role: 0,
  },
  run: async (context: ShadowBot.CommandContext) => {
    const { api, event } = context;
    const { threadID, messageID } = event;

    try {
      const usageStats = global.getUsageStats();
      if (usageStats.length === 0) {
        const noDataMsg = AuroraBetaStyler.styleOutput({
          headerText: "Usage Stats",
          headerSymbol: "📊",
          headerStyle: "bold",
          bodyText: "⚠️ No usage data yet.",
          bodyStyle: "sansSerif",
          footerText: "",
        });
        return await api.sendMessage(noDataMsg, threadID, messageID);
      }

      usageStats.sort((a, b) => b[1] - a[1]);
      const top = usageStats.slice(0, 3);
      const total = usageStats.reduce((sum, [, count]) => sum + count, 0);

      const width = 700;
      const height = 300;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

      // Bg
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 28px Sans";
      ctx.fillText("Command Usage Stats", 20, 40);

      const barMaxWidth = 400;
      const barHeight = 30;
      const startY = 90;
      top.forEach(([cmd, count], i) => {
        const percent = ((count / total) * 100).toFixed(1);
        const barWidth = (count / top[0][1]) * barMaxWidth;
        const y = startY + i * 70;

        ctx.fillStyle = "#e2e8f0";
        ctx.font = "20px Sans";
        ctx.fillText(`${cmd}`, 20, y + 20);

        ctx.fillStyle = "#334155";
        ctx.fillRect(150, y, barMaxWidth, barHeight);

        ctx.fillStyle = ["#3b82f6", "#22c55e", "#f97316"][i] || "#38bdf8";
        ctx.fillRect(150, y, barWidth, barHeight);

        ctx.fillStyle = "#ffffff";
        ctx.font = "16px Sans";
        ctx.fillText(`${count} uses (${percent}%)`, 150 + barMaxWidth + 15, y + 22);
      });

      const filePath = path.join(__dirname, "usage_temp.png");
      fs.writeFileSync(filePath, canvas.toBuffer("image/png"));

      const styledMessage = AuroraBetaStyler.styleOutput({
        headerText: "Usage Stats",
        headerSymbol: "📊",
        headerStyle: "bold",
        bodyText: "Top 3 Used Commands;",
        bodyStyle: "sansSerif",
        footerText: "**Note**: Currents Usage if bot restart, usage will restart too.",
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
      } catch (err) {
        console.error("Send error:", err);
      } finally {
        try {
          fs.unlinkSync(filePath);
        } catch {}
      }
    } catch (error: any) {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "Usage Stats",
        headerSymbol: "📊",
        headerStyle: "bold",
        bodyText: `Error: ${error.message}`,
        bodyStyle: "sansSerif",
        footerText: "",
      });

      await api.sendMessage(errorMessage, threadID, messageID);
    }
  },
};

export default usageCommand;