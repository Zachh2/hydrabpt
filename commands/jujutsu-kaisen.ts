import AuroraBetaStyler from '@aurora/styler';
import * as path from "path";

namespace ShadowBot {
  export interface Command {
    config: {
      name: string;
      description: string;
      usage: string;
      aliases?: string[];
      category?: string;
    };
    run: (context: { api: any; event: any; prefix: string; args: string[]; db?: { db: (collectionName: string) => any } | null }) => Promise<void>;
  }
}

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function determineRank(cursedEnergy: number) {
  if (cursedEnergy >= 10000) return "S";
  if (cursedEnergy >= 5000) return "A";
  if (cursedEnergy >= 2500) return "B";
  if (cursedEnergy >= 1000) return "C";
  if (cursedEnergy >= 500) return "D";
  return "E";
}

function getCollectionMultiplier(techniqueLevel: number, rank: string) {
  if (techniqueLevel >= 80) return rank === "S" ? 200 : 50;
  if (rank === "S") return 200;
  if (techniqueLevel >= 30 && techniqueLevel <= 80) return 15;
  if (techniqueLevel >= 15 && techniqueLevel < 30) return 9;
  if (techniqueLevel === 3) return 6;
  if (techniqueLevel === 2) return 4;
  if (techniqueLevel === 1) return 2;
  return techniqueLevel;
}

async function saveSorcererData(db: any, senderID: string, data: SorcererData) {
  const sorcerersCollection = db.db("sorcerers");
  await sorcerersCollection.updateOne(
    { userID: senderID },
    { $set: data },
    { upsert: true }
  );
}

async function getSorcererData(db: any, senderID: string) {
  const sorcerersCollection = db.db("sorcerers");
  const result = await sorcerersCollection.findOne({ userID: senderID });
  const defaultData: SorcererData = {
    userID: senderID,
    cursedEnergy: 0,
    cursedObjects: { sukunaFingers: 0, cursedTools: 0, talismans: 0 },
    techniques: { basicTechnique: 1 },
    rank: "E",
    lastActive: new Date().toISOString(),
    afkCursedObjects: { sukunaFingers: 0, cursedTools: 0, talismans: 0 },
  };
  const data = result ? { ...defaultData, ...result } : defaultData;
  if (!data.techniques || Object.keys(data.techniques).length === 0) {
    data.techniques = { basicTechnique: 1 };
  }
  data.rank = determineRank(data.cursedEnergy);
  return data;
}

/** 
 * Represents a sorcerer's data in the Jujutsu Kaisen game.
 * @interface SorcererData
 */
interface SorcererData {
  /** The unique identifier for the user (e.g., sender ID from the chat platform). */
  userID: string;

  /** The name of the chosen Jujutsu Kaisen character (e.g., "Gojo Satoru"). Optional until registration. */
  name?: string;

  /** Indicates whether the user has registered as a sorcerer. */
  started?: boolean;

  /** The amount of cursed energy accumulated by the sorcerer. */
  cursedEnergy: number;

  /** Collection of cursed objects owned by the sorcerer. */
  cursedObjects: {
    /** Number of Sukuna's Fingers collected. */
    sukunaFingers: number;
    /** Number of Cursed Tools collected. */
    cursedTools: number;
    /** Number of Talismans collected. */
    talismans: number;
  };

  /** Techniques available to the sorcerer, including their levels and the currently active technique. */
  techniques: {
    /** Index signature allowing technique names (e.g., "basicTechnique") to map to their level (number) or the current technique name (string). */
    [key: string]: number | string | undefined;
    /** The name of the currently active technique (e.g., "basicTechnique"). Optional if no technique is selected. */
    currentTechnique?: string | undefined;
  };

  /** ISO timestamp of the sorcerer's last activity (e.g., last training session). Optional. */
  lastActive?: string;

  /** Cursed objects accumulated during AFK periods, if implemented. Optional. */
  afkCursedObjects?: {
    /** Number of Sukuna's Fingers collected during AFK. */
    sukunaFingers: number;
    /** Number of Cursed Tools collected during AFK. */
    cursedTools: number;
    /** Number of Talismans collected during AFK. */
    talismans: number;
  };

  /** The sorcerer's rank, determined by cursed energy (e.g., "E", "S"). */
  rank: string;
}

const jjkCommand: ShadowBot.Command = {
  config: {
    name: "jujutsu-kaisen",
    description: "Train as a Jujutsu Kaisen sorcerer, collect cursed objects, and upgrade techniques.",
    usage: "/jjk [register | train | stats | upgrade <technique>]",
    aliases: ["jujutsu","jjk"],
    category: "Game"
  },
  run: async ({ api, event, args, db, prefix }) => {
    const { threadID, messageID, senderID } = event;

    if (!db) {
      await api.sendMessage("❌ Database not available. Please try again later.", threadID, messageID);
      return;
    }

    const styledMessage = (header: string, body: string, symbol: string) =>
      AuroraBetaStyler.styleOutput({
        headerText: header,
        headerSymbol: symbol,
        headerStyle: "bold",
        bodyText: body,
        bodyStyle: "sansSerif",
        footerText: ""
      });

    let sorcererData = await getSorcererData(db, senderID);

    if (args[0]?.toLowerCase() === "register") {
      if (sorcererData.started) {
        await api.sendMessage(
          styledMessage("Error", "❌ You are already registered as a sorcerer!", "⚠️"),
          threadID,
          messageID
        );
        return;
      }

      const characters = [
"Gojo Satoru",
"Yuji Itadori",
"Megumi Fushiguro",
"Nobara Kugisaki",
"Sukuna",
"Yuji Itadori",  
"Megumi Fushiguro",  
"Nobara Kugisaki",  
"Satoru Gojo",  
"Ryomen Sukuna",  
"Masamichi Yaga",  
"Shoko Ieiri",  
"Kento Nanami",  
"Maki Zenin",  
"Toge Inumaki",  
"Panda",  
"Yuta Okkotsu",  
"Yoshinobu Gakuganji",  
"Aoi Todo",  
"Mai Zenin",  
"Kasumi Miwa",  
"Noritoshi Kamo",  
"Mechamaru",  
"Ultimate Mechamaru",  
"Mahito",  
"Jogo",  
"Hanami",  
"Dagon",  
"Geto Suguru",  
"Kenjaku",  
"Uraume",  
"Choso",  
"Eso",  
"Kechizu",  
"Riko Amanai",  
"Misato Kuroi",  
"Toji Fushiguro",  
"Nanako Hasaba",  
"Mimiko Hasaba",  
"Junpei Yoshino",  
"Yu Haibara",  
"Mei Mei",  
"Ui Ui",  
"Kiyotaka Ijichi",  
"Akari Nitta",  
"Tengen"
         
      ];
      const characterList = characters.map((char, index) => `${index + 1}. ${char}`).join("\n");
      let sentMessageID: string;
      await new Promise(resolve => {
        api.sendMessage(
          styledMessage(
            "Jujutsu Kaisen Registration",
            `Choose your sorcerer by replying with a number:\n${characterList}`,
            "🔮"
          ),
          threadID,
          (err: any, info: any) => {
            sentMessageID = info?.messageID;
            resolve(info);
          },
          messageID
        );
      });

      if (!global.Kagenou.replyListeners) global.Kagenou.replyListeners = new Map();
      global.Kagenou.replyListeners.set(sentMessageID, {
        callback: async ({ api, event }) => {
          const { threadID: replyThreadID, messageID: replyMessageID, body, messageReply } = event;
          if (replyThreadID !== threadID || !messageReply || messageReply.messageID !== sentMessageID) return;
          const choice = parseInt(body);
          if (isNaN(choice) || choice < 1 || choice > characters.length) {
            await api.sendMessage(
              styledMessage("Error", "❌ Invalid choice. Please reply with a number between 1 and 5.", "⚠️"),
              threadID,
              replyMessageID
            );
            return;
          }
          sorcererData.started = true;
          sorcererData.name = characters[choice - 1];
          await saveSorcererData(db, senderID, sorcererData);
          const subcommands = jjkCommand.config.usage
            .replace(/\[|\]/g, "")
            .split(" | ")
            .map(cmd => `${prefix}jjk ${cmd}`)
            .join("\n");
          await api.sendMessage(
            styledMessage(
              "Registration Complete",
              `Congratulations! You've been registered as ${sorcererData.name}!\nAvailable commands:\n${subcommands}`,
              "🎉"
            ),
            threadID,
            replyMessageID
          );
          global.Kagenou.replyListeners.delete(sentMessageID);
        }
      });
      return;
    }

    if (!sorcererData.started) {
      await api.sendMessage(
        styledMessage("Error", `❌ You must register first! Use ${prefix}jjk register.`, "⚠️"),
        threadID,
        messageID
      );
      return;
    }

    if (args.length === 0 || args[0].toLowerCase() === "train") {
      let sentMessageID: string;
      await new Promise(resolve => {
        api.sendMessage(
          styledMessage("Jujutsu Training", "Do you want to train? Reply 'Yes' or 'No'.", "🔮"),
          threadID,
          (err: any, info: any) => {
            sentMessageID = info?.messageID;
            resolve(info);
          },
          messageID
        );
      });

      global.Kagenou.replyListeners.set(sentMessageID, {
        callback: async ({ api, event }) => {
          const { threadID: replyThreadID, messageID: replyMessageID, body, messageReply } = event;
          if (replyThreadID !== threadID || !messageReply || messageReply.messageID !== sentMessageID) return;
          if (body.toLowerCase() !== "yes") {
            await api.sendMessage(
              styledMessage("Training Canceled", "Training canceled.", "❌"),
              threadID,
              replyMessageID
            );
            return;
          }
          sorcererData = await getSorcererData(db, senderID);
          const techniqueLevel = sorcererData.techniques[sorcererData.techniques.currentTechnique || "basicTechnique"] || 1;
          const multiplier = getCollectionMultiplier(techniqueLevel, sorcererData.rank);
          const cursedEnergyGain = getRandomInt(10, 50) * multiplier;
          const sukunaFingers = getRandomInt(0, 2) * multiplier;
          const cursedTools = getRandomInt(0, 5) * multiplier;
          const talismans = getRandomInt(0, 10) * multiplier;

          sorcererData.cursedEnergy += cursedEnergyGain;
          sorcererData.cursedObjects.sukunaFingers += sukunaFingers;
          sorcererData.cursedObjects.cursedTools += cursedTools;
          sorcererData.cursedObjects.talismans += talismans;
          sorcererData.lastActive = new Date().toISOString();
          sorcererData.rank = determineRank(sorcererData.cursedEnergy);

          await saveSorcererData(db, senderID, sorcererData);

          const bodyText = `
🎓 Training Complete!
🔮 Cursed Energy: +${cursedEnergyGain} (Total: ${sorcererData.cursedEnergy})
🖐️ Sukuna's Fingers: +${sukunaFingers}
🗡️ Cursed Tools: +${cursedTools}
📜 Talismans: +${talismans}
🏆 Rank: ${sorcererData.rank}
🔧 Current Technique: ${sorcererData.techniques.currentTechnique || "Basic Technique"} (Level ${techniqueLevel})
ℹ️ Use ${prefix}jjk stats to check your progress or ${prefix}jjk upgrade <technique> to improve your skills!
          `.trim();

          await api.sendMessage(styledMessage("Jujutsu Training", bodyText, "🔮"), threadID, replyMessageID);
          global.Kagenou.replyListeners.delete(sentMessageID);
        }
      });
      return;
    }

    if (args[0].toLowerCase() === "stats") {
      let sentMessageID: string;
      await new Promise(resolve => {
        api.sendMessage(
          styledMessage("Sorcerer Stats", "Do you want to show your stats? Reply 'Yes' or 'No'.", "👤"),
          threadID,
          (err: any, info: any) => {
            sentMessageID = info?.messageID;
            resolve(info);
          },
          messageID
        );
      });

      global.Kagenou.replyListeners.set(sentMessageID, {
        callback: async ({ api, event }) => {
          const { threadID: replyThreadID, messageID: replyMessageID, body, messageReply } = event;
          if (replyThreadID !== threadID || !messageReply || messageReply.messageID !== sentMessageID) return;
          if (body.toLowerCase() !== "yes") {
            await api.sendMessage(
              styledMessage("Stats Canceled", "Stats display canceled.", "❌"),
              threadID,
              replyMessageID
            );
            return;
          }
          sorcererData = await getSorcererData(db, senderID);
          const techniqueLevel = sorcererData.techniques[sorcererData.techniques.currentTechnique || "basicTechnique"] || 1;
          const bodyText = `
👤 Sorcerer Stats
🔮 Cursed Energy: ${sorcererData.cursedEnergy}
🖐️ Sukuna's Fingers: ${sorcererData.cursedObjects.sukunaFingers}
🗡️ Cursed Tools: ${sorcererData.cursedObjects.cursedTools}
📜 Talismans: ${sorcererData.cursedObjects.talismans}
🏆 Rank: ${sorcererData.rank}
🔧 Current Technique: ${sorcererData.techniques.currentTechnique || "Basic Technique"} (Level ${techniqueLevel})
ℹ️ Use ${prefix}jjk train to gain more cursed energy and objects!
          `.trim();

          await api.sendMessage(styledMessage("Sorcerer Stats", bodyText, "👤"), threadID, replyMessageID);
          global.Kagenou.replyListeners.delete(sentMessageID);
        }
      });
      return;
    }

    if (args[0].toLowerCase() === "upgrade" && args[1]) {
      const technique = args[1].toLowerCase();
      const availableTechniques = ["basicTechnique", "cursedTechnique", "domainExpansion"];
      if (!availableTechniques.includes(technique)) {
        await api.sendMessage(
          styledMessage(
            "Error",
            `❌ Invalid technique. Available: ${availableTechniques.join(", ")}`,
            "⚠️"
          ),
          threadID,
          messageID
        );
        return;
      }

      const upgradeCost = {
        basicTechnique: { cursedEnergy: 100, talismans: 10 },
        cursedTechnique: { cursedEnergy: 500, cursedTools: 20 },
        domainExpansion: { cursedEnergy: 1000, sukunaFingers: 5 }
      }[technique];

      if (
        sorcererData.cursedEnergy < upgradeCost.cursedEnergy ||
        sorcererData.cursedObjects.sukunaFingers < (upgradeCost.sukunaFingers || 0) ||
        sorcererData.cursedObjects.cursedTools < (upgradeCost.cursedTools || 0) ||
        sorcererData.cursedObjects.talismans < (upgradeCost.talismans || 0)
      ) {
        await api.sendMessage(
          styledMessage(
            "Error",
            `❌ Insufficient resources. Need: ${upgradeCost.cursedEnergy} Cursed Energy, ${upgradeCost.sukunaFingers || 0} Sukuna's Fingers, ${upgradeCost.cursedTools || 0} Cursed Tools, ${upgradeCost.talismans || 0} Talismans`,
            "⚠️"
          ),
          threadID,
          messageID
        );
        return;
      }

      let sentMessageID: string;
      await new Promise(resolve => {
        api.sendMessage(
          styledMessage(
            "Technique Upgrade",
            `Do you want to upgrade ${technique} for ${upgradeCost.cursedEnergy} Cursed Energy, ${upgradeCost.sukunaFingers || 0} Sukuna's Fingers, ${upgradeCost.cursedTools || 0} Cursed Tools, ${upgradeCost.talismans || 0} Talismans? Reply 'Yes' or 'No'.`,
            "🔧"
          ),
          threadID,
          (err: any, info: any) => {
            sentMessageID = info?.messageID;
            resolve(info);
          },
          messageID
        );
      });

      global.Kagenou.replyListeners.set(sentMessageID, {
        callback: async ({ api, event }) => {
          const { threadID: replyThreadID, messageID: replyMessageID, body, messageReply } = event;
          if (replyThreadID !== threadID || !messageReply || messageReply.messageID !== sentMessageID) return;
          if (body.toLowerCase() !== "yes") {
            await api.sendMessage(
              styledMessage("Upgrade Canceled", "Technique upgrade canceled.", "❌"),
              threadID,
              replyMessageID
            );
            return;
          }
          sorcererData = await getSorcererData(db, senderID);
          sorcererData.cursedEnergy -= upgradeCost.cursedEnergy;
          if (upgradeCost.sukunaFingers) sorcererData.cursedObjects.sukunaFingers -= upgradeCost.sukunaFingers;
          if (upgradeCost.cursedTools) sorcererData.cursedObjects.cursedTools -= upgradeCost.cursedTools;
          if (upgradeCost.talismans) sorcererData.cursedObjects.talismans -= upgradeCost.talismans;

          sorcererData.techniques[technique] = (sorcererData.techniques[technique] || 0) + 1;
          sorcererData.techniques.currentTechnique = technique;
          sorcererData.rank = determineRank(sorcererData.cursedEnergy);

          await saveSorcererData(db, senderID, sorcererData);

          const bodyText = `
🔧 Technique Upgraded!
🎯 ${technique} (Level ${sorcererData.techniques[technique]})
🏆 Rank: ${sorcererData.rank}
ℹ️ Use ${prefix}jjk train to continue training!
          `.trim();

          await api.sendMessage(styledMessage("Technique Upgrade", bodyText, "🔧"), threadID, replyMessageID);
          global.Kagenou.replyListeners.delete(sentMessageID);
        }
      });
      return;
    }

    const subcommands = jjkCommand.config.usage
      .replace(/\[|\]/g, "")
      .split(" | ")
      .map(cmd => `${prefix}jjk ${cmd}`)
      .join("\n");
    await api.sendMessage(
      styledMessage(
        "Jujutsu Kaisen Game",
        `ℹ️ Usage:\n${subcommands}`,
        "🔮"
      ),
      threadID,
      messageID
    );
  }
};

export default jjkCommand;