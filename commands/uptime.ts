import moment from "moment-timezone";
import path from "path";
import fs from "fs-extra";
import AuroraBetaStyler from "@aurora/styler";

module.exports = {
  config: {
    name: "uptime",
    description: "Displays bot statistics",
    role: 0,
    aliases: ["up", "u"],
  },

  run: async ({ api, event, db }) => {
    const { threadID, messageID } = event;

    try {
      const initialMessage = await api.sendMessage("Loading... □□□□□ 0%", threadID, messageID);
      const sentMessageID = initialMessage.messageID;
      const progressSteps = [
        { time: 2000, text: "■□□□□ 20%" },
        { time: 4000, text: "■■■□□ 60%" },
        { time: 6000, text: "■■■■□ 80%" },
        { time: 10000, text: "■■■■■ 100%" },
      ];

      progressSteps.forEach(step => {
        setTimeout(() => {
          api.editMessage(`Loading... ${step.text}`, sentMessageID, threadID);
        }, step.time);
      });
      setTimeout(async () => {
        const uptime = process.uptime();
        const days = Math.floor(uptime / (24 * 3600));
        const hours = Math.floor((uptime % (24 * 3600)) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        const milliseconds = Math.floor((uptime % 1) * 1000);

        if (!db) throw new Error("no db stupidnegga ");

        const threads = await db.db("threads").find({}).toArray();
        const totalThreads = threads.length;

        const usersMap = global.usersData instanceof Map ? global.usersData : new Map();
        const totalUsers = usersMap.size;

        let totalReactions = 0;
        for (const [, data] of usersMap.entries()) {
          totalReactions += Number((data && data.reactions) || 0);
        }

        let commandCount = global.commands?.size || 0;
        if (commandCount === 0) {
          const commandsDir = path.join(__dirname, "..", "commands");
          const commandFiles = fs.readdirSync(commandsDir).filter((file) => file.endsWith(".js"));
          commandCount = commandFiles.length;
        }

        const currentTime = moment().tz("Asia/Manila").format("YYYY-MM-DD HH:mm:ss.SSS");

        const content =
          `- Uptime: ${days}d ${hours}h ${minutes}m ${seconds}s ${milliseconds}ms\n` +
          `- Total Threads: ${totalThreads}\n` +
          `- Users: ${totalUsers}\n` +
          `- Reactions: ${totalReactions}\n` +
          `- Total Commands: ${commandCount}\n` +
          `- Current Time (Asia/Manila): ${currentTime}`;

        const finalMessage = AuroraBetaStyler.styleOutput({
          headerText: "Bot Statistics",
          headerSymbol: "📊",
          headerStyle: "bold",
          bodyText: content,
          bodyStyle: "sansSerif",
          footerText: "",
        });

        api.editMessage(finalMessage, sentMessageID, threadID);
      }, 12000);

    } catch (error) {
      const errMsg = AuroraBetaStyler.styleOutput({
        headerText: "Bot Statistics",
        headerSymbol: "📊",
        headerStyle: "doubleStruck",
        bodyText: `Error: ${error.message}`,
        bodyStyle: "sansSerif",
        footerText: "",
      });
      api.sendMessage(errMsg, threadID, messageID);
    }
  },
};