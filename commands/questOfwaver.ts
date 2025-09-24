import AuroraBetaStyler from "../core/plugins/aurora-beta-styler";
import { v4 as uuidv4 } from 'uuid';

namespace ShadowBot {
  export interface Command {
    config: {
      name: string;
      description: string;
      usage: string;
      aliases?: string[];
      category?: string;
    };
    run: (context: { api: any; event: any; args: string[]; db?: { db: (collectionName: string) => any } | null }) => Promise<void>;
  }
}

interface UserData {
  userID: string;
  name: string;
  level: number;
  exp: number;
  health: number;
  mana: number;
  gold: number;
  inventory: { items: { [key: string]: number }; weapons: { [key: string]: number } };
  currentChapter: number;
  completedQuests: string[];
  activeQuest?: QuestData;
  storyProgress: { [chapter: number]: { completed: boolean; choices: { [key: string]: string } } };
}

interface QuestData {
  id: string;
  name: string;
  description: string;
  objectives: { [key: string]: { goal: number; progress: number } };
  rewards: { exp: number; gold: number; items?: { [key: string]: number } };
  storyText: string;
  requiredLevel: number;
  chapter: number;
}

interface StoryChapter {
  id: number;
  title: string;
  description: string;
  quests: string[];
  unlockRequirements: { level: number; previousChapter?: number };
  endingChoices?: { [choice: string]: { outcome: string; rewards: { exp: number; gold: number } } };
}

const storyChapters: StoryChapter[] = [
  {
    id: 1,
    title: "The Awakening",
    description: "You awaken in the mystical land of Waver, a world torn by ancient curses. Your journey begins as a novice adventurer seeking the legendary Waver Artifact to restore balance.",
    quests: ["gather_herbs", "defeat_goblins"],
    unlockRequirements: { level: 1 },
  },
  {
    id: 2,
    title: "The Forest Trials",
    description: "Venture into the Enchanted Forest, facing trials that test your courage. Uncover secrets of the ancient elves and make choices that shape your destiny.",
    quests: ["elf_alliance", "forest_boss"],
    unlockRequirements: { level: 5, previousChapter: 1 },
    endingChoices: {
      "ally_with_elves": { outcome: "You gain elf allies, boosting your mana.", rewards: { exp: 1000, gold: 500 } },
      "betray_elves": { outcome: "You steal their artifact, gaining power but enemies.", rewards: { exp: 1500, gold: 300 } },
    },
  },
  {
    id: 3,
    title: "The Mountain Ascent",
    description: "Climb the treacherous mountains to confront the dragon guardian. Your choices here will determine if you befriend or slay the beast.",
    quests: ["climb_mountain", "dragon_encounter"],
    unlockRequirements: { level: 10, previousChapter: 2 },
    endingChoices: {
      "befriend_dragon": { outcome: "The dragon becomes your mount, enhancing travel and combat.", rewards: { exp: 2000, gold: 1000 } },
      "slay_dragon": { outcome: "You claim the dragon's hoard, but attract hunters.", rewards: { exp: 2500, gold: 1500 } },
    },
  },
];

const questsData: { [key: string]: QuestData } = {
  gather_herbs: {
    id: "gather_herbs",
    name: "Gather Healing Herbs",
    description: "Collect 10 healing herbs from the village outskirts to prove your worth.",
    objectives: { herbs: { goal: 10, progress: 0 } },
    rewards: { exp: 200, gold: 50, items: { health_potion: 2 } },
    storyText: "The village elder sends you on your first task, teaching you the basics of survival in Waver.",
    requiredLevel: 1,
    chapter: 1,
  },
  defeat_goblins: {
    id: "defeat_goblins",
    name: "Defeat the Goblin Raiders",
    description: "Slay 5 goblins terrorizing the village.",
    objectives: { goblins: { goal: 5, progress: 0 } },
    rewards: { exp: 300, gold: 100, items: { iron_sword: 1 } },
    storyText: "Goblins have been spotted! Defend the village and earn the trust of the people.",
    requiredLevel: 2,
    chapter: 1,
  },
  elf_alliance: {
    id: "elf_alliance",
    name: "Form Alliance with Elves",
    description: "Negotiate with the elf queen by completing her trials.",
    objectives: { trials: { goal: 3, progress: 0 } },
    rewards: { exp: 500, gold: 200 },
    storyText: "The elves hold ancient knowledge about the Waver Artifact. Will you earn their alliance?",
    requiredLevel: 5,
    chapter: 2,
  },
  forest_boss: {
    id: "forest_boss",
    name: "Defeat the Forest Guardian",
    description: "Battle the corrupted treant boss.",
    objectives: { boss: { goal: 1, progress: 0 } },
    rewards: { exp: 800, gold: 300, items: { elf_bow: 1 } },
    storyText: "The forest's heart is corrupted. Purge it to advance.",
    requiredLevel: 7,
    chapter: 2,
  },
};

// Temporary in-memory map to store UUID-to-quest-ID mappings for each quest list request
const questUuidMap: { [uuid: string]: string } = {};

const questOfWaverCommand: ShadowBot.Command = {
  config: {
    name: "quest-of-waver",
    description: "Embark on an epic story-driven adventure in the world of Waver!",
    usage: "/quest-of-waver help | /qow register <name> | /qow status | /qow quest list | /qow quest accept <uuid> | /qow quest progress <objective> | /qow quest complete | /qow chapter progress | /qow chapter choice <choice> | /qow battle | /qow shop | /qow buy <item> | /qow use <item> | /qow leaderboard",
    aliases: ["qow"],
    category: "Games 🎮",
  },
  run: async ({ api, event, args, db }) => {
    if (!db) {
      await api.sendMessage("Database not available.", event.threadID, event.messageID);
      return;
    }
    const { threadID, messageID, senderID } = event;
    const action = args[0]?.toLowerCase();
    const userData = await getUserData(db, senderID.toString());
    const currentTime = Math.floor(Date.now() / 1000);

    if (action === "help") {
      const helpMessage = AuroraBetaStyler.styleOutput({
        headerText: "Quest of Waver Help",
        headerSymbol: "📖",
        headerStyle: "bold",
        bodyText: `Usage: ${questOfWaverCommand.config.usage}`,
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(helpMessage, threadID, messageID);
      return;
    }

    if (action === "register") {
      const name = args.slice(1).join(" ");
      if (!name) {
        const errorMessage = AuroraBetaStyler.styleOutput({
          headerText: "Quest of Waver",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "Please provide a name. Usage: /qow register <name>",
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(errorMessage, threadID, messageID);
        return;
      }
      if (userData.name) {
        const alreadyRegistered = AuroraBetaStyler.styleOutput({
          headerText: "Quest of Waver",
          headerSymbol: "🛑",
          headerStyle: "bold",
          bodyText: `You are already registered as ${userData.name}.`,
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(alreadyRegistered, threadID, messageID);
        return;
      }
      userData.name = name;
      userData.level = 1;
      userData.exp = 0;
      userData.health = 100;
      userData.mana = 50;
      userData.gold = 100;
      userData.inventory = { items: { health_potion: 3 }, weapons: { basic_sword: 1 } };
      userData.currentChapter = 1;
      userData.completedQuests = [];
      userData.storyProgress = { 1: { completed: false, choices: {} } };
      await saveUserData(db, senderID.toString(), userData);
      const registerMessage = AuroraBetaStyler.styleOutput({
        headerText: "Quest of Waver",
        headerSymbol: "✅",
        headerStyle: "bold",
        bodyText: `Welcome, ${name}! Your adventure in Waver begins. Use /qow status to check your progress.`,
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(registerMessage, threadID, messageID);
      return;
    }

    if (!userData.name) {
      const notRegistered = AuroraBetaStyler.styleOutput({
        headerText: "Quest of Waver",
        headerSymbol: "⚠️",
        headerStyle: "bold",
        bodyText: "You need to register first. Usage: /qow register <name>",
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(notRegistered, threadID, messageID);
      return;
    }

    if (action === "status") {
      const inventoryItems = Object.entries(userData.inventory.items).map(([k, v]) => `${k.replace("_", " ")} x${v}`).join(", ") || "None";
      const weapons = Object.entries(userData.inventory.weapons).map(([k, v]) => `${k.replace("_", " ")} (Lvl ${v})`).join(", ") || "None";
      const activeQuestInfo = userData.activeQuest ? `${userData.activeQuest.name}: ${Object.entries(userData.activeQuest.objectives).map(([obj, { progress, goal }]) => `${obj} (${progress}/${goal})`).join(", ")}` : "None";
      const statusMessage = AuroraBetaStyler.styleOutput({
        headerText: "Adventurer Status",
        headerSymbol: "📊",
        headerStyle: "bold",
        bodyText: `Name: ${userData.name}\nLevel: ${userData.level}\nEXP: ${userData.exp}\nHealth: ${userData.health}\nMana: ${userData.mana}\nGold: ${userData.gold}\nCurrent Chapter: ${userData.currentChapter} (${storyChapters.find(c => c.id === userData.currentChapter)?.title || "Unknown"})\nActive Quest: ${activeQuestInfo}\nInventory: ${inventoryItems}\nWeapons: ${weapons}`,
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(statusMessage, threadID, messageID);
      return;
    }

    if (action === "quest" && args[1]?.toLowerCase() === "list") {
      // Clear previous UUID mappings for this session
      Object.keys(questUuidMap).forEach(key => delete questUuidMap[key]);
      
      const currentChapterQuests = storyChapters.find(c => c.id === userData.currentChapter)?.quests || [];
      const availableQuests = currentChapterQuests
        .filter(q => !userData.completedQuests.includes(q) && questsData[q].requiredLevel <= userData.level)
        .map(q => {
          const uuid = uuidv4();
          questUuidMap[uuid] = q; // Map UUID to quest ID
          return `- ${questsData[q].name}: ${questsData[q].description} (Lvl ${questsData[q].requiredLevel})\n  Quest ID: ${uuid}`;
        })
        .join("\n\n") || "No available quests in this chapter.";
      const questMessage = AuroraBetaStyler.styleOutput({
        headerText: "Available Quests",
        headerSymbol: "📜",
        headerStyle: "bold",
        bodyText: availableQuests,
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(questMessage, threadID, messageID);
      return;
    }

    if (action === "quest" && args[1]?.toLowerCase() === "accept") {
      const questUuid = args[2];
      const questId = questUuidMap[questUuid];
      if (!questUuid || !questId || !questsData[questId]) {
        const invalidQuest = AuroraBetaStyler.styleOutput({
          headerText: "Quest of Waver",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "Invalid quest UUID. Use /qow quest list to see available quests and their UUIDs.",
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(invalidQuest, threadID, messageID);
        return;
      }
      const quest = questsData[questId];
      if (userData.activeQuest || userData.completedQuests.includes(questId) || quest.requiredLevel > userData.level || quest.chapter !== userData.currentChapter) {
        const cannotAccept = AuroraBetaStyler.styleOutput({
          headerText: "Quest of Waver",
          headerSymbol: "🛑",
          headerStyle: "bold",
          bodyText: "Cannot accept this quest. Check if it's available, not completed, or if you meet the requirements.",
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(cannotAccept, threadID, messageID);
        return;
      }
      userData.activeQuest = { ...quest, objectives: Object.fromEntries(Object.entries(quest.objectives).map(([k, v]) => [k, { ...v, progress: 0 }])) };
      await saveUserData(db, senderID.toString(), userData);
      const acceptMessage = AuroraBetaStyler.styleOutput({
        headerText: "Quest Accepted",
        headerSymbol: "✅",
        headerStyle: "bold",
        bodyText: `${quest.storyText}\n\nQuest: ${quest.name}\nObjectives: ${Object.entries(quest.objectives).map(([obj, { goal }]) => `${obj} (0/${goal})`).join(", ")}`,
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(acceptMessage, threadID, messageID);
      return;
    }

    if (action === "quest" && args[1]?.toLowerCase() === "progress") {
      if (!userData.activeQuest) {
        const noActiveQuest = AuroraBetaStyler.styleOutput({
          headerText: "Quest of Waver",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "No active quest. Accept one first.",
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(noActiveQuest, threadID, messageID);
        return;
      }
      const objective = args[2]?.toLowerCase();
      if (!objective || !userData.activeQuest.objectives[objective]) {
        const invalidObjective = AuroraBetaStyler.styleOutput({
          headerText: "Quest of Waver",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "Invalid objective. Check /qow status for current objectives.",
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(invalidObjective, threadID, messageID);
        return;
      }
      userData.activeQuest.objectives[objective].progress += 1;
      await saveUserData(db, senderID.toString(), userData);
      const progressMessage = AuroraBetaStyler.styleOutput({
        headerText: "Quest Progress",
        headerSymbol: "📈",
        headerStyle: "bold",
        bodyText: `Updated ${objective}: ${userData.activeQuest.objectives[objective].progress}/${userData.activeQuest.objectives[objective].goal}`,
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(progressMessage, threadID, messageID);
      return;
    }

    if (action === "quest" && args[1]?.toLowerCase() === "complete") {
      if (!userData.activeQuest) {
        const noActiveQuest = AuroraBetaStyler.styleOutput({
          headerText: "Quest of Waver",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "No active quest to complete.",
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(noActiveQuest, threadID, messageID);
        return;
      }
      const allCompleted = Object.values(userData.activeQuest.objectives).every(o => o.progress >= o.goal);
      if (!allCompleted) {
        const notComplete = AuroraBetaStyler.styleOutput({
          headerText: "Quest of Waver",
          headerSymbol: "🛑",
          headerStyle: "bold",
          bodyText: "Quest objectives not fully completed. Check /qow status.",
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(notComplete, threadID, messageID);
        return;
      }
      userData.exp += userData.activeQuest.rewards.exp;
      userData.gold += userData.activeQuest.rewards.gold;
      if (userData.activeQuest.rewards.items) {
        for (const [item, qty] of Object.entries(userData.activeQuest.rewards.items)) {
          userData.inventory.items[item] = (userData.inventory.items[item] || 0) + qty;
        }
      }
      userData.level = Math.floor(userData.exp / 1000) + 1;
      userData.completedQuests.push(userData.activeQuest.id);
      userData.activeQuest = undefined;
      await saveUserData(db, senderID.toString(), userData);
      const completeMessage = AuroraBetaStyler.styleOutput({
        headerText: "Quest Completed",
        headerSymbol: "🎉",
        headerStyle: "bold",
        bodyText: `Gained ${userData.activeQuest?.rewards.exp} EXP and ${userData.activeQuest?.rewards.gold} Gold. New Level: ${userData.level}.`,
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(completeMessage, threadID, messageID);
      return;
    }

    if (action === "chapter" && args[1]?.toLowerCase() === "progress") {
      const currentChapter = storyChapters.find(c => c.id === userData.currentChapter);
      if (!currentChapter) {
        const invalidChapter = AuroraBetaStyler.styleOutput({
          headerText: "Quest of Waver",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "Invalid chapter.",
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(invalidChapter, threadID, messageID);
        return;
      }
      const completedQuestsInChapter = currentChapter.quests.every(q => userData.completedQuests.includes(q));
      const chapterMessage = AuroraBetaStyler.styleOutput({
        headerText: `Chapter ${currentChapter.id}: ${currentChapter.title}`,
        headerSymbol: "📖",
        headerStyle: "bold",
        bodyText: `${currentChapter.description}\n\nProgress: ${completedQuestsInChapter ? "Completed" : "In Progress"}\nQuests: ${currentChapter.quests.map(q => `${questsData[q].name} (${userData.completedQuests.includes(q) ? "Done" : "Pending"})`).join("\n")}`,
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(chapterMessage, threadID, messageID);
      if (completedQuestsInChapter && currentChapter.endingChoices) {
        const choiceMessage = AuroraBetaStyler.styleOutput({
          headerText: "Chapter Ending Choice",
          headerSymbol: "🤔",
          headerStyle: "bold",
          bodyText: `Choose an ending: ${Object.keys(currentChapter.endingChoices).map(c => `- ${c.replace("_", " ")}`).join("\n")}\nUse /qow chapter choice <choice>`,
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(choiceMessage, threadID, messageID);
      }
      return;
    }

    if (action === "chapter" && args[1]?.toLowerCase() === "choice") {
      const choice = args[2]?.toLowerCase()?.replace(/\s+/g, "_");
      const currentChapter = storyChapters.find(c => c.id === userData.currentChapter);
      if (!currentChapter || !currentChapter.endingChoices || !currentChapter.endingChoices[choice]) {
        const invalidChoice = AuroraBetaStyler.styleOutput({
          headerText: "Quest of Waver",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "Invalid choice or chapter not ready for ending.",
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(invalidChoice, threadID, messageID);
        return;
      }
      const outcome = currentChapter.endingChoices[choice];
      userData.exp += outcome.rewards.exp;
      userData.gold += outcome.rewards.gold;
      userData.level = Math.floor(userData.exp / 1000) + 1;
      userData.storyProgress[userData.currentChapter].choices["ending"] = choice;
      userData.storyProgress[userData.currentChapter].completed = true;
      userData.currentChapter += 1;
      userData.storyProgress[userData.currentChapter] = { completed: false, choices: {} };
      await saveUserData(db, senderID.toString(), userData);
      const choiceMessage = AuroraBetaStyler.styleOutput({
        headerText: "Chapter Ending",
        headerSymbol: "🏆",
        headerStyle: "bold",
        bodyText: `${outcome.outcome}\nGained ${outcome.rewards.exp} EXP and ${outcome.rewards.gold} Gold. Advancing to Chapter ${userData.currentChapter}.`,
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(choiceMessage, threadID, messageID);
      return;
    }

    if (action === "battle") {
      if (userData.health <= 0) {
        const deadMessage = AuroraBetaStyler.styleOutput({
          headerText: "Quest of Waver Battle",
          headerSymbol: "💀",
          headerStyle: "bold",
          bodyText: "You are defeated! Use a health potion or wait to recover.",
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(deadMessage, threadID, messageID);
        return;
      }
      const enemyStrength = Math.floor(Math.random() * userData.level * 10) + 50;
      const playerStrength = userData.level * 10 + Object.values(userData.inventory.weapons).reduce((a, b) => a + b, 0);
      const win = playerStrength > enemyStrength;
      if (win) {
        userData.exp += 100;
        userData.gold += 50;
        userData.level = Math.floor(userData.exp / 1000) + 1;
        const winMessage = AuroraBetaStyler.styleOutput({
          headerText: "Quest of Waver Battle",
          headerSymbol: "⚔️",
          headerStyle: "bold",
          bodyText: "Victory! Gained 100 EXP and 50 Gold. New Level: " + userData.level,
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(winMessage, threadID, messageID);
      } else {
        userData.health -= 20;
        const loseMessage = AuroraBetaStyler.styleOutput({
          headerText: "Quest of Waver Battle",
          headerSymbol: "💥",
          headerStyle: "bold",
          bodyText: "Defeat! Lost 20 Health. Current Health: " + userData.health,
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(loseMessage, threadID, messageID);
      }
      await saveUserData(db, senderID.toString(), userData);
      return;
    }

    if (action === "shop") {
      const shopItems = {
        health_potion: { cost: 50, description: "Restores 50 Health" },
        mana_potion: { cost: 60, description: "Restores 30 Mana" },
        iron_sword: { cost: 200, description: "Lvl 2 Weapon" },
      };
      const shopMessage = AuroraBetaStyler.styleOutput({
        headerText: "Quest of Waver Shop",
        headerSymbol: "🛍️",
        headerStyle: "bold",
        bodyText: Object.entries(shopItems).map(([key, { cost, description }]) => `- ${key.replace("_", " ")}: ${description} (Cost: ${cost} Gold)`).join("\n"),
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(shopMessage, threadID, messageID);
      return;
    }

    if (action === "buy") {
      const item = args[1]?.toLowerCase()?.replace(/\s+/g, "_");
      const shopItems = {
        health_potion: { cost: 50 },
        mana_potion: { cost: 60 },
        iron_sword: { cost: 200 },
      };
      if (!item || !shopItems[item]) {
        const invalidItem = AuroraBetaStyler.styleOutput({
          headerText: "Quest of Waver Shop",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "Invalid item. Use /qow shop to see available items.",
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(invalidItem, threadID, messageID);
        return;
      }
      const cost = shopItems[item].cost;
      if (userData.gold < cost) {
        const insufficientGold = AuroraBetaStyler.styleOutput({
          headerText: "Quest of Waver Shop",
          headerSymbol: "❌",
          headerStyle: "bold",
          bodyText: "Not enough gold.",
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(insufficientGold, threadID, messageID);
        return;
      }
      userData.gold -= cost;
      if (item.includes("potion")) {
        userData.inventory.items[item] = (userData.inventory.items[item] || 0) + 1;
      } else {
        userData.inventory.weapons[item] = (userData.inventory.weapons[item] || 0) + 1;
      }
      await saveUserData(db, senderID.toString(), userData);
      const buyMessage = AuroraBetaStyler.styleOutput({
        headerText: "Quest of Waver Shop",
        headerSymbol: "✅",
        headerStyle: "bold",
        bodyText: `Purchased ${item.replace("_", " ")}.`,
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(buyMessage, threadID, messageID);
      return;
    }

    if (action === "use") {
      const item = args[1]?.toLowerCase()?.replace(/\s+/g, "_");
      if (!item || !userData.inventory.items[item]) {
        const invalidItem = AuroraBetaStyler.styleOutput({
          headerText: "Quest of Waver Use",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "Invalid item or not in inventory.",
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(invalidItem, threadID, messageID);
        return;
      }
      if (item === "health_potion") {
        userData.health = Math.min(100, userData.health + 50);
      } else if (item === "mana_potion") {
        userData.mana = Math.min(100, userData.mana + 30);
      }
      userData.inventory.items[item] -= 1;
      if (userData.inventory.items[item] <= 0) delete userData.inventory.items[item];
      await saveUserData(db, senderID.toString(), userData);
      const useMessage = AuroraBetaStyler.styleOutput({
        headerText: "Quest of Waver Use",
        headerSymbol: "🧪",
        headerStyle: "bold",
        bodyText: `Used ${item.replace("_", " ")}. Updated stats: Health ${userData.health}, Mana ${userData.mana}.`,
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(useMessage, threadID, messageID);
      return;
    }

    if (action === "leaderboard") {
      const usersCollection = db.db("users");
      const topUsers = await usersCollection
        .find({})
        .sort({ exp: -1 })
        .limit(10)
        .toArray();
      const leaderboardMessage = AuroraBetaStyler.styleOutput({
        headerText: "Quest of Waver Leaderboard",
        headerSymbol: "🏆",
        headerStyle: "bold",
        bodyText: topUsers.map((u, i) => `${i + 1}. ${u.name} (Level ${u.level}, EXP ${u.exp})`).join("\n") || "No adventurers yet.",
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(leaderboardMessage, threadID, messageID);
      return;
    }

    const invalidCommand = AuroraBetaStyler.styleOutput({
      headerText: "Quest of Waver",
      headerSymbol: "⚠️",
      headerStyle: "bold",
      bodyText: "Invalid command. Check usage with /qow help.",
      bodyStyle: "bold",
      footerText: "",
    });
    await api.sendMessage(invalidCommand, threadID, messageID);
  },
};

async function getUserData(db: any, userID: string): Promise<UserData> {
  const usersCollection = db.db("users");
  let userData = await usersCollection.findOne({ userID });
  if (!userData) {
    userData = {
      userID,
      name: "",
      level: 1,
      exp: 0,
      health: 100,
      mana: 50,
      gold: 0,
      inventory: { items: {}, weapons: {} },
      currentChapter: 1,
      completedQuests: [],
      storyProgress: {},
    };
    await saveUserData(db, userID, userData);
  }
  return userData;
}

async function saveUserData(db: any, userID: string, data: UserData): Promise<void> {
  const usersCollection = db.db("users");
  await usersCollection.updateOne({ userID }, { $set: data }, { upsert: true });
}

export default questOfWaverCommand;