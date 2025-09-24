
import AuroraBetaStyler from "../core/plugins/aurora-beta-styler";

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

interface HunterData {
  userID: string;
  name?: string;
  nameS2?: string;
  level: number;
  exp: number;
  expS2: number;
  rank: string;
  role?: string;
  equipment: { swords: { [key: string]: number } };
  inventory: { potions: { [key: string]: number }; materials: { [key: string]: number } };
  inventoryS2: { magicCrystals: number; holyCrystals: number; items: { [key: string]: number } };
  shadows: { name: string; nickname: string; level?: number }[];
  shadowsS2: { name: string; nickname: string; level?: number }[];
  stats: { strength: number; agility: number; mana: number };
  dungeonCooldown: number;
  dungeonCooldownS2: number;
  quests: { [key: string]: { goal: number; progress: number; reward: number; completed: boolean; description: string; timestamp?: number; target?: string } };
  guild?: string;
  guildS2?: string;
  meditateCooldown: number;
  warCooldownS2: number;
  lostShadows?: { name: string; nickname: string }[];
  lostShadowsS2?: { name: string; nickname: string }[];
  hasChangedName?: boolean;
  gateCooldown?: number;
}

interface GuildData {
  name: string;
  members: string[];
  totalStrength: number;
  hasChangedName?: boolean;
  isSeason2?: boolean; // Flag for Season 2 guilds
}

const soloLevelingCommand: ShadowBot.Command = {
  config: {
    name: "solo-leveling",
    description: "Embark on a Solo Leveling adventure as a hunter! Season 2 included!",
    usage: "/solo-leveling register <name> | /sl status | /sl battle | /sl battle X | /sl shop | /sl buy <item> <quantity> | /sl use <potion> <quantity> | /sl dungeon <tier> | /sl train <stat> | /sl quest | /sl guild [create <name> | join <guild name> | leave | fight <guild name> | list | changename <new name>] | /sl leaderboard | /sl meditate | /sl shadowlist | /sl setrole <class> | /sl changename <newname> | /sl gate enter <class> | /sl s2 register | /sl s2 war | /sl s2 status | /sl s2 battle | /sl s2 shop | /sl s2 dungeon <class tier> | /sl s2 guild [create <name> | leave | list | war] | /sl s2 inventory",
    aliases: ["sl"],
    category: "Games 🎮",
  },
  run: async ({ api, event, args, db }) => {
    if (!db) {
      await api.sendMessage("Database not available.", event.threadID, event.messageID);
      return;
    }
    const { threadID, messageID, senderID } = event;
    const action = args[0]?.toLowerCase();
    const userData = await getHunterData(db, senderID.toString());
    const currentTime = Math.floor(Date.now() / 1000);
    const dungeonCooldown = 3600;
    const dungeonCooldownS2 = 3600; // 1 hour for S2 dungeon
    const meditateCooldown = 1800;
    const gateCooldown = 1800; // 30 minutes for gate enter
    const warCooldownS2 = 300; // 5 minutes for S2 war

    // Season 2 character list (60 named hunters from Solo Leveling)
    const s2Characters = [
      "Sung Jin-Woo", "Cha Hae-In", "Baek Yoonho", "Choi Jong-In", "Woo Jinchul",
      "Yoo Jinho", "Lee Joohee", "Park Heejin", "Kang Taeshik", "Kim Chul",
      "Go Gunhee", "Thomas Andre", "Liu Zhigang", "Goto Ryuji", "Hwang Dongsoo",
      "Lennart Niermann", "Selner", "Norma Selner", "Adam White", "Esil Radiru",
      "Beru", "Igris", "Tusk", "Baruka", "Kamish", "Ant King", "Monarch of Destruction",
      "Ashborn", "Ruler's Shadow", "Blood-Red Commander Igris", "Sung Il-Hwan",
      "Hwang Dongsuk", "Song Chi-Yul", "Kim Sangshik", "Han Song-Yi",
      "Yoo Soohyun", "Jung Yerim", "Park Beom-Shik", "Kim Cheol", "Lee Min-Sung",
      "Eunseok", "Woo Seok-Hyun", "Kang Jeongho", "Choi Minwoo", "Son Kihoon",
      "Tae Gyu", "Min Byung-Gyu", "Joo Jae-Hwan", "Lee Eun-Joo", "Park Jongsoo",
      "Ahn Sangmin", "Joo Hee", "Kim Dong-Wook", "Shin Hyung-Sik", "Lim Tae-Gyu",
      "Ma Dong-Wook", "Jung Yoontae", "Yoon Gijoong", "Kim Lakhyun", "Choi Yooshik"
    ].sort(); // Sorted for consistent display

    if (action === "s2" && args[1]?.toLowerCase() === "register") {
      if (userData.nameS2) {
        const alreadyRegistered = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Season 2",
          headerSymbol: "🛑",
          headerStyle: "bold",
          bodyText: `You are already registered as ${userData.nameS2} in Season 2. Use /sl s2 status to check your stats.`,
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(alreadyRegistered, threadID, messageID);
        return;
      }
      const characterList = s2Characters.map((char, i) => `${i + 1}. ${char}`).join("\n");
      const registerMessage = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling Season 2 Registration",
        headerSymbol: "📋",
        headerStyle: "bold",
        bodyText: `Please choose a character by replying with the number:\n${characterList}`,
        bodyStyle: "bold",
        footerText: "",
      });
      let sentMessageID: string;
      await new Promise((resolve) => {
        api.sendMessage(registerMessage, threadID, (err, info) => {
          if (err) resolve(err);
          else {
            sentMessageID = info.messageID;
            resolve(info);
          }
        }, messageID);
      });
      if (!global.Kagenou.replyListeners) global.Kagenou.replyListeners = new Map();
      const handleReply = async ({ api, event }) => {
        const reply = parseInt(event.body.trim());
        if (isNaN(reply) || reply < 1 || reply > s2Characters.length) {
          await api.sendMessage(
            AuroraBetaStyler.styleOutput({
              headerText: "Solo Leveling Season 2",
              headerSymbol: "⚠️",
              headerStyle: "bold",
              bodyText: "Invalid character number. Please reply with a valid number.",
              bodyStyle: "bold",
              footerText: "",
            }),
            threadID,
            event.messageID
          );
          return;
        }
        const selectedCharacter = s2Characters[reply - 1];
        const huntersCollection = db.db("hunters");
        const existingHunter = await huntersCollection.findOne({ nameS2: selectedCharacter });
        if (existingHunter) {
          await api.sendMessage(
            AuroraBetaStyler.styleOutput({
              headerText: "Solo Leveling Season 2",
              headerSymbol: "🛑",
              headerStyle: "bold",
              bodyText: `The character "${selectedCharacter}" is already taken. Please choose another.`,
              bodyStyle: "bold",
              footerText: "",
            }),
            threadID,
            event.messageID
          );
          return;
        }
        userData.nameS2 = selectedCharacter;
        userData.expS2 = 0;
        userData.inventoryS2 = { magicCrystals: 0, holyCrystals: 0, items: {} };
        userData.shadowsS2 = [];
        userData.dungeonCooldownS2 = 0;
        userData.warCooldownS2 = 0;
        userData.lostShadowsS2 = [];
        await saveHunterData(db, senderID.toString(), userData);
        await api.sendMessage(
          AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Season 2",
            headerSymbol: "✅",
            headerStyle: "bold",
            bodyText: `Registered as ${selectedCharacter} in Season 2! Use /sl s2 status to check your stats.`,
            bodyStyle: "bold",
            footerText: "",
          }),
          threadID,
          event.messageID
        );
      };
      global.Kagenou.replyListeners.set(sentMessageID, { callback: handleReply });
      return;
    }

    if (action === "s2" && args[1]?.toLowerCase() === "war") {
      if (!userData.nameS2) {
        const notRegistered = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Season 2",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "You need to register for Season 2 first. Usage: /sl s2 register",
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(notRegistered, threadID, messageID);
        return;
      }
      if (Math.max(0, Number(userData.warCooldownS2) || 0) > currentTime) {
        const remaining = Math.max(0, Number(userData.warCooldownS2) || 0) - currentTime;
        const cooldownMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Season 2 War",
          headerSymbol: "⏳",
          headerStyle: "bold",
          bodyText: `Cooldown active. Wait ${Math.ceil(remaining / 60)} minutes.`,
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(cooldownMessage, threadID, messageID);
        return;
      }
      const magicCrystals = Math.floor(Math.random() * 5) + 1;
      const holyCrystals = Math.floor(Math.random() * 3) + 1;
      userData.inventoryS2.magicCrystals = Math.max(0, Number(userData.inventoryS2.magicCrystals) || 0) + magicCrystals;
      userData.inventoryS2.holyCrystals = Math.max(0, Number(userData.inventoryS2.holyCrystals) || 0) + holyCrystals;
      userData.warCooldownS2 = currentTime + warCooldownS2;
      await saveHunterData(db, senderID.toString(), userData);
      const warMessage = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling Season 2 War",
        headerSymbol: "⚔️",
        headerStyle: "bold",
        bodyText: `You fought in a war! Gained ${magicCrystals} Magic Crystals and ${holyCrystals} Holy Crystals.`,
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(warMessage, threadID, messageID);
      return;
    }

    if (action === "s2" && args[1]?.toLowerCase() === "status") {
      if (!userData.nameS2) {
        const notRegistered = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Season 2",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "You need to register for Season 2 first. Usage: /sl s2 register",
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(notRegistered, threadID, messageID);
        return;
      }
      const stats = userData.stats || { strength: 0, agility: 0, mana: 0 };
      const statusMessage = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling Season 2 Status",
        headerSymbol: "📊",
        headerStyle: "bold",
        bodyText: `Name: ${userData.nameS2}\nLevel: ${Math.max(1, Number(userData.level) || 1)}\nEXP: ${Math.max(0, Number(userData.expS2) || 0)}\nRank: ${userData.rank || "E"}\nGuild: ${userData.guildS2 || "None"}\nShadows: ${userData.shadowsS2.length > 0 ? userData.shadowsS2.map(s => `${s.name} (${s.nickname})`).join(", ") : "None"}\nStats: Strength ${Math.max(0, Number(stats.strength) || 0)}, Agility ${Math.max(0, Number(stats.agility) || 0)}, Mana ${Math.max(0, Number(stats.mana) || 0)}\nMagic Crystals: ${Math.max(0, Number(userData.inventoryS2.magicCrystals) || 0)}\nHoly Crystals: ${Math.max(0, Number(userData.inventoryS2.holyCrystals) || 0)}`,
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(statusMessage, threadID, messageID);
      return;
    }

    if (action === "leaderboard") {
      const huntersCollection = db.db("hunters");
      const topHunters = await huntersCollection
        .find({})
        .sort({ exp: -1 })
        .limit(10)
        .toArray();
      const leaderboardMessage = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling S1 Leaderboard",
        headerSymbol: "🏆",
        headerStyle: "bold",
        bodyText: topHunters.length > 0
          ? topHunters.map((h, i) => `${i + 1}. ${h.name} (Level ${Math.max(1, Number(h.level) || 1)}, ${Math.max(0, Number(h.exp) || 0)} EXP, Rank ${h.rank || "E"})`).join("\n")
          : "No hunters ranked yet.",
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(leaderboardMessage, threadID, messageID);
      return;
    }

    if (action === "s2" && args[1]?.toLowerCase() === "battle") {
      if (!userData.nameS2) {
        const notRegistered = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Season 2",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "You need to register for Season 2 first. Usage: /sl s2 register",
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(notRegistered, threadID, messageID);
        return;
      }
      const stats = userData.stats || { strength: 0, agility: 0, mana: 0 };
      const normalEnemies = [
        "Kang Taeshik", "Kim Chul", "Yoo Jinho", "Lee Joohee", "Park Heejin",
        "Cha Hae-In", "Baek Yoonho", "Choi Jong-In", "Maharaga", "Igris",
        "Beru", "Tusk", "Baruka", "Cerberus", "Blood-Red Commander Igris",
        "High Orc", "Ice Bear", "Frost Giant", "Flame Bear"
      ];
      const shadowMonarchs = ["Kamish", "Ant King", "Monarch of Destruction", "Ruler's Shadow", "Ashborn"];
      const allEnemies = userData.rank === "S" || userData.rank === "X" ? [...normalEnemies, ...shadowMonarchs] : normalEnemies;
      const enemy = allEnemies[Math.floor(Math.random() * allEnemies.length)];
      const isMonarch = shadowMonarchs.includes(enemy);
      const win = Math.random() < 0.7 || userData.rank === "X"; // 70% win chance
      let battleMessage;
      if (win) {
        stats.strength = Math.max(0, Number(stats.strength) || 0) + 100;
        stats.agility = Math.max(0, Number(stats.agility) || 0) + 100;
        stats.mana = Math.max(0, Number(stats.mana) || 0) + 100;
        userData.expS2 = Math.max(0, Number(userData.expS2) || 0) + 1000;
        userData.level = Math.max(1, Math.floor(userData.expS2 / 1000) + 1);
        applyRankProgression(userData);
        battleMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Season 2 Battle",
          headerSymbol: "⚔️",
          headerStyle: "bold",
          bodyText: `Victory! ${userData.nameS2} defeated ${enemy}! Gained +100 Strength, +100 Agility, +100 Mana, 1000 EXP. New Level: ${userData.level}, Rank: ${userData.rank}${isMonarch && userData.rank === "S" ? `. Reply with 'arise ${enemy} <nickname>' to awaken this Shadow Monarch!` : "."}`,
          bodyStyle: "bold",
          footerText: "",
        });
      } else {
        userData.expS2 = Math.max(0, Number(userData.expS2) || 0) + 200;
        userData.level = Math.max(1, Math.floor(userData.expS2 / 1000) + 1);
        applyRankProgression(userData);
        battleMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Season 2 Battle",
          headerSymbol: "💥",
          headerStyle: "bold",
          bodyText: `Defeated by ${enemy}! Gained 200 EXP. New Level: ${userData.level}, Rank: ${userData.rank}. Train harder!`,
          bodyStyle: "bold",
          footerText: "",
        });
      }
      userData.stats = stats;
      await saveHunterData(db, senderID.toString(), userData);
      if (win && isMonarch && userData.rank === "S") {
        let sentMessageID: string;
        await new Promise((resolve) => {
          api.sendMessage(battleMessage, threadID, (err, info) => {
            if (err) resolve(err);
            else {
              sentMessageID = info.messageID;
              resolve(info);
            }
          }, messageID);
        });
        if (!global.Kagenou.replyListeners) global.Kagenou.replyListeners = new Map();
        const handleReply = async ({ api, event }) => {
          const { body } = event;
          const reply = body.toLowerCase().trim().split(" ");
          if (reply[0] === "arise") {
            const inputEnemy = reply[1]?.replace(/_/g, " ");
            const normalizedEnemy = shadowMonarchs.find(m => m.toLowerCase() === inputEnemy);
            if (normalizedEnemy) {
              const nickname = reply.slice(2).join(" ") || `${normalizedEnemy.toLowerCase()}Shadow`;
              const statBoosts = {
                "Kamish": { strength: 100, agility: 50, mana: 200 },
                "Ant King": { strength: 150, mana: 200 },
                "Monarch of Destruction": { agility: 100, mana: 300 },
                "Ruler's Shadow": { strength: 200, agility: 50 },
                "Ashborn": { strength: 500, agility: 500, mana: 1000 }
              };
              const boosts = statBoosts[normalizedEnemy] || { strength: 20, agility: 20, mana: 20 };
              userData.stats.strength = Math.max(0, Number(userData.stats.strength) || 0) + boosts.strength;
              userData.stats.agility = Math.max(0, Number(userData.stats.agility) || 0) + boosts.agility;
              userData.stats.mana = Math.max(0, Number(userData.stats.mana) || 0) + boosts.mana;
              userData.shadowsS2.push({ name: normalizedEnemy, nickname, level: 1 });
              await saveHunterData(db, senderID.toString(), userData);
              await api.sendMessage(
                AuroraBetaStyler.styleOutput({
                  headerText: "Solo Leveling Season 2 Arise",
                  headerSymbol: "🌑",
                  headerStyle: "bold",
                  bodyText: `Awakened ${normalizedEnemy} as ${nickname}! Gain ${boosts.strength} Strength, ${boosts.agility} Agility, ${boosts.mana} Mana.`,
                  bodyStyle: "bold",
                  footerText: "",
                }),
                threadID,
                event.messageID
              );
            }
          }
        };
        global.Kagenou.replyListeners.set(sentMessageID, { callback: handleReply });
      } else {
        await api.sendMessage(battleMessage, threadID, messageID);
      }
      return;
    }

    if (action === "s2" && args[1]?.toLowerCase() === "shop") {
      if (!userData.nameS2) {
        const notRegistered = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Season 2",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "You need to register for Season 2 first. Usage: /sl s2 register",
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(notRegistered, threadID, messageID);
        return;
      }
      interface ShopItemS2 {
        cost: { magicCrystals?: number; holyCrystals?: number };
        type: "potion" | "equipment" | "material";
        effect: string;
      }
      const shopItemsS2: { [key: string]: ShopItemS2 } = {
        shadow_potion: { cost: { magicCrystals: 10 }, type: "potion", effect: "Boosts Strength by 50" },
        holy_potion: { cost: { holyCrystals: 5 }, type: "potion", effect: "Boosts Mana by 50" },
        monarch_essence: { cost: { magicCrystals: 20 }, type: "potion", effect: "Boosts Agility by 50" },
        crystal_vial: { cost: { magicCrystals: 15 }, type: "potion", effect: "Restores 100 Mana" },
        vitality_elixir: { cost: { holyCrystals: 10 }, type: "potion", effect: "Restores 100 Strength" },
        speed_draught: { cost: { magicCrystals: 12 }, type: "potion", effect: "Boosts Agility by 30" },
        mana_surge: { cost: { holyCrystals: 8 }, type: "potion", effect: "Boosts Mana by 30" },
        shadow_blade: { cost: { magicCrystals: 50 }, type: "equipment", effect: "Increases damage by 80%" },
        holy_spear: { cost: { holyCrystals: 30 }, type: "equipment", effect: "Increases damage by 70%" },
        monarch_crown: { cost: { magicCrystals: 100, holyCrystals: 50 }, type: "equipment", effect: "Boosts all stats by 100" },
        crystal_armor: { cost: { magicCrystals: 80 }, type: "equipment", effect: "Reduces damage taken by 50%" },
        divine_shield: { cost: { holyCrystals: 40 }, type: "equipment", effect: "Reduces damage taken by 40%" },
        shadow_cloak: { cost: { magicCrystals: 60 }, type: "equipment", effect: "Increases evasion by 30%" },
        holy_grail: { cost: { holyCrystals: 100 }, type: "material", effect: "Used for crafting legendary items" },
        mana_core: { cost: { magicCrystals: 25 }, type: "material", effect: "Used for crafting" },
        crystal_shard: { cost: { magicCrystals: 15 }, type: "material", effect: "Used for crafting" },
        divine_orb: { cost: { holyCrystals: 20 }, type: "material", effect: "Used for crafting" },
        shadow_essence: { cost: { magicCrystals: 30 }, type: "material", effect: "Used for crafting" },
        holy_relic: { cost: { holyCrystals: 50 }, type: "material", effect: "Used for crafting legendary items" },
        monarch_sigil: { cost: { magicCrystals: 150, holyCrystals: 75 }, type: "material", effect: "Unlocks ultimate abilities" },
      };
      const shopMessage = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling Season 2 Shop",
        headerSymbol: "🛍️",
        headerStyle: "bold",
        bodyText: Object.entries(shopItemsS2).map(([key, details]) => {
          const costStr = details.cost.magicCrystals && details.cost.holyCrystals
            ? `${details.cost.magicCrystals} Magic Crystals, ${details.cost.holyCrystals} Holy Crystals`
            : details.cost.magicCrystals
              ? `${details.cost.magicCrystals} Magic Crystals`
              : `${details.cost.holyCrystals} Holy Crystals`;
          return `- ${key.replace("_", " ")}: ${details.effect} (Cost: ${costStr})`;
        }).join("\n") + "\nReply with 'buy <item> <quantity>' to purchase.",
        bodyStyle: "bold",
        footerText: "",
      });
      let sentMessageID: string;
      await new Promise((resolve) => {
        api.sendMessage(shopMessage, threadID, (err, info) => {
          if (err) resolve(err);
          else {
            sentMessageID = info.messageID;
            resolve(info);
          }
        }, messageID);
      });
      if (!global.Kagenou.replyListeners) global.Kagenou.replyListeners = new Map();
      const handleReply = async ({ api, event }) => {
        const { body } = event;
        const reply = body.toLowerCase().trim().split(" ");
        if (reply[0] === "buy") {
          const item = reply[1]?.replace(/_/g, "_");
          const quantity = parseInt(reply[2]) || 1;
          if (!item || !shopItemsS2[item] || quantity <= 0) {
            await api.sendMessage(
              AuroraBetaStyler.styleOutput({
                headerText: "Solo Leveling Season 2 Shop",
                headerSymbol: "⚠️",
                headerStyle: "bold",
                bodyText: "Invalid item or quantity. Reply with 'buy <item> <quantity>'.",
                bodyStyle: "bold",
                footerText: "",
              }),
              threadID,
              event.messageID
            );
            return;
          }
          const itemData = shopItemsS2[item];
          const totalMagicCrystals = (itemData.cost.magicCrystals || 0) * quantity;
          const totalHolyCrystals = (itemData.cost.holyCrystals || 0) * quantity;
          if (
            (totalMagicCrystals > 0 && userData.inventoryS2.magicCrystals < totalMagicCrystals) ||
            (totalHolyCrystals > 0 && userData.inventoryS2.holyCrystals < totalHolyCrystals)
          ) {
            await api.sendMessage(
              AuroraBetaStyler.styleOutput({
                headerText: "Solo Leveling Season 2 Shop",
                headerSymbol: "❌",
                headerStyle: "bold",
                bodyText: `Not enough resources. Need ${totalMagicCrystals} Magic Crystals, ${totalHolyCrystals} Holy Crystals.`,
                bodyStyle: "bold",
                footerText: "",
              }),
              threadID,
              event.messageID
            );
            return;
          }
          userData.inventoryS2.magicCrystals -= totalMagicCrystals;
          userData.inventoryS2.holyCrystals -= totalHolyCrystals;
          if (itemData.type === "potion") {
            const effects = {
              shadow_potion: { strength: 50 * quantity },
              holy_potion: { mana: 50 * quantity },
              monarch_essence: { agility: 50 * quantity },
              crystal_vial: { mana: 100 * quantity },
              vitality_elixir: { strength: 100 * quantity },
              speed_draught: { agility: 30 * quantity },
              mana_surge: { mana: 30 * quantity },
            };
            if (effects[item]) {
              userData.stats.strength = Math.max(0, Number(userData.stats.strength) || 0) + (effects[item].strength || 0);
              userData.stats.agility = Math.max(0, Number(userData.stats.agility) || 0) + (effects[item].agility || 0);
              userData.stats.mana = Math.max(0, Number(userData.stats.mana) || 0) + (effects[item].mana || 0);
            }
          } else {
            userData.inventoryS2.items[item] = Math.max(0, Number(userData.inventoryS2.items[item] || 0)) + quantity;
          }
          await saveHunterData(db, senderID.toString(), userData);
          await api.sendMessage(
            AuroraBetaStyler.styleOutput({
              headerText: "Solo Leveling Season 2 Shop",
              headerSymbol: "✅",
              headerStyle: "bold",
              bodyText: `Purchased ${quantity} ${item.replace("_", " ")}! ${itemData.effect}.`,
              bodyStyle: "bold",
              footerText: "",
            }),
            threadID,
            event.messageID
          );
        }
      };
      global.Kagenou.replyListeners.set(sentMessageID, { callback: handleReply });
      return;
    }

    if (action === "s2" && args[1]?.toLowerCase() === "dungeon") {
      if (!userData.nameS2) {
        const notRegistered = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Season 2",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "You need to register for Season 2 first. Usage: /sl s2 register",
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(notRegistered, threadID, messageID);
        return;
      }
      const tier = args[2]?.toUpperCase();
      const tiers = ["D", "C", "B", "A", "S"];
      if (!tier || !tiers.includes(tier)) {
        const invalidTier = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Season 2 Dungeon",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "Invalid tier. Use /sl s2 dungeon <D/C/B/A/S>.",
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(invalidTier, threadID, messageID);
        return;
      }
      if (Math.max(0, Number(userData.dungeonCooldownS2) || 0) > currentTime) {
        const remaining = Math.max(0, Number(userData.dungeonCooldownS2) || 0) - currentTime;
        const cooldownMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Season 2 Dungeon",
          headerSymbol: "⏳",
          headerStyle: "bold",
          bodyText: `Cooldown active. Wait ${Math.ceil(remaining / 60)} minutes.`,
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(cooldownMessage, threadID, messageID);
        return;
      }
      const rewards = {
        D: { magicCrystals: 5, holyCrystals: 2 },
        C: { magicCrystals: 10, holyCrystals: 4 },
        B: { magicCrystals: 15, holyCrystals: 6 },
        A: { magicCrystals: 20, holyCrystals: 8 },
        S: { magicCrystals: 30, holyCrystals: 12 },
      };
      const expGain = Math.max(0, Math.floor(Math.random() * 500) + (tier === "D" ? 500 : tier === "C" ? 1000 : tier === "B" ? 1500 : tier === "A" ? 2000 : 3000));
      userData.expS2 = Math.max(0, Number(userData.expS2) || 0) + expGain;
      userData.level = Math.max(1, Math.floor(userData.expS2 / 1000) + 1);
      userData.inventoryS2.magicCrystals = Math.max(0, Number(userData.inventoryS2.magicCrystals) || 0) + rewards[tier].magicCrystals;
      userData.inventoryS2.holyCrystals = Math.max(0, Number(userData.inventoryS2.holyCrystals) || 0) + rewards[tier].holyCrystals;
      userData.dungeonCooldownS2 = currentTime + dungeonCooldownS2;
      applyRankProgression(userData);
      await saveHunterData(db, senderID.toString(), userData);
      const dungeonMessage = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling Season 2 Dungeon",
        headerSymbol: "🏰",
        headerStyle: "bold",
        bodyText: `Cleared ${tier}-tier dungeon! Gained ${expGain} EXP, ${rewards[tier].magicCrystals} Magic Crystals, ${rewards[tier].holyCrystals} Holy Crystals. New Level: ${userData.level}, Rank: ${userData.rank}.`,
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(dungeonMessage, threadID, messageID);
      return;
    }

    if (action === "s2" && args[1]?.toLowerCase() === "guild") {
      if (!userData.nameS2) {
        const notRegistered = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Season 2",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "You need to register for Season 2 first. Usage: /sl s2 register",
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(notRegistered, threadID, messageID);
        return;
      }
      const subAction = args[2]?.toLowerCase();
      const guildCollection = db.db("guilds");
      const guildsS2 = await guildCollection.find({ isSeason2: true }).toArray();

      if (subAction === "create") {
        const guildName = args.slice(3).join(" ") || `S2Guild${Math.floor(Math.random() * 1000)}`;
        if (userData.guildS2) {
          const alreadyInGuild = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Season 2 Guild",
            headerSymbol: "🛑",
            headerStyle: "bold",
            bodyText: `Already in ${userData.guildS2}. Leave to create a new one.`,
            bodyStyle: "bold",
            footerText: "",
          });
          await api.sendMessage(alreadyInGuild, threadID, messageID);
          return;
        }
        if (guildsS2.some(g => g.name === guildName)) {
          const guildExists = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Season 2 Guild",
            headerSymbol: "⚠️",
            headerStyle: "bold",
            bodyText: `Guild ${guildName} already exists. Join it instead!`,
            bodyStyle: "bold",
            footerText: "",
          });
          await api.sendMessage(guildExists, threadID, messageID);
          return;
        }
        userData.guildS2 = guildName;
        const stats = userData.stats || { strength: 0, agility: 0, mana: 0 };
        const baseStrength = Math.max(0, Number(stats.strength) || 0);
        await guildCollection.insertOne({ name: guildName, members: [senderID.toString()], totalStrength: baseStrength + 50, hasChangedName: false, isSeason2: true });
        await saveHunterData(db, senderID.toString(), userData);
        const createMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Season 2 Guild",
          headerSymbol: "🛡️",
          headerStyle: "bold",
          bodyText: `Created Guild: ${guildName}. +50 Group Strength.`,
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(createMessage, threadID, messageID);
        return;
      }

      if (subAction === "leave") {
        if (!userData.guildS2) {
          const noGuild = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Season 2 Guild",
            headerSymbol: "❌",
            headerStyle: "bold",
            bodyText: "You are not in a Season 2 guild to leave!",
            bodyStyle: "bold",
            footerText: "",
          });
          await api.sendMessage(noGuild, threadID, messageID);
          return;
        }
        const currentGuild = guildsS2.find(g => g.name === userData.guildS2);
        if (!currentGuild) {
          userData.guildS2 = undefined;
          await saveHunterData(db, senderID.toString(), userData);
          const noGuildFound = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Season 2 Guild",
            headerSymbol: "ℹ️",
            headerStyle: "bold",
            bodyText: "Your Season 2 guild no longer exists. You have been removed.",
            bodyStyle: "bold",
            footerText: "",
          });
          await api.sendMessage(noGuildFound, threadID, messageID);
          return;
        }
        const stats = userData.stats || { strength: 0, agility: 0, mana: 0 };
        const memberStrength = Math.max(0, Number(stats.strength) || 0);
        currentGuild.members = currentGuild.members.filter(member => member !== senderID.toString());
        currentGuild.totalStrength = Math.max(0, currentGuild.totalStrength - memberStrength);
        await guildCollection.updateOne({ name: currentGuild.name, isSeason2: true }, { $set: currentGuild });
        userData.guildS2 = undefined;
        await saveHunterData(db, senderID.toString(), userData);
        const leaveMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Season 2 Guild",
          headerSymbol: "🚪",
          headerStyle: "bold",
          bodyText: `You have left ${currentGuild.name}.`,
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(leaveMessage, threadID, messageID);
        return;
      }

      if (subAction === "list") {
        if (guildsS2.length === 0) {
          const noGuilds = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Season 2 Guild",
            headerSymbol: "ℹ️",
            headerStyle: "bold",
            bodyText: "No Season 2 guilds have been created yet.",
            bodyStyle: "bold",
            footerText: "",
          });
          await api.sendMessage(noGuilds, threadID, messageID);
          return;
        }
        const guildList = guildsS2.map(g => `- ${g.name}: ${Math.max(0, Number(g.totalStrength) || 0)} Total Strength`).join("\n");
        const listMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Season 2 Guild List",
          headerSymbol: "🛡️",
          headerStyle: "bold",
          bodyText: `Active Season 2 Guilds:\n${guildList}`,
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(listMessage, threadID, messageID);
        return;
      }

      if (subAction === "war") {
        if (!userData.guildS2) {
          const noGuild = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Season 2 Guild",
            headerSymbol: "❌",
            headerStyle: "bold",
            bodyText: "You must be in a Season 2 guild to fight!",
            bodyStyle: "bold",
            footerText: "",
          });
          await api.sendMessage(noGuild, threadID, messageID);
          return;
        }
        const myGuild = guildsS2.find(g => g.name === userData.guildS2);
        const targetGuild = guildsS2[Math.floor(Math.random() * guildsS2.length)];
        if (!targetGuild || myGuild.name === targetGuild.name) {
          const noTarget = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Season 2 Guild",
            headerSymbol: "⚠️",
            headerStyle: "bold",
            bodyText: "No valid opponent guild found or you can't fight your own guild!",
            bodyStyle: "bold",
            footerText: "",
          });
          await api.sendMessage(noTarget, threadID, messageID);
          return;
        }
        const myStrength = Math.max(0, Number(myGuild.totalStrength) || 0);
        const targetStrength = Math.max(0, Number(targetGuild.totalStrength) || 0);
        const fightResult = myStrength > targetStrength || userData.rank === "X";
        if (fightResult) {
          userData.inventoryS2.magicCrystals = Math.max(0, Number(userData.inventoryS2.magicCrystals) || 0) + 10;
          userData.inventoryS2.holyCrystals = Math.max(0, Number(userData.inventoryS2.holyCrystals) || 0) + 5;
          await saveHunterData(db, senderID.toString(), userData);
          const fightMessage = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Season 2 Guild War",
            headerSymbol: "⚔️",
            headerStyle: "bold",
            bodyText: `Victory! ${myGuild.name} defeated ${targetGuild.name} (${myStrength} vs ${targetStrength})! Gained 10 Magic Crystals and 5 Holy Crystals.`,
            bodyStyle: "bold",
            footerText: "",
          });
          await api.sendMessage(fightMessage, threadID, messageID);
        } else {
          const fightMessage = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Season 2 Guild War",
            headerSymbol: "💥",
            headerStyle: "bold",
            bodyText: `Defeated! ${myGuild.name} lost to ${targetGuild.name} (${myStrength} vs ${targetStrength}). Train harder!`,
            bodyStyle: "bold",
            footerText: "",
          });
          await api.sendMessage(fightMessage, threadID, messageID);
        }
        return;
      }

      const invalidGuildCommand = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling Season 2 Guild",
        headerSymbol: "⚠️",
        headerStyle: "bold",
        bodyText: "Invalid guild command. Use /sl s2 guild [create <name> | leave | list | war].",
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(invalidGuildCommand, threadID, messageID);
      return;
    }

    if (action === "s2" && args[1]?.toLowerCase() === "inventory") {
      if (!userData.nameS2) {
        const notRegistered = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Season 2",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "You need to register for Season 2 first. Usage: /sl s2 register",
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(notRegistered, threadID, messageID);
        return;
      }
      const items = Object.entries(userData.inventoryS2.items || {}).map(([k, v]) => `${k.replace("_", " ")} x${Math.max(0, Number(v) || 0)}`).join(", ") || "None";
      const inventoryMessage = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling Season 2 Inventory",
        headerSymbol: "🎒",
        headerStyle: "bold",
        bodyText: `Magic Crystals: ${Math.max(0, Number(userData.inventoryS2.magicCrystals) || 0)}\nHoly Crystals: ${Math.max(0, Number(userData.inventoryS2.holyCrystals) || 0)}\nItems: ${items}`,
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(inventoryMessage, threadID, messageID);
      return;
    }
      // Newww
   if (action === "s2" && args[1]?.toLowerCase() === "leaderboard") {
  const huntersCollection = db.db("hunters");
  const topHunters = await huntersCollection
    .find({ nameS2: { $exists: true } }) // Only include users registered in Season 2
    .sort({ expS2: -1 })
    .limit(20)
    .toArray();
  const leaderboardMessage = AuroraBetaStyler.styleOutput({
    headerText: "Solo Leveling S2 Leaderboard",
    headerSymbol: "🏆",
    headerStyle: "bold",
    bodyText: topHunters.length > 0
      ? topHunters.map((h, i) => `${i + 1}. ${h.nameS2 || "Unknown"} (Level ${Math.max(1, Number(h.level) || 1)}, S2 EXP: ${Math.max(0, Number(h.expS2) || 0)}, Rank ${h.rank || "E"})`).join("\n")
      : "No hunters ranked in Season 2 yet.",
    bodyStyle: "bold",
    footerText: "",
  });
  await api.sendMessage(leaderboardMessage, threadID, messageID);
  return;
}
   if (action === "s2" && args[1]?.toLowerCase() === "shadowtrain") {
  if (!userData.nameS2) {
    const notRegistered = AuroraBetaStyler.styleOutput({
      headerText: "Solo Leveling Season 2",
      headerSymbol: "⚠️",
      headerStyle: "bold",
      bodyText: "You need to register for Season 2 first. Usage: /sl s2 register",
      bodyStyle: "bold",
      footerText: "",
    });
    await api.sendMessage(notRegistered, threadID, messageID);
    return;
  }
  const shadowName = args[2]?.replace(/\s+/g, "_").toLowerCase();
  if (!shadowName || !userData.shadowsS2.some(s => s.name.toLowerCase().replace(/\s+/g, "_") === shadowName)) {
    const invalidShadow = AuroraBetaStyler.styleOutput({
      headerText: "Solo Leveling Season 2 Shadow Train",
      headerSymbol: "⚠️",
      headerStyle: "bold",
      bodyText: `Invalid shadow name. Check your shadows with /sl s2 shadowlist. Usage: /sl s2 shadowtrain <shadow_name>`,
      bodyStyle: "bold",
      footerText: "",
    });
    await api.sendMessage(invalidShadow, threadID, messageID);
    return;
  }
  const shadow = userData.shadowsS2.find(s => s.name.toLowerCase().replace(/\s+/g, "_") === shadowName);
  const materialCost = { magicCrystals: 10, holyCrystals: 5 };
  if ((userData.inventoryS2.magicCrystals || 0) < materialCost.magicCrystals || (userData.inventoryS2.holyCrystals || 0) < materialCost.holyCrystals) {
    const insufficientMaterials = AuroraBetaStyler.styleOutput({
      headerText: "Solo Leveling Season 2 Shadow Train",
      headerSymbol: "❌",
      headerStyle: "bold",
      bodyText: `Not enough materials. Required: Magic Crystals x${materialCost.magicCrystals}, Holy Crystals x${materialCost.holyCrystals}`,
      bodyStyle: "bold",
      footerText: "",
    });
    await api.sendMessage(insufficientMaterials, threadID, messageID);
    return;
  }
  userData.inventoryS2.magicCrystals = Math.max(0, Number(userData.inventoryS2.magicCrystals || 0) - materialCost.magicCrystals);
  userData.inventoryS2.holyCrystals = Math.max(0, Number(userData.inventoryS2.holyCrystals || 0) - materialCost.holyCrystals);
  shadow.level = Math.max(1, Number(shadow.level || 1) + 1);
  userData.expS2 = Math.max(0, Number(userData.expS2) || 0) + 300;
  userData.level = Math.max(1, Math.floor(userData.expS2 / 1000) + 1);
  applyRankProgression(userData);
  await saveHunterData(db, senderID.toString(), userData);
  const trainMessage = AuroraBetaStyler.styleOutput({
    headerText: "Solo Leveling Season 2 Shadow Train",
    headerSymbol: "🌑",
    headerStyle: "bold",
    bodyText: `Trained shadow ${shadow.name} (${shadow.nickname}) to Level ${shadow.level}! Gained 300 EXP. New Level: ${userData.level}, Rank: ${userData.rank}.`,
    bodyStyle: "bold",
    footerText: "",
  });
  await api.sendMessage(trainMessage, threadID, messageID);
  return;
}

if (action === "craft") {
  const item = args[1]?.toLowerCase()?.replace(/\s+/g, "_");
  const craftRecipes: { [key: string]: { materials: { [key: string]: number }; effect: string } } = {
    shadow_blade: { materials: { iron_ore: 5, mana_crystal: 3 }, effect: "Increases damage by 60%" },
    mystic_armor: { materials: { mythril: 4, dragon_scale: 2 }, effect: "Reduces damage taken by 30%" },
    void_pendant: { materials: { shadow_essence: 2, mana_crystal: 5 }, effect: "Boosts Mana by 50" },
  };
  if (!item || !craftRecipes[item]) {
    const invalidItem = AuroraBetaStyler.styleOutput({
      headerText: "Solo Leveling Craft",
      headerSymbol: "⚠️",
      headerStyle: "bold",
      bodyText: `Invalid item. Available items: ${Object.keys(craftRecipes).map(k => k.replace("_", " ")).join(", ")}. Usage: /sl craft <item>`,
      bodyStyle: "bold",
      footerText: "",
    });
    await api.sendMessage(invalidItem, threadID, messageID);
    return;
  }
  const recipe = craftRecipes[item];
  const hasMaterials = Object.entries(recipe.materials).every(([mat, qty]) => (userData.inventory.materials[mat] || 0) >= qty);
  if (!hasMaterials) {
    const materialList = Object.entries(recipe.materials).map(([mat, qty]) => `${mat.replace("_", " ")} x${qty}`).join(", ");
    const insufficientMaterials = AuroraBetaStyler.styleOutput({
      headerText: "Solo Leveling Craft",
      headerSymbol: "❌",
      headerStyle: "bold",
      bodyText: `Not enough materials. Required: ${materialList}`,
      bodyStyle: "bold",
      footerText: "",
    });
    await api.sendMessage(insufficientMaterials, threadID, messageID);
    return;
  }
  for (const [mat, qty] of Object.entries(recipe.materials)) {
    userData.inventory.materials[mat] = Math.max(0, Number(userData.inventory.materials[mat] || 0) - qty);
    if (userData.inventory.materials[mat] <= 0) delete userData.inventory.materials[mat];
  }
  if (item === "void_pendant") {
    userData.stats.mana = Math.max(0, Number(userData.stats.mana) || 0) + 50;
  } else {
    userData.equipment.swords[item] = Math.max(1, Number(userData.equipment.swords[item] || 1));
  }
  await saveHunterData(db, senderID.toString(), userData);
  const craftMessage = AuroraBetaStyler.styleOutput({
    headerText: "Solo Leveling Craft",
    headerSymbol: "🔨",
    headerStyle: "bold",
    bodyText: `Crafted ${item.replace("_", " ")}! ${recipe.effect}`,
    bodyStyle: "bold",
    footerText: "",
  });
  await api.sendMessage(craftMessage, threadID, messageID);
  return;
}



if (action === "shadowtrain") {
  const shadowName = args[1]?.replace(/\s+/g, "_").toLowerCase();
  if (!shadowName || !userData.shadows.some(s => s.name.toLowerCase().replace(/\s+/g, "_") === shadowName)) {
    const invalidShadow = AuroraBetaStyler.styleOutput({
      headerText: "Solo Leveling Shadow Train",
      headerSymbol: "⚠️",
      headerStyle: "bold",
      bodyText: `Invalid shadow name. Check your shadows with /sl shadowlist. Usage: /sl shadowtrain <shadow_name>`,
      bodyStyle: "bold",
      footerText: "",
    });
    await api.sendMessage(invalidShadow, threadID, messageID);
    return;
  }
  const shadow = userData.shadows.find(s => s.name.toLowerCase().replace(/\s+/g, "_") === shadowName);
  const materialCost = { mana_crystal: 2 };
  if ((userData.inventory.materials.mana_crystal || 0) < materialCost.mana_crystal) {
    const insufficientMaterials = AuroraBetaStyler.styleOutput({
      headerText: "Solo Leveling Shadow Train",
      headerSymbol: "❌",
      headerStyle: "bold",
      bodyText: `Not enough materials. Required: Mana Crystal x${materialCost.mana_crystal}`,
      bodyStyle: "bold",
      footerText: "",
    });
    await api.sendMessage(insufficientMaterials, threadID, messageID);
    return;
  }
  userData.inventory.materials.mana_crystal = Math.max(0, Number(userData.inventory.materials.mana_crystal || 0) - materialCost.mana_crystal);
  if (userData.inventory.materials.mana_crystal <= 0) delete userData.inventory.materials.mana_crystal;
  shadow.level = Math.max(1, Number(shadow.level || 1) + 1);
  userData.exp = Math.max(0, Number(userData.exp) || 0) + 200;
  userData.level = Math.max(1, Math.floor(userData.exp / 1000) + 1);
  applyRankProgression(userData);
  await saveHunterData(db, senderID.toString(), userData);
  const trainMessage = AuroraBetaStyler.styleOutput({
    headerText: "Solo Leveling Shadow Train",
    headerSymbol: "🌑",
    headerStyle: "bold",
    bodyText: `Trained shadow ${shadow.name} (${shadow.nickname}) to Level ${shadow.level}! Gained 200 EXP. New Level: ${userData.level}, Rank: ${userData.rank}.`,
    bodyStyle: "bold",
    footerText: "",
  });
  await api.sendMessage(trainMessage, threadID, messageID);
  return;
}
   

    if (action === "register") {
      const name = args[1];
      if (!name) {
        const errorMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "Please provide a hunter name. Usage: /sl register <name>",
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(errorMessage, threadID, messageID);
        return;
      }
      const huntersCollection = db.db("hunters");
      const existingHunter = await huntersCollection.findOne({ name });
      if (existingHunter) {
        const duplicateName = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling",
          headerSymbol: "🛑",
          headerStyle: "bold",
          bodyText: `The name "${name}" is already taken. Please choose a different name.`,
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(duplicateName, threadID, messageID);
        return;
      }
      if (userData.name) {
        const alreadyRegistered = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling",
          headerSymbol: "🛑",
          headerStyle: "bold",
          bodyText: `You are already registered as ${userData.name}. Use /sl status to check your stats.`,
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(alreadyRegistered, threadID, messageID);
        return;
      }
      userData.name = name;
      userData.level = 1;
      userData.exp = 0;
      userData.rank = "E";
      userData.equipment.swords = { "basic_sword": 1 };
      userData.inventory = { potions: { "health_potion": 2 }, materials: {} };
      userData.shadows = [];
      userData.stats = { strength: 10, agility: 10, mana: 10 };
      userData.dungeonCooldown = 0;
      userData.quests = {};
      userData.meditateCooldown = 0;
      userData.lostShadows = [];
      userData.hasChangedName = false;
      userData.gateCooldown = 0;
      await saveHunterData(db, senderID.toString(), userData);
      const registerMessage = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling",
        headerSymbol: "✅",
        headerStyle: "bold",
        bodyText: `${name} registered as a hunter! Default rank: E. Use /sl status to see your stats.`,
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(registerMessage, threadID, messageID);
      return;
    }

    if (!userData.name && !["s2"].includes(action)) {
      const notRegistered = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling",
        headerSymbol: "⚠️",
        headerStyle: "bold",
        bodyText: "You need to register first. Usage: /sl register <name>",
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(notRegistered, threadID, messageID);
      return;
    }

    if (action === "status") {
      const equippedSword = Object.entries(userData.equipment.swords).reduce((max, current) => (current[1] > max[1] ? current : max), ["basic_sword", 1]);
      const stats = userData.stats || { strength: 0, agility: 0, mana: 0 };
      const statusMessage = AuroraBetaStyler.styleOutput({
        headerText: "Hunter Status",
        headerSymbol: "📊",
        headerStyle: "bold",
        bodyText: `Name: ${userData.name}\nLevel: ${Math.max(1, Number(userData.level) || 1)}\nEXP: ${Math.max(0, Number(userData.exp) || 0)}\nRank: ${userData.rank || "E"}\nRole: ${userData.role || "None"}\nStats: Strength ${Math.max(0, Number(stats.strength) || 0)}, Agility ${Math.max(0, Number(stats.agility) || 0)}, Mana ${Math.max(0, Number(stats.mana) || 0)}\nEquipped Sword: ${equippedSword[0].replace("_", " ")} (Level ${Math.max(1, Number(equippedSword[1]) || 1)})\nShadows: ${userData.shadows.length > 0 ? userData.shadows.map(s => `${s.name} (${s.nickname})`).join(", ") : "None"}\nGuild: ${userData.guild || "None"}`,
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(statusMessage, threadID, messageID);
      return;
    }

/////////)

if (action === "use") {
      const potion = args[1]?.toLowerCase();
      const quantity = parseInt(args[2]) || 1;
      if (!potion || !userData.inventory.potions[potion] || quantity <= 0 || userData.inventory.potions[potion] < quantity) {
        const invalidItem = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Use",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: `Invalid potion, insufficient quantity, or not enough potions. You have ${userData.inventory.potions[potion] || 0} ${potion?.replace("_", " ") || "potion"}. Check with /sl status.`,
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(invalidItem, threadID, messageID);
        return;
      }
      userData.inventory.potions[potion] = Math.max(0, Number(userData.inventory.potions[potion]) || 0) - quantity;
      const stats = userData.stats || { strength: 0, agility: 0, mana: 0 };
      let effectMessage = "";
      if (potion === "health_potion") {
        stats.strength = Math.max(0, Number(stats.strength) || 0) + 5 * quantity;
        effectMessage = `Used ${quantity} Health Potion(s)! Strength increased by ${5 * quantity} permanently.`;
      } else if (potion === "mana_potion") {
        stats.mana = Math.max(0, Number(stats.mana) || 0) + 5 * quantity;
        effectMessage = `Used ${quantity} Mana Potion(s)! Mana increased by ${5 * quantity} permanently.`;
      } else if (potion === "strength_potion") {
        stats.strength = Math.max(0, Number(stats.strength) || 0) + 20 * quantity;
        effectMessage = `Used ${quantity} Strength Potion(s)! Strength increased by ${20 * quantity} permanently.`;
      } else if (potion === "agility_potion") {
        stats.agility = Math.max(0, Number(stats.agility) || 0) + 20 * quantity;
        effectMessage = `Used ${quantity} Agility Potion(s)! Agility increased by ${20 * quantity} permanently.`;
      } else if (potion === "mana_regen_potion") {
        stats.mana = Math.max(0, Number(stats.mana) || 0) + 50 * quantity;
        effectMessage = `Used ${quantity} Mana Regen Potion(s)! Mana increased by ${50 * quantity} permanently.`;
      } else if (potion === "god_mode_potion") {
        effectMessage = `Used ${quantity} God Mode Potion(s)! All enemies will be defeated instantly in your next ${quantity} battle(s)!`;
      }
      userData.stats = stats;
      if (userData.inventory.potions[potion] <= 0) delete userData.inventory.potions[potion];
      await saveHunterData(db, senderID.toString(), userData);
      const useMessage = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling Use",
        headerSymbol: potion === "god_mode_potion" ? "✨" : potion.includes("health") ? "❤️" : potion.includes("mana") ? "🔮" : potion.includes("strength") ? "💪" : potion.includes("agility") ? "🏃" : "🔄",
        headerStyle: "bold",
        bodyText: effectMessage,
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(useMessage, threadID, messageID);
      return;
    }
////////

if (action === "shop") {
      interface ShopItem {
        cost: { exp: number };
        type: "sword" | "potion";
        level?: number;
        effect?: string;
        amount?: number;
        limit?: number;
      }
      const shopItems: { [key: string]: ShopItem } = {
        basic_sword: { cost: { exp: 0 }, type: "sword", level: 1, effect: "Basic damage" },
        demon_kings_longsword: { cost: { exp: 1000 }, type: "sword", level: 2, effect: "Increases damage by 30%" },
        knights_tyrant_blade: { cost: { exp: 2500 }, type: "sword", level: 3, effect: "Increases damage by 50%" },
        storcs_bane: { cost: { exp: 5000 }, type: "sword", level: 4, effect: "Increases damage by 70%" },
        kasaka_s_venom_fang: { cost: { exp: 7500 }, type: "sword", level: 5, effect: "Adds poison effect" },
        ice_dagger: { cost: { exp: 3000 }, type: "sword", level: 3, effect: "Freezes enemies, +40% damage" },
        shadow_scythe: { cost: { exp: 8000 }, type: "sword", level: 5, effect: "Dark damage, +60% damage" },
        crimson_blade: { cost: { exp: 9000 }, type: "sword", level: 6, effect: "Burns enemies, +70% damage" },
        thunder_spear: { cost: { exp: 10000 }, type: "sword", level: 6, effect: "Lightning strike, +70% damage" },
        frostbite_axe: { cost: { exp: 11000 }, type: "sword", level: 7, effect: "Slows enemies, +80% damage" },
        arcane_sword: { cost: { exp: 12000 }, type: "sword", level: 7, effect: "Mana boost, +80% damage" },
        dragon_tooth_sword: { cost: { exp: 13000 }, type: "sword", level: 8, effect: "Dragon fire, +90% damage" },
        void_edge: { cost: { exp: 14000 }, type: "sword", level: 8, effect: "Void damage, +90% damage" },
        celestial_blade: { cost: { exp: 15000 }, type: "sword", level: 9, effect: "Holy damage, +100% damage" },
        ashborn_s_relic: { cost: { exp: 20000 }, type: "sword", level: 10, effect: "Ultimate power, +150% damage" },
        x_rank_sword: { cost: { exp: 5000000 }, type: "sword", level: 15, effect: "+10k Strength, +10k Agility, +40k Mana" },
        health_potion: { cost: { exp: 200 }, type: "potion", amount: 1, effect: "Restores 50 HP" },
        mana_potion: { cost: { exp: 300 }, type: "potion", amount: 1, effect: "Restores 30 Mana" },
        strength_potion: { cost: { exp: 500 }, type: "potion", amount: 1, effect: "Boosts Strength by 20" },
        agility_potion: { cost: { exp: 600 }, type: "potion", amount: 1, effect: "Boosts Agility by 20" },
        mana_regen_potion: { cost: { exp: 700 }, type: "potion", amount: 1, effect: "Restores 50 Mana over time" },
        god_mode_potion: { cost: { exp: 1000000 }, type: "potion", amount: 1, limit: 5, effect: "Defeats all enemies instantly for 1 battle" },
          
      };
      const shopMessage = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling Shop",
        headerSymbol: "🛍️",
        headerStyle: "bold",
        bodyText: Object.entries(shopItems).map(([key, details]) => {
          const costStr = `${details.cost.exp} EXP`;
          const displayText = details.effect ? `${details.effect}` : `Get ${details.amount || 0} ${key.replace("_", " ")}`;
          return `- ${key.replace("_", " ")}: ${displayText} (Cost: ${costStr}${details.limit ? `, Limit: ${details.limit}` : ""})`;
        }).join("\n") + "\nUse /sl buy <item> <quantity> to purchase.",
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(shopMessage, threadID, messageID);
      return;
    }


  ///////    
      if (action === "buy") {
      interface ShopItem {
        cost: { exp: number };
        type: "sword" | "potion";
        level?: number;
        effect?: string;
        amount?: number;
        limit?: number;
      }
      const shopItems: { [key: string]: ShopItem } = {
        basic_sword: { cost: { exp: 0 }, type: "sword", level: 1, effect: "Basic damage" },
        demon_kings_longsword: { cost: { exp: 1000 }, type: "sword", level: 2, effect: "Increases damage by 30%" },
        knights_tyrant_blade: { cost: { exp: 2500 }, type: "sword", level: 3, effect: "Increases damage by 50%" },
        storcs_bane: { cost: { exp: 5000 }, type: "sword", level: 4, effect: "Increases damage by 70%" },
        kasaka_s_venom_fang: { cost: { exp: 7500 }, type: "sword", level: 5, effect: "Adds poison effect" },
        ice_dagger: { cost: { exp: 3000 }, type: "sword", level: 3, effect: "Freezes enemies, +40% damage" },
        shadow_scythe: { cost: { exp: 8000 }, type: "sword", level: 5, effect: "Dark damage, +60% damage" },
        crimson_blade: { cost: { exp: 9000 }, type: "sword", level: 6, effect: "Burns enemies, +70% damage" },
        thunder_spear: { cost: { exp: 10000 }, type: "sword", level: 6, effect: "Lightning strike, +70% damage" },
        frostbite_axe: { cost: { exp: 11000 }, type: "sword", level: 7, effect: "Slows enemies, +80% damage" },
        arcane_sword: { cost: { exp: 12000 }, type: "sword", level: 7, effect: "Mana boost, +80% damage" },
        dragon_tooth_sword: { cost: { exp: 13000 }, type: "sword", level: 8, effect: "Dragon fire, +90% damage" },
        void_edge: { cost: { exp: 14000 }, type: "sword", level: 8, effect: "Void damage, +90% damage" },
        celestial_blade: { cost: { exp: 15000 }, type: "sword", level: 9, effect: "Holy damage, +100% damage" },
        ashborn_s_relic: { cost: { exp: 20000 }, type: "sword", level: 10, effect: "Ultimate power, +150% damage" },
        x_rank_sword: { cost: { exp: 5000000 }, type: "sword", level: 15, effect: "+10k Strength, +10k Agility, +40k Mana" },
        health_potion: { cost: { exp: 200 }, type: "potion", amount: 1, effect: "Restores 50 HP" },
        mana_potion: { cost: { exp: 300 }, type: "potion", amount: 1, effect: "Restores 30 Mana" },
        strength_potion: { cost: { exp: 500 }, type: "potion", amount: 1, effect: "Boosts Strength by 20" },
        agility_potion: { cost: { exp: 600 }, type: "potion", amount: 1, effect: "Boosts Agility by 20" },
        mana_regen_potion: { cost: { exp: 700 }, type: "potion", amount: 1, effect: "Restores 50 Mana over time" },
        god_mode_potion: { cost: { exp: 1000000 }, type: "potion", amount: 1, limit: 5, effect: "Defeats all enemies instantly for 1 battle" },
      };
      const key = args[1]?.toLowerCase();
      const quantity = parseInt(args[2]) || 1;
      if (!key || !shopItems[key] || quantity <= 0) {
        const invalidItem = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Shop",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "Invalid item or quantity. Use /sl shop to see available items, then /sl buy <item> <quantity>.",
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(invalidItem, threadID, messageID);
        return;
      }
      const itemData = shopItems[key];
      const totalCost = itemData.cost.exp * quantity;
      userData.exp = Math.max(0, Number(userData.exp) || 0);
      if (userData.exp < totalCost) {
        const insufficientMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Shop",
          headerSymbol: "❌",
          headerStyle: "bold",
          bodyText: `You don't have enough EXP (${totalCost} needed) to buy ${quantity} ${key.replace("_", " ")}.`,
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(insufficientMessage, threadID, messageID);
        return;
      }
      if (itemData.limit && (userData.inventory.potions[key] || 0) + quantity > itemData.limit) {
        const limitMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Shop",
          headerSymbol: "🛑",
          headerStyle: "bold",
          bodyText: `Limit reached for ${key.replace("_", " ")}. Max: ${itemData.limit}.`,
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(limitMessage, threadID, messageID);
        return;
      }
      userData.exp -= totalCost;
      if (itemData.type === "sword") {
        userData.equipment.swords[key] = Math.max(1, Number(itemData.level) || 1) * quantity;
      } else if (itemData.type === "potion") {
        userData.inventory.potions[key] = Math.max(0, Number(userData.inventory.potions[key] || 0) + (itemData.amount || 0) * quantity);
      }
      await saveHunterData(db, senderID.toString(), userData);
      const buyMessage = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling Shop",
        headerSymbol: "✅",
        headerStyle: "bold",
        bodyText: `Purchased ${quantity} ${key.replace("_", " ")}! ${itemData.effect || "Added to inventory."} (Cost: ${totalCost} EXP)`,
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(buyMessage, threadID, messageID);
      return;
    }
////////

    if (action === "battle") {
      if (args[1]?.toLowerCase() === "x") {
        if (userData.rank !== "X") {
          const restrictedMessage = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Battle X",
            headerSymbol: "🛑",
            headerStyle: "bold",
            bodyText: "Only X rank hunters can use /sl battle X!",
            bodyStyle: "bold",
            footerText: "",
          });
          await api.sendMessage(restrictedMessage, threadID, messageID);
          return;
        }
        const stats = userData.stats || { strength: 0, agility: 0, mana: 0 };
        const expGain = Math.max(0, Math.floor(Math.random() * 10000) + 5000);
        const enemy = "Supreme Monarch";
        userData.exp += expGain;
        userData.level = Math.max(1, Math.floor(userData.exp / 1000) + 1);
        let battleXMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Battle X",
          headerSymbol: "🌑",
          headerStyle: "bold",
          bodyText: `X Rank Supremacy! Defeated ${enemy} instantly by ${userData.name}! Gained ${expGain} EXP. New Level: ${userData.level}, Rank: ${userData.rank}. Reply with 'arise ${enemy} <nickname>' to awaken this Shadow Monarch!`,
          bodyStyle: "bold",
          footerText: "",
        });
        let sentMessageID;
        await new Promise((resolve) => {
          api.sendMessage(battleXMessage, threadID, (err, info) => {
            if (err) resolve(err);
            else {
              sentMessageID = info.messageID;
              resolve(info);
            }
          }, messageID);
        });
        if (!global.Kagenou.replyListeners) global.Kagenou.replyListeners = new Map();
        const handleReply = async ({ api, event }) => {
          const { body } = event;
          const reply = body.toLowerCase().trim().split(" ");
          if (reply[0] === "arise" && reply[1]?.replace(/_/g, " ").toLowerCase() === "supreme monarch") {
            const nickname = reply.slice(2).join(" ") || "SupremeShadow";
            userData.stats.strength = Math.max(0, Number(userData.stats.strength) || 0) + 1000;
            userData.stats.agility = Math.max(0, Number(userData.stats.agility) || 0) + 1000;
            userData.stats.mana = Math.max(0, Number(userData.stats.mana) || 0) + 2000;
            userData.shadows.push({ name: "Supreme Monarch", nickname, level: 1 });
            await saveHunterData(db, senderID.toString(), userData);
            await api.sendMessage(
              AuroraBetaStyler.styleOutput({
                headerText: "Solo Leveling Arise",
                headerSymbol: "🌑",
                headerStyle: "bold",
                bodyText: `Awakened Supreme Monarch as ${nickname}! Gain +1000 Strength, +1000 Agility, +2000 Mana.`,
                bodyStyle: "bold",
                footerText: "",
              }),
              threadID,
              event.messageID
            );
          }
        };
        global.Kagenou.replyListeners.set(sentMessageID, { callback: handleReply });
        await saveHunterData(db, senderID.toString(), userData);
        return;
      }

      if (userData.rank !== "X" && Math.random() < 0.4) {
        const stats = userData.stats || { strength: 0, agility: 0, mana: 0 };
        const userStrength = Math.max(1, Number(stats.strength) || 10);
        const normalEnemies = [
          "Kang Taeshik", "Kim Chul", "Yoo Jinho", "Lee Joohee", "Park Heejin",
          "Cha Hae-In", "Baek Yoonho", "Choi Jong-In", "Maharaga", "Igris",
          "Beru", "Tusk", "Baruka", "Cerberus", "Blood-Red Commander Igris",
          "High Orc", "Ice Bear", "Frost Giant", "Flame Bear"
        ];
        const shadowMonarchs = ["Kamish", "Ant King", "Monarch of Destruction", "Ruler's Shadow", "Ashborn"];
        const allEnemies = userData.rank === "S" ? [...normalEnemies, ...shadowMonarchs] : normalEnemies;
        const enemy = allEnemies[Math.floor(Math.random() * allEnemies.length)];
        const isMonarch = shadowMonarchs.includes(enemy);
        const enemyStrengthBase = isMonarch ? 200 : 50;
        const enemyStrength = Math.max(1, Math.floor(Math.random() * enemyStrengthBase * 0.4) + (userStrength * 0.67));
        let battleResult = userData.inventory.potions["god_mode_potion"] && userData.inventory.potions["god_mode_potion"] > 0 ? true : userStrength > enemyStrength;
        let expGain = Math.max(0, Math.floor(Math.random() * (isMonarch ? 1000 : 500)) + (isMonarch ? 500 : 100));
        userData.exp = Math.max(0, Number(userData.exp) || 0) + expGain;

        if (battleResult) {
          if (userData.inventory.potions["god_mode_potion"] && userData.inventory.potions["god_mode_potion"] > 0) {
            userData.inventory.potions["god_mode_potion"] -= 1;
            if (userData.inventory.potions["god_mode_potion"] <= 0) delete userData.inventory.potions["god_mode_potion"];
            expGain = Math.max(0, Math.floor(Math.random() * 10000) + 5000);
            const godModeMessage = AuroraBetaStyler.styleOutput({
              headerText: "Solo Leveling Battle",
              headerSymbol: "✨",
              headerStyle: "bold",
              bodyText: `God Mode Activated! All enemies defeated instantly by ${userData.name}! Gained ${expGain} EXP. New Level: ${userData.level}, Rank: ${userData.rank}.`,
              bodyStyle: "bold",
              footerText: "",
            });
            await saveHunterData(db, senderID.toString(), userData);
            await api.sendMessage(godModeMessage, threadID, messageID);
            return;
          }
          let battleMessage = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Battle",
            headerSymbol: "⚔️",
            headerStyle: "bold",
            bodyText: `Victory! You defeated ${enemy} with strength ${userStrength} vs ${enemyStrength}! Gained ${expGain} EXP. New Level: ${userData.level}, Rank: ${userData.rank}.`,
            bodyStyle: "bold",
            footerText: "",
          });

          if (userData.rank === "S" && isMonarch) {
            battleMessage = AuroraBetaStyler.styleOutput({
              headerText: "Solo Leveling Battle",
              headerSymbol: "⚔️",
              headerStyle: "bold",
              bodyText: `Victory! You defeated ${enemy} with strength ${userStrength} vs ${enemyStrength}! Gained ${expGain} EXP. New Level: ${userData.level}, Rank: ${userData.rank}. Reply with 'arise ${enemy} <nickname>' to awaken this Shadow Monarch!`,
              bodyStyle: "bold",
              footerText: "",
            });
            let sentMessageID;
            await new Promise((resolve) => {
              api.sendMessage(battleMessage, threadID, (err, info) => {
                if (err) resolve(err);
                else {
                  sentMessageID = info.messageID;
                  resolve(info);
                }
              }, messageID);
            });
            if (!global.Kagenou.replyListeners) global.Kagenou.replyListeners = new Map();
            const handleReply = async ({ api, event }) => {
              const { body } = event;
              const reply = body.toLowerCase().trim().split(" ");
              if (reply[0] === "arise") {
                const inputEnemy = reply[1]?.replace(/_/g, " ");
                const normalizedEnemy = shadowMonarchs.find(m => m.toLowerCase() === inputEnemy);
                if (normalizedEnemy) {
                  const nickname = reply.slice(2).join(" ") || `${normalizedEnemy.toLowerCase()}Shadow`;
                  const statBoosts = {
                    "Kamish": { strength: 100, agility: 50, mana: 200 },
                    "Ant King": { strength: 150, mana: 200 },
                    "Monarch of Destruction": { agility: 100, mana: 300 },
                    "Ruler's Shadow": { strength: 200, agility: 50 },
                    "Ashborn": { strength: 500, agility: 500, mana: 1000 }
                  };
                  const boosts = statBoosts[normalizedEnemy] || { strength: 20, agility: 20, mana: 20 };
                  userData.stats.strength = Math.max(0, Number(userData.stats.strength) || 0) + boosts.strength;
                  userData.stats.agility = Math.max(0, Number(userData.stats.agility) || 0) + boosts.agility;
                  userData.stats.mana = Math.max(0, Number(userData.stats.mana) || 0) + boosts.mana;
                  userData.shadows.push({ name: normalizedEnemy, nickname, level: 1 });
                  await saveHunterData(db, senderID.toString(), userData);
                  await api.sendMessage(
                    AuroraBetaStyler.styleOutput({
                      headerText: "Solo Leveling Arise",
                      headerSymbol: "🌑",
                      headerStyle: "bold",
                      bodyText: `Awakened ${normalizedEnemy} as ${nickname}! Gain ${boosts.strength} Strength, ${boosts.agility} Agility, ${boosts.mana} Mana.`,
                      bodyStyle: "bold",
                      footerText: "",
                    }),
                    threadID,
                    event.messageID
                  );
                }
              }
            };
            global.Kagenou.replyListeners.set(sentMessageID, { callback: handleReply });
          } else {
            await saveHunterData(db, senderID.toString(), userData);
            await api.sendMessage(battleMessage, threadID, messageID);
          }
        } else {
          const battleMessage = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Battle",
            headerSymbol: "💥",
            headerStyle: "bold",
            bodyText: `Defeated by ${enemy} (strength ${enemyStrength} vs ${userStrength}). Gained ${expGain} EXP. New Level: ${userData.level}, Rank: ${userData.rank}. Train harder!`,
            bodyStyle: "bold",
            footerText: "",
          });
          await saveHunterData(db, senderID.toString(), userData);
          await api.sendMessage(battleMessage, threadID, messageID);
        }
      } else if (userData.rank === "X") {
        const expGain = Math.max(0, Math.floor(Math.random() * 5000) + 2000);
        userData.exp += expGain;
        const battleMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Battle",
          headerSymbol: "⚔️",
          headerStyle: "bold",
          bodyText: `X Rank Dominance! All enemies defeated instantly! Gained ${expGain} EXP. New Level: ${userData.level}, Rank: ${userData.rank}.`,
          bodyStyle: "bold",
          footerText: "",
        });
        await saveHunterData(db, senderID.toString(), userData);
        await api.sendMessage(battleMessage, threadID, messageID);
      } else {
        const stats = userData.stats || { strength: 0, agility: 0, mana: 0 };
        userData.exp += 100;
        stats.agility = Math.max(0, Number(stats.agility) || 0) + 100;
        stats.mana = Math.max(0, Number(stats.mana) || 0) + 100;
        userData.stats = stats;
        userData.level = Math.max(1, Math.floor(userData.exp / 1000) + 1);
        const noEncounterMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Battle",
          headerSymbol: "ℹ️",
          headerStyle: "bold",
          bodyText: "No enemies encountered this time. Gained 100 EXP, 100 Agility, and 100 Mana! New Level: " + userData.level,
          bodyStyle: "bold",
          footerText: "",
        });
        await saveHunterData(db, senderID.toString(), userData);
        await api.sendMessage(noEncounterMessage, threadID, messageID);
      }
      return;
    }

    if (action === "dungeon") {
      const subAction = args[1]?.toLowerCase();
      if (subAction === "status") {
        const remaining = Math.max(0, Number(userData.dungeonCooldown) || 0) > currentTime ? Math.ceil((Math.max(0, Number(userData.dungeonCooldown) || 0) - currentTime) / 60) : 0;
        const statusMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Dungeon Status",
          headerSymbol: "🏰",
          headerStyle: "bold",
          bodyText: `Last Tier: ${userData.rank || "E"}\nCooldown: ${remaining} mins\nMaterials: ${Object.entries(userData.inventory.materials || {}).map(([k, v]) => `${k} x${Math.max(0, Number(v) || 0)}`).join(", ") || "None"}`,
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(statusMessage, threadID, messageID);
        return;
      }
      const tier = subAction?.toUpperCase();
      const tiers = ["D", "C", "B", "A", "S"];
      if (!tier || !tiers.includes(tier)) {
        const invalidTier = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Dungeon",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "Invalid tier. Use /sl dungeon <tier> (D, C, B, A, S).",
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(invalidTier, threadID, messageID);
        return;
      }
      if (Math.max(0, Number(userData.dungeonCooldown) || 0) > currentTime) {
        const remaining = Math.max(0, Number(userData.dungeonCooldown) || 0) - currentTime;
        const cooldownMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Dungeon",
          headerSymbol: "⏳",
          headerStyle: "bold",
          bodyText: `Cooldown active. Wait ${Math.ceil(remaining / 60)} minutes.`,
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(cooldownMessage, threadID, messageID);
        return;
      }
      const rewards = {
        D: { exp: 500, materials: { "iron_ore": 2, "mana_crystal": 1 } },
        C: { exp: 1000, materials: { "iron_ore": 3, "mana_crystal": 2 } },
        B: { exp: 1500, materials: { "mythril": 2, "mana_crystal": 3 } },
        A: { exp: 2000, materials: { "mythril": 3, "dragon_scale": 1 } },
        S: { exp: 3000, materials: { "dragon_scale": 2, "shadow_essence": 1 } },
      };
      const expGain = Math.max(0, Math.floor(Math.random() * rewards[tier].exp) + rewards[tier].exp / 2);
      userData.exp = Math.max(0, Number(userData.exp) || 0) + expGain;
      userData.level = Math.max(1, Math.floor(userData.exp / 1000) + 1);
      for (const [material, qty] of Object.entries(rewards[tier].materials)) {
        userData.inventory.materials[material] = Math.max(0, Number(userData.inventory.materials[material] || 0)) + Number(qty);
      }
      userData.dungeonCooldown = currentTime + dungeonCooldown;
      applyRankProgression(userData);
      await saveHunterData(db, senderID.toString(), userData);
      const materialList = Object.entries(rewards[tier].materials).map(([k, v]) => `${k.replace("_", " ")} x${v}`).join(", ");
      const dungeonMessage = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling Dungeon",
        headerSymbol: "🏰",
        headerStyle: "bold",
        bodyText: `Cleared ${tier}-tier dungeon! Gained ${expGain} EXP and ${materialList}. New Level: ${userData.level}, Rank: ${userData.rank}.`,
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(dungeonMessage, threadID, messageID);
      return;
    }

    if (action === "train") {
      const stat = args[1]?.toLowerCase();
      const validStats = ["strength", "agility", "mana"];
      if (!stat || !validStats.includes(stat)) {
        const invalidStat = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Train",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "Invalid stat. Use /sl train <strength/agility/mana>.",
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(invalidStat, threadID, messageID);
        return;
      }
      const stats = userData.stats || { strength: 0, agility: 0, mana: 0 };
      stats[stat] = Math.max(0, Number(stats[stat]) || 0) + 10;
      userData.stats = stats;
      userData.exp = Math.max(0, Number(userData.exp) || 0) + 50;
      userData.level = Math.max(1, Math.floor(userData.exp / 1000) + 1);
      applyRankProgression(userData);
      await saveHunterData(db, senderID.toString(), userData);
      const trainMessage = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling Train",
        headerSymbol: "💪",
        headerStyle: "bold",
        bodyText: `Trained ${stat}! +10 ${stat}, +50 EXP. New ${stat}: ${stats[stat]}. New Level: ${userData.level}, Rank: ${userData.rank}.`,
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(trainMessage, threadID, messageID);
      return;
    }

    if (action === "quest") {
      const quests = {
        "kill_10_enemies": { goal: 10, reward: 500, description: "Kill 10 enemies in battle." },
        "clear_dungeon_C": { goal: 1, reward: 1000, description: "Clear a C-tier dungeon." },
        "train_5_times": { goal: 5, reward: 300, description: "Train any stat 5 times." },
      };
      if (!userData.quests["kill_10_enemies"]) {
  userData.quests["kill_10_enemies"] = { goal: 10, progress: 0, reward: 500, completed: false, description: "Kill 10 enemies in battle." };
  userData.quests["clear_dungeon_C"] = { goal: 1, progress: 0, reward: 1000, completed: false, description: "Clear a C-tier dungeon." };
  userData.quests["train_5_times"] = { goal: 5, progress: 0, reward: 300, completed: false, description: "Train any stat 5 times." };
}
      const questList = Object.entries(userData.quests).map(([key, q]) => {
        return `${key.replace("_", " ")}: ${q.description} (${q.progress}/${q.goal}) ${q.completed ? "[Completed]" : ""}`;
      }).join("\n");
      const questMessage = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling Quests",
        headerSymbol: "📜",
        headerStyle: "bold",
        bodyText: `Available Quests:\n${questList}`,
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(questMessage, threadID, messageID);
      return;
    }

    if (action === "guild") {
      const subAction = args[1]?.toLowerCase();
      const guildCollection = db.db("guilds");
      const guilds = await guildCollection.find({ isSeason2: { $ne: true } }).toArray();

      if (subAction === "create") {
        const guildName = args.slice(2).join(" ") || `Guild${Math.floor(Math.random() * 1000)}`;
        if (userData.guild) {
          const alreadyInGuild = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "🛑",
            headerStyle: "bold",
            bodyText: `Already in ${userData.guild}. Leave to create a new one.`,
            bodyStyle: "bold",
            footerText: "",
          });
          await api.sendMessage(alreadyInGuild, threadID, messageID);
          return;
        }
        if (guilds.some(g => g.name === guildName)) {
          const guildExists = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "⚠️",
            headerStyle: "bold",
            bodyText: `Guild ${guildName} already exists. Join it instead!`,
            bodyStyle: "bold",
            footerText: "",
          });
          await api.sendMessage(guildExists, threadID, messageID);
          return;
        }
        userData.guild = guildName;
        const stats = userData.stats || { strength: 0, agility: 0, mana: 0 };
        const baseStrength = Math.max(0, Number(stats.strength) || 0);
        await guildCollection.insertOne({ name: guildName, members: [senderID.toString()], totalStrength: baseStrength + 50, hasChangedName: false, isSeason2: false });
        await saveHunterData(db, senderID.toString(), userData);
        const createMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Guild",
          headerSymbol: "🛡️",
          headerStyle: "bold",
          bodyText: `Created Guild: ${guildName}. +50 Group Strength.`,
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(createMessage, threadID, messageID);
        return;
      }

      if (subAction === "join") {
        const guildName = args.slice(2).join(" ");
        if (!guildName) {
          const noGuildName = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "⚠️",
            headerStyle: "bold",
            bodyText: "Please specify a guild name. Usage: /sl guild join <guild name>",
            bodyStyle: "bold",
            footerText: "",
          });
          await api.sendMessage(noGuildName, threadID, messageID);
          return;
        }
        if (userData.guild) {
          const alreadyInGuild = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "🛑",
            headerStyle: "bold",
            bodyText: `Already in ${userData.guild}. Leave to join another.`,
            bodyStyle: "bold",
            footerText: "",
          });
          await api.sendMessage(alreadyInGuild, threadID, messageID);
          return;
        }
        const targetGuild = guilds.find(g => g.name === guildName);
        if (!targetGuild) {
          const guildNotFound = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "❌",
            headerStyle: "bold",
            bodyText: `Guild ${guildName} does not exist.`,
            bodyStyle: "bold",
            footerText: "",
          });
          await api.sendMessage(guildNotFound, threadID, messageID);
          return;
        }
        userData.guild = guildName;
        const stats = userData.stats || { strength: 0, agility: 0, mana: 0 };
        targetGuild.members.push(senderID.toString());
        targetGuild.totalStrength = Math.max(0, Number(targetGuild.totalStrength) || 0) + Math.max(0, Number(stats.strength) || 0);
        await guildCollection.updateOne({ name: guildName, isSeason2: false }, { $set: targetGuild });
        await saveHunterData(db, senderID.toString(), userData);
        const joinMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Guild",
          headerSymbol: "✅",
          headerStyle: "bold",
          bodyText: `Joined ${guildName}! Added ${Math.max(0, Number(stats.strength) || 0)} to guild strength.`,
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(joinMessage, threadID, messageID);
        return;
      }

      if (subAction === "leave") {
        if (!userData.guild) {
          const noGuild = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "❌",
            headerStyle: "bold",
            bodyText: "You are not in a guild to leave!",
            bodyStyle: "bold",
            footerText: "",
          });
          await api.sendMessage(noGuild, threadID, messageID);
          return;
        }
        const currentGuild = guilds.find(g => g.name === userData.guild);
        if (!currentGuild) {
          userData.guild = undefined;
          await saveHunterData(db, senderID.toString(), userData);
          const noGuildFound = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "ℹ️",
            headerStyle: "bold",
            bodyText: "Your guild no longer exists. You have been removed.",
            bodyStyle: "bold",
            footerText: "",
          });
          await api.sendMessage(noGuildFound, threadID, messageID);
          return;
        }
        const stats = userData.stats || { strength: 0, agility: 0, mana: 0 };
        const memberStrength = Math.max(0, Number(stats.strength) || 0);
        currentGuild.members = currentGuild.members.filter(member => member !== senderID.toString());
        currentGuild.totalStrength = Math.max(0, currentGuild.totalStrength - memberStrength);
        await guildCollection.updateOne({ name: currentGuild.name, isSeason2: false }, { $set: currentGuild });
        userData.guild = undefined;
        await saveHunterData(db, senderID.toString(), userData);
        const leaveMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Guild",
          headerSymbol: "🚪",
          headerStyle: "bold",
          bodyText: `You have left ${currentGuild.name}.`,
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(leaveMessage, threadID, messageID);
        return;
      }

      if (subAction === "fight") {
        const targetGuildName = args.slice(2).join(" ");
        if (!userData.guild) {
          const noGuild = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "❌",
            headerStyle: "bold",
            bodyText: "You must be in a guild to fight!",
            bodyStyle: "bold",
            footerText: "",
          });
          await api.sendMessage(noGuild, threadID, messageID);
          return;
        }
        if (!targetGuildName) {
          const noTarget = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "⚠️",
            headerStyle: "bold",
            bodyText: "Please specify a guild to fight. Usage: /sl guild fight <guild name>",
            bodyStyle: "bold",
            footerText: "",
          });
          await api.sendMessage(noTarget, threadID, messageID);
          return;
        }
        const myGuild = guilds.find(g => g.name === userData.guild);
        const targetGuild = guilds.find(g => g.name === targetGuildName);
        if (!targetGuild || myGuild.name === targetGuild.name) {
          const invalidTarget = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "⚠️",
            headerStyle: "bold",
            bodyText: "Invalid target guild or you can't fight your own guild!",
            bodyStyle: "bold",
            footerText: "",
          });
          await api.sendMessage(invalidTarget, threadID, messageID);
          return;
        }
        const myStrength = Math.max(0, Number(myGuild.totalStrength) || 0);
        const targetStrength = Math.max(0, Number(targetGuild.totalStrength) || 0);
        const fightResult = myStrength > targetStrength || userData.rank === "X";
        if (fightResult) {
          userData.exp = Math.max(0, Number(userData.exp) || 0) + 1000;
          userData.level = Math.max(1, Math.floor(userData.exp / 1000) + 1);
          applyRankProgression(userData);
          await saveHunterData(db, senderID.toString(), userData);
          const fightMessage = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild Fight",
            headerSymbol: "⚔️",
            headerStyle: "bold",
            bodyText: `Victory! ${myGuild.name} defeated ${targetGuild.name} (${myStrength} vs ${targetStrength})! Gained 1000 EXP. New Level: ${userData.level}, Rank: ${userData.rank}.`,
            bodyStyle: "bold",
            footerText: "",
          });
          await api.sendMessage(fightMessage, threadID, messageID);
        } else {
          const fightMessage = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild Fight",
            headerSymbol: "💥",
            headerStyle: "bold",
            bodyText: `Defeated! ${myGuild.name} lost to ${targetGuild.name} (${myStrength} vs ${targetStrength}). Train harder!`,
            bodyStyle: "bold",
            footerText: "",
          });
          await api.sendMessage(fightMessage, threadID, messageID);
        }
        return;
      }

      if (subAction === "list") {
        if (guilds.length === 0) {
          const noGuilds = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "ℹ️",
            headerStyle: "bold",
            bodyText: "No guilds have been created yet.",
            bodyStyle: "bold",
            footerText: "",
          });
          await api.sendMessage(noGuilds, threadID, messageID);
          return;
        }
        const guildList = guilds.map(g => `- ${g.name}: ${Math.max(0, Number(g.totalStrength) || 0)} Total Strength`).join("\n");
        const listMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Guild List",
          headerSymbol: "🛡️",
          headerStyle: "bold",
          bodyText: `Active Guilds:\n${guildList}`,
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(listMessage, threadID, messageID);
        return;
      }

      if (subAction === "changename") {
        const newGuildName = args.slice(2).join(" ");
        if (!userData.guild) {
          const noGuild = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "❌",
            headerStyle: "bold",
            bodyText: "You must be in a guild to change its name!",
            bodyStyle: "bold",
            footerText: "",
          });
          await api.sendMessage(noGuild, threadID, messageID);
          return;
        }
        if (!newGuildName) {
          const invalidInput = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "⚠️",
            headerStyle: "bold",
            bodyText: "Please specify a new guild name. Usage: /sl guild changename <new name>",
            bodyStyle: "bold",
            footerText: "",
          });
          await api.sendMessage(invalidInput, threadID, messageID);
          return;
        }
        const currentGuild = guilds.find(g => g.name === userData.guild);
        if (!currentGuild) {
          userData.guild = undefined;
          await saveHunterData(db, senderID.toString(), userData);
          const noGuildFound = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "ℹ️",
            headerStyle: "bold",
            bodyText: "Your guild no longer exists. You have been removed.",
            bodyStyle: "bold",
            footerText: "",
          });
          await api.sendMessage(noGuildFound, threadID, messageID);
          return;
        }
        if (currentGuild.hasChangedName) {
          const alreadyChanged = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "🛑",
            headerStyle: "bold",
            bodyText: `Guild ${currentGuild.name} has already changed its name once.`,
            bodyStyle: "bold",
            footerText: "",
          });
          await api.sendMessage(alreadyChanged, threadID, messageID);
          return;
        }
        if (guilds.some(g => g.name.toLowerCase() === newGuildName.toLowerCase())) {
          const nameTaken = AuroraBetaStyler.styleOutput({
            headerText: "Solo Leveling Guild",
            headerSymbol: "⚠️",
            headerStyle: "bold",
            bodyText: `Guild name ${newGuildName} is already taken.`,
            bodyStyle: "bold",
            footerText: "",
          });
          await api.sendMessage(nameTaken, threadID, messageID);
          return;
        }
        await guildCollection.updateOne(
          { name: currentGuild.name, isSeason2: false },
          { $set: { name: newGuildName, hasChangedName: true } }
        );
        const huntersCollection = db.db("hunters");
        await huntersCollection.updateMany(
          { guild: currentGuild.name },
          { $set: { guild: newGuildName } }
        );
        userData.guild = newGuildName;
        await saveHunterData(db, senderID.toString(), userData);
        const changeNameMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Guild",
          headerSymbol: "✅",
          headerStyle: "bold",
          bodyText: `Guild name changed from ${currentGuild.name} to ${newGuildName}.`,
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(changeNameMessage, threadID, messageID);
        return;
      }

      const invalidGuildCommand = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling Guild",
        headerSymbol: "⚠️",
        headerStyle: "bold",
        bodyText: "Invalid guild command. Use /sl guild [create <name> | join <guild name> | leave | fight <guild name> | list | changename <new name>].",
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(invalidGuildCommand, threadID, messageID);
      return;
    }

    if (action === "meditate") {
      if (Math.max(0, Number(userData.meditateCooldown) || 0) > currentTime) {
        const remaining = Math.max(0, Number(userData.meditateCooldown) || 0) - currentTime;
        const cooldownMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Meditate",
          headerSymbol: "⏳",
          headerStyle: "bold",
          bodyText: `Cooldown active. Wait ${Math.ceil(remaining / 60)} minutes.`,
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(cooldownMessage, threadID, messageID);
        return;
      }
      const stats = userData.stats || { strength: 0, agility: 0, mana: 0 };
      stats.mana = Math.max(0, Number(stats.mana) || 0) + 50;
      userData.stats = stats;
      userData.meditateCooldown = currentTime + meditateCooldown;
      await saveHunterData(db, senderID.toString(), userData);
      const meditateMessage = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling Meditate",
        headerSymbol: "🧘",
        headerStyle: "bold",
        bodyText: `Meditated successfully! +50 Mana. New Mana: ${stats.mana}.`,
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(meditateMessage, threadID, messageID);
      return;
    }

    if (action === "shadowlist") {
      const shadowList = userData.shadows.length > 0
        ? userData.shadows.map(s => `- ${s.name} (${s.nickname}, Level ${Math.max(1, Number(s.level) || 1)})`).join("\n")
        : "No shadows summoned.";
      const lostShadowList = userData.lostShadows && userData.lostShadows.length > 0
        ? userData.lostShadows.map(s => `- ${s.name} (${s.nickname})`).join("\n")
        : "No shadows lost.";
      const shadowMessage = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling Shadow List",
        headerSymbol: "🌑",
        headerStyle: "bold",
        bodyText: `Current Shadows:\n${shadowList}\n\nLost Shadows:\n${lostShadowList}`,
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(shadowMessage, threadID, messageID);
      return;
    }

    if (action === "setrole") {
      const role = args[1]?.toLowerCase();
      const validRoles = ["tank", "mage", "assassin", "healer", "ranger"];
      if (!role || !validRoles.includes(role)) {
        const invalidRole = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Set Role",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "Invalid role. Use /sl setrole <tank/mage/assassin/healer/ranger>.",
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(invalidRole, threadID, messageID);
        return;
      }
      userData.role = role;
      applyRoleSkills(userData);
      await saveHunterData(db, senderID.toString(), userData);
      const roleMessage = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling Set Role",
        headerSymbol: "✅",
        headerStyle: "bold",
        bodyText: `Role set to ${role}. Skills applied based on rank ${userData.rank}.`,
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(roleMessage, threadID, messageID);
      return;
    }

    if (action === "changename") {
      const newName = args.slice(1).join(" ");
      if (!newName) {
        const invalidName = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Change Name",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "Please provide a new name. Usage: /sl changename <newname>",
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(invalidName, threadID, messageID);
        return;
      }
      if (userData.hasChangedName) {
        const alreadyChanged = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Change Name",
          headerSymbol: "🛑",
          headerStyle: "bold",
          bodyText: "You can only change your name once!",
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(alreadyChanged, threadID, messageID);
        return;
      }
      const huntersCollection = db.db("hunters");
      const existingHunter = await huntersCollection.findOne({ name: newName });
      if (existingHunter) {
        const nameTaken = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Change Name",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: `The name "${newName}" is already taken. Choose another.`,
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(nameTaken, threadID, messageID);
        return;
      }
      userData.name = newName;
      userData.hasChangedName = true;
      await saveHunterData(db, senderID.toString(), userData);
      const changeNameMessage = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling Change Name",
        headerSymbol: "✅",
        headerStyle: "bold",
        bodyText: `Name changed to ${newName}.`,
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(changeNameMessage, threadID, messageID);
      return;
    }

// Check if the sender is disabled


if (action === "customize" && args[1]?.toLowerCase() === "set") {
  const senderIDStr = senderID.toString();
  const isAuthorized =
    (global.config.vips && global.config.vips.map(String).includes(senderIDStr)) ||
    (global.config.developers && global.config.developers.map(String).includes(senderIDStr)) ||
    (global.config.admins && global.config.admins.map(String).includes(senderIDStr));

  if (!isAuthorized) {
    const permissionDenied = AuroraBetaStyler.styleOutput({
      headerText: "Solo Leveling Customize",
      headerSymbol: "❌",
      headerStyle: "bold",
      bodyText: "Only VIPs, Developers, or Admins can use this command.",
      bodyStyle: "bold",
      footerText: "",
    });
    await api.sendMessage(permissionDenied, threadID, messageID);
    return;
  }

  const targetName = args[2];
  const newName = args[3];
  const newRank = args[4]?.toUpperCase();
  const newLevel = parseInt(args[5]);
  const newRole = args[6]?.toLowerCase();
  const newStats = parseInt(args[7]);
  const newExp = parseInt(args[8]);
  const newEquipment = args[9];
  const newGuildName = args[10];
  const guildLevel = 9000000;

  if (!targetName || !newName || !newRank || isNaN(newLevel) || !newRole || isNaN(newStats) || isNaN(newExp) || !newEquipment || !newGuildName) {
    const invalidInput = AuroraBetaStyler.styleOutput({
      headerText: "Solo Leveling Customize",
      headerSymbol: "⚠️",
      headerStyle: "bold",
      bodyText: "Invalid input. Usage: /sl customize set <user name> <name> <rank> <level> <role> <stats> <exp> <equipment> <guild_name>",
      bodyStyle: "bold",
      footerText: "",
    });
    await api.sendMessage(invalidInput, threadID, messageID);
    return;
  }

  const huntersCollection = db?.db("hunters");
  if (!huntersCollection) {
    const dbError = AuroraBetaStyler.styleOutput({
      headerText: "Solo Leveling Customize",
      headerSymbol: "❌",
      headerStyle: "bold",
      bodyText: "Database not available. Please try again later.",
      bodyStyle: "bold",
      footerText: "",
    });
    await api.sendMessage(dbError, threadID, messageID);
    return;
  }

  const targetHunter = await huntersCollection.findOne({ name: targetName });
  if (!targetHunter) {
    const notFound = AuroraBetaStyler.styleOutput({
      headerText: "Solo Leveling Customize",
      headerSymbol: "⚠️",
      headerStyle: "bold",
      bodyText: `User with name "${targetName}" not found.`,
      bodyStyle: "bold",
      footerText: "",
    });
    await api.sendMessage(notFound, threadID, messageID);
    return;
  }

  const validRanks = ["E", "D", "C", "B", "A", "S", "X"];
  if (!newRank || !validRanks.includes(newRank)) {
    const invalidRank = AuroraBetaStyler.styleOutput({
      headerText: "Solo Leveling Customize",
      headerSymbol: "⚠️",
      headerStyle: "bold",
      bodyText: "Invalid rank. Must be one of: E, D, C, B, A, S, X.",
      bodyStyle: "bold",
      footerText: "",
    });
    await api.sendMessage(invalidRank, threadID, messageID);
    return;
  }

  if (newLevel < 1) {
    const invalidLevel = AuroraBetaStyler.styleOutput({
      headerText: "Solo Leveling Customize",
      headerSymbol: "⚠️",
      headerStyle: "bold",
      bodyText: "Level must be a positive number.",
      bodyStyle: "bold",
      footerText: "",
    });
    await api.sendMessage(invalidLevel, threadID, messageID);
    return;
  }

  const validRoles = ["tank", "mage", "assassin", "healer", "ranger"];
  if (!newRole || !validRoles.includes(newRole)) {
    const invalidRole = AuroraBetaStyler.styleOutput({
      headerText: "Solo Leveling Customize",
      headerSymbol: "⚠️",
      headerStyle: "bold",
      bodyText: "Invalid role. Must be one of: tank, mage, assassin, healer, ranger.",
      bodyStyle: "bold",
      footerText: "",
    });
    await api.sendMessage(invalidRole, threadID, messageID);
    return;
  }

  if (newStats < 0) {
    const invalidStats = AuroraBetaStyler.styleOutput({
      headerText: "Solo Leveling Customize",
      headerSymbol: "⚠️",
      headerStyle: "bold",
      bodyText: "Stats value must be non-negative.",
      bodyStyle: "bold",
      footerText: "",
    });
    await api.sendMessage(invalidStats, threadID, messageID);
    return;
  }

  if (newExp < 0) {
    const invalidExp = AuroraBetaStyler.styleOutput({
      headerText: "Solo Leveling Customize",
      headerSymbol: "⚠️",
      headerStyle: "bold",
      bodyText: "EXP must be a non-negative number.",
      bodyStyle: "bold",
      footerText: "",
    });
    await api.sendMessage(invalidExp, threadID, messageID);
    return;
  }

  const existingHunter = await huntersCollection.findOne({ name: newName });
  if (existingHunter && existingHunter.userID !== targetHunter.userID) {
    const nameTaken = AuroraBetaStyler.styleOutput({
      headerText: "Solo Leveling Customize",
      headerSymbol: "⚠️",
      headerStyle: "bold",
      bodyText: `The name "${newName}" is already taken. Choose another.`,
      bodyStyle: "bold",
      footerText: "",
    });
    await api.sendMessage(nameTaken, threadID, messageID);
    return;
  }

  const guildCollection = db?.db("guilds");
  if (!guildCollection) {
    const dbError = AuroraBetaStyler.styleOutput({
      headerText: "Solo Leveling Customize",
      headerSymbol: "❌",
      headerStyle: "bold",
      bodyText: "Database not available. Please try again later.",
      bodyStyle: "bold",
      footerText: "",
    });
    await api.sendMessage(dbError, threadID, messageID);
    return;
  }

  let guildData = await guildCollection.findOne({ name: newGuildName, isSeason2: false });
  if (!guildData) {
    guildData = {
      name: newGuildName,
      members: [targetHunter.userID],
      totalStrength: newStats,
      hasChangedName: false,
      isSeason2: false,
      level: guildLevel,
    };
    await guildCollection.insertOne(guildData);
  } else if (!guildData.members.includes(targetHunter.userID)) {
    guildData.members.push(targetHunter.userID);
    guildData.totalStrength = Math.max(0, Number(guildData.totalStrength) || 0) + newStats;
    guildData.level = guildLevel;
    await guildCollection.updateOne(
      { name: newGuildName, isSeason2: false },
      { $set: guildData }
    );
  }

  const targetUserData = usersData.get(targetHunter.userID) || {};
  targetUserData.name = newName;
  targetUserData.rank = newRank;
  targetUserData.level = newLevel;
  targetUserData.role = newRole;
  targetUserData.stats = { strength: newStats, agility: newStats, mana: newStats };
  targetUserData.exp = newExp;
  targetUserData.equipment = targetUserData.equipment || { swords: {} };
  targetUserData.equipment.swords = { [newEquipment.replace(/\s+/g, "_").toLowerCase()]: 1000000000 };
  targetUserData.guild = newGuildName;
  targetUserData.hasChangedName = true;
  applyRoleSkills(targetUserData);
  await saveHunterData(db, targetHunter.userID, targetUserData);
  usersData.set(targetHunter.userID, targetUserData);

  const customizeMessage = AuroraBetaStyler.styleOutput({
    headerText: "Solo Leveling Customize",
    headerSymbol: "✅",
    headerStyle: "bold",
    bodyText: `Customized hunter "${targetName}":\nName: ${newName}\nRank: ${newRank}\nLevel: ${newLevel}\nRole: ${newRole}\nStats: Strength ${newStats}, Agility ${newStats}, Mana ${newStats}\nEXP: ${newExp}\nEquipment: ${newEquipment} (1B damage)\nGuild: ${newGuildName} (Level ${guildLevel})`,
    bodyStyle: "bold",
    footerText: "",
  });
  await api.sendMessage(customizeMessage, threadID, messageID);
  return;
}



    if (action === "gate" && args[1]?.toLowerCase() === "enter") {
      const gateClass = args[2]?.toLowerCase();
      const validClasses = ["blue", "red", "violet", "orange"];
      if (!gateClass || !validClasses.includes(gateClass)) {
        const invalidClass = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Gate",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "Invalid gate class. Use /sl gate enter <blue/red/violet/orange>.",
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(invalidClass, threadID, messageID);
        return;
      }
      if (Math.max(0, Number(userData.gateCooldown) || 0) > currentTime) {
        const remaining = Math.max(0, Number(userData.gateCooldown) || 0) - currentTime;
        const cooldownMessage = AuroraBetaStyler.styleOutput({
          headerText: "Solo Leveling Gate",
          headerSymbol: "⏳",
          headerStyle: "bold",
          bodyText: `Cooldown active. Wait ${Math.ceil(remaining / 60)} minutes.`,
          bodyStyle: "bold",
          footerText: "",
        });
        await api.sendMessage(cooldownMessage, threadID, messageID);
        return;
      }
      userData.exp = Math.max(0, Number(userData.exp) || 0) + 3000;
      userData.level = Math.max(1, Math.floor(userData.exp / 1000) + 1);
      userData.gateCooldown = currentTime + gateCooldown;
      applyRankProgression(userData);
      await saveHunterData(db, senderID.toString(), userData);
      const gateMessage = AuroraBetaStyler.styleOutput({
        headerText: "Solo Leveling Gate",
        headerSymbol: "🌌",
        headerStyle: "bold",
        bodyText: `Cleared ${gateClass} gate! Gained 3000 EXP. New Level: ${userData.level}, Rank: ${userData.rank}.`,
        bodyStyle: "bold",
        footerText: "",
      });
      await api.sendMessage(gateMessage, threadID, messageID);
      return;
    }
      
     // Check if the sender is disabled
const disabledUsersCollection = db?.db("disabledUsers");
if (disabledUsersCollection) {
  const disabledUser = await disabledUsersCollection.findOne({ userID: senderID.toString() });
  if (disabledUser) {
    const disabledMessage = AuroraBetaStyler.styleOutput({
      headerText: "Solo Leveling",
      headerSymbol: "❌",
      headerStyle: "bold",
      bodyText: "You are disabled from using Solo Leveling commands.",
      bodyStyle: "bold",
      footerText: "",
    });
    await api.sendMessage(disabledMessage, threadID, messageID);
    return;
  }
}

if (action === "disabled") {
  const senderIDStr = senderID.toString();
  const isAuthorized =
    (global.config.vips && global.config.vips.map(String).includes(senderIDStr)) ||
    (global.config.developers && global.config.developers.map(String).includes(senderIDStr)) ||
    (global.config.admins && global.config.admins.map(String).includes(senderIDStr));

  if (!isAuthorized) {
    const permissionDenied = AuroraBetaStyler.styleOutput({
      headerText: "Solo Leveling Disable",
      headerSymbol: "❌",
      headerStyle: "bold",
      bodyText: "Only VIPs, Developers, or Admins can use this command.",
      bodyStyle: "bold",
      footerText: "",
    });
    await api.sendMessage(permissionDenied, threadID, messageID);
    return;
  }

  const targetName = args[1];
  if (!targetName) {
    const invalidInput = AuroraBetaStyler.styleOutput({
      headerText: "Solo Leveling Disable",
      headerSymbol: "⚠️",
      headerStyle: "bold",
      bodyText: "Please provide a user name. Usage: /sl disabled <name>",
      bodyStyle: "bold",
      footerText: "",
    });
    await api.sendMessage(invalidInput, threadID, messageID);
    return;
  }

  const huntersCollection = db?.db("hunters");
  const disabledUsersCollection = db?.db("disabledUsers");
  if (!huntersCollection || !disabledUsersCollection) {
    const dbError = AuroraBetaStyler.styleOutput({
      headerText: "Solo Leveling Disable",
      headerSymbol: "❌",
      headerStyle: "bold",
      bodyText: "Database not available. Please try again later.",
      bodyStyle: "bold",
      footerText: "",
    });
    await api.sendMessage(dbError, threadID, messageID);
    return;
  }

  const targetHunter = await huntersCollection.findOne({ name: targetName });
  if (!targetHunter) {
    const notFound = AuroraBetaStyler.styleOutput({
      headerText: "Solo Leveling Disable",
      headerSymbol: "⚠️",
      headerStyle: "bold",
      bodyText: `User with name "${targetName}" not found.`,
      bodyStyle: "bold",
      footerText: "",
    });
    await api.sendMessage(notFound, threadID, messageID);
    return;
  }

  const targetUserID = targetHunter.userID;
  const alreadyDisabled = await disabledUsersCollection.findOne({ userID: targetUserID });
  if (alreadyDisabled) {
    const alreadyDisabledMessage = AuroraBetaStyler.styleOutput({
      headerText: "Solo Leveling Disable",
      headerSymbol: "⚠️",
      headerStyle: "bold",
      bodyText: `User "${targetName}" is already disabled.`,
      bodyStyle: "bold",
      footerText: "",
    });
    await api.sendMessage(alreadyDisabledMessage, threadID, messageID);
    return;
  }

  // Mark user as disabled in hunters instead of deleting
  await huntersCollection.updateOne(
    { userID: targetUserID },
    { $set: { disabled: true } }
  );
  // Add to disabledUsers
  await disabledUsersCollection.insertOne({ userID: targetUserID, name: targetName });
  // Clear from usersData to prevent in-memory access
  usersData.delete(targetUserID);

  const successMessage = AuroraBetaStyler.styleOutput({
    headerText: "Solo Leveling Disable",
    headerSymbol: "✅",
    headerStyle: "bold",
    bodyText: `User "${targetName}" has been disabled.`,
    bodyStyle: "bold",
    footerText: "",
  });
  await api.sendMessage(successMessage, threadID, messageID);
  return;
}

if (action === "undisabled") {
  const senderIDStr = senderID.toString();
  const isAuthorized =
    (global.config.vips && global.config.vips.map(String).includes(senderIDStr)) ||
    (global.config.developers && global.config.developers.map(String).includes(senderIDStr)) ||
    (global.config.admins && global.config.admins.map(String).includes(senderIDStr));

  if (!isAuthorized) {
    const permissionDenied = AuroraBetaStyler.styleOutput({
      headerText: "Solo Leveling Undisable",
      headerSymbol: "❌",
      headerStyle: "bold",
      bodyText: "Only VIPs, Developers, or Admins can use this command.",
      bodyStyle: "bold",
      footerText: "",
    });
    await api.sendMessage(permissionDenied, threadID, messageID);
    return;
  }

  const targetName = args[1];
  if (!targetName) {
    const invalidInput = AuroraBetaStyler.styleOutput({
      headerText: "Solo Leveling Undisable",
      headerSymbol: "⚠️",
      headerStyle: "bold",
      bodyText: "Please provide a user name. Usage: /sl undisabled <name>",
      bodyStyle: "bold",
      footerText: "",
    });
    await api.sendMessage(invalidInput, threadID, messageID);
    return;
  }

  const disabledUsersCollection = db?.db("disabledUsers");
  if (!disabledUsersCollection) {
    const dbError = AuroraBetaStyler.styleOutput({
      headerText: "Solo Leveling Undisable",
      headerSymbol: "❌",
      headerStyle: "bold",
      bodyText: "Database not available. Please try again later.",
      bodyStyle: "bold",
      footerText: "",
    });
    await api.sendMessage(dbError, threadID, messageID);
    return;
  }

  const disabledUser = await disabledUsersCollection.findOne({ name: targetName });
  if (!disabledUser) {
    const notDisabled = AuroraBetaStyler.styleOutput({
      headerText: "Solo Leveling Undisable",
      headerSymbol: "⚠️",
      headerStyle: "bold",
      bodyText: `User "${targetName}" is not disabled.`,
      bodyStyle: "bold",
      footerText: "",
    });
    await api.sendMessage(notDisabled, threadID, messageID);
    return;
  }

  const huntersCollection = db?.db("hunters");
  if (!huntersCollection) {
    const dbError = AuroraBetaStyler.styleOutput({
      headerText: "Solo Leveling Undisable",
      headerSymbol: "❌",
      headerStyle: "bold",
      bodyText: "Database not available. Please try again later.",
      bodyStyle: "bold",
      footerText: "",
    });
    await api.sendMessage(dbError, threadID, messageID);
    return;
  }

  // Remove disabled flag from hunters
  await huntersCollection.updateOne(
    { userID: disabledUser.userID },
    { $unset: { disabled: "" } }
  );
  // Remove from disabledUsers
  await disabledUsersCollection.deleteOne({ userID: disabledUser.userID });

  const successMessage = AuroraBetaStyler.styleOutput({
    headerText: "Solo Leveling Undisable",
    headerSymbol: "✅",
    headerStyle: "bold",
    bodyText: `User "${targetName}" has been undisabled and can now use Solo Leveling commands.`,
    bodyStyle: "bold",
    footerText: "",
  });
  await api.sendMessage(successMessage, threadID, messageID);
  return;
}


    const invalidCommand = AuroraBetaStyler.styleOutput({
      headerText: "Solo Leveling",
      headerSymbol: "⚠️",
      headerStyle: "bold",
      bodyText: "Invalid command. Usage: /sl [register <name> | status | battle | battle X | shop | buy <item> <quantity> | use <potion> <quantity> | dungeon <tier> | train <stat> | quest | guild [create <name> | join <guild name> | leave | fight <guild name> | list | changename <new name>] | leaderboard | meditate | shadowlist | setrole <class> | changename <newname> | gate enter <class> | s2 register | s2 war | s2 status | s2 battle | s2 shop | s2 dungeon <class tier> | s2 guild [create <name> | leave | list | war] | s2 inventory]",
      bodyStyle: "bold",
      footerText: "",
    });
    await api.sendMessage(invalidCommand, threadID, messageID);
  },
};

async function getHunterData(db: any, userID: string): Promise<HunterData> {
  const huntersCollection = db.db("hunters");
  let userData = await huntersCollection.findOne({ userID });
  if (!userData) {
    userData = {
      userID,
      name: undefined,
      nameS2: undefined,
      level: 1,
      exp: 0,
      expS2: 0,
      rank: "E",
      role: undefined,
      equipment: { swords: {} },
      inventory: { potions: {}, materials: {} },
      inventoryS2: { magicCrystals: 0, holyCrystals: 0, items: {} },
      shadows: [],
      shadowsS2: [],
      stats: { strength: 10, agility: 10, mana: 10 },
      dungeonCooldown: 0,
      dungeonCooldownS2: 0,
      quests: {},
      meditateCooldown: 0,
      warCooldownS2: 0,
      lostShadows: [],
      lostShadowsS2: [],
      hasChangedName: false,
      gateCooldown: 0,
    };
    await saveHunterData(db, userID, userData);
  }
  return userData;
}

async function saveHunterData(db: any, userID: string, data: HunterData): Promise<void> {
  const huntersCollection = db.db("hunters");
  await huntersCollection.updateOne(
    { userID },
    { $set: data },
    { upsert: true }
  );
}

function applyRoleSkills(userData: HunterData): void {
  const stats = userData.stats || { strength: 0, agility: 0, mana: 0 };
  const role = userData.role?.toLowerCase();
  const rank = userData.rank || "E";
  const roleBoosts: { [key: string]: { strength: number; agility: number; mana: number } } = {
    tank: { strength: rank === "E" ? 10 : rank === "D" ? 20 : rank === "C" ? 30 : rank === "B" ? 40 : rank === "A" ? 50 : rank === "S" ? 100 : 1000, agility: 0, mana: 0 },
    mage: { strength: 0, agility: 0, mana: rank === "E" ? 10 : rank === "D" ? 20 : rank === "C" ? 30 : rank === "B" ? 40 : rank === "A" ? 50 : rank === "S" ? 100 : 1000 },
    assassin: { strength: 0, agility: rank === "E" ? 10 : rank === "D" ? 20 : rank === "C" ? 30 : rank === "B" ? 40 : rank === "A" ? 50 : rank === "S" ? 100 : 1000, mana: 0 },
    healer: { strength: 0, agility: 0, mana: rank === "E" ? 10 : rank === "D" ? 20 : rank === "C" ? 30 : rank === "B" ? 40 : rank === "A" ? 50 : rank === "S" ? 100 : 500 },
    ranger: { strength: 0, agility: rank === "E" ? 10 : rank === "D" ? 20 : rank === "C" ? 30 : rank === "B" ? 40 : rank === "A" ? 50 : rank === "S" ? 100 : 500, mana: 0 },
  };
  if (role && roleBoosts[role]) {
    stats.strength = Math.max(0, Number(stats.strength) || 0) + roleBoosts[role].strength;
    stats.agility = Math.max(0, Number(stats.agility) || 0) + roleBoosts[role].agility;
    stats.mana = Math.max(0, Number(stats.mana) || 0) + roleBoosts[role].mana;
    userData.stats = stats;
  }
}

function applyRankProgression(userData: HunterData): void {
  const exp = Math.max(0, Number(userData.expS2) || 0);
  const rankThresholds = [
    { rank: "E", exp: 0 },
    { rank: "D", exp: 1000 },
    { rank: "C", exp: 3000 },
    { rank: "B", exp: 6000 },
    { rank: "A", exp: 10000 },
    { rank: "S", exp: 20000 },
    { rank: "X", exp: 50000 },
  ];
  for (const { rank, exp: threshold } of rankThresholds.reverse()) {
    if (exp >= threshold) {
      userData.rank = rank;
      break;
    }
  }
}

export default soloLevelingCommand;