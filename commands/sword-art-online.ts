import AuroraBetaStyler from "../core/plugins/aurora-beta-styler";



interface PlayerData {
  userID: string;
  username: string;
  class: string;
  level: number;
  exp: number;
  floor: number;
  col: number;
  equipment: { weapon: string; armor: string; level: number };
  inventory: { potions: { [key: string]: number }; materials: { [key: string]: number }; equipment: { [key: string]: number } };
  skills: { name: string; level: number }[];
  guild?: string;
  duelCooldown: number;
  raidCooldown: number;
  dungeonCooldown: number;
  stats: { hp: number; attack: number; agility: number };
}

interface GuildData {
  name: string;
  members: string[];
  totalStrength: number;
  floorProgress: number;
  hasChangedName: boolean;
  isSAO: boolean;
}

const saoCommand: ShadowBot.Command = {
  config: {
    name: "sword-art-online",
    description: "Embark on a Sword Art Online adventure in Aincrad!",
    usage: "/sao register | /sao status | /sao battle | /sao duel @user | /sao dungeon <level> | /sao shop | /sao inventory | /sao guild [create <name> | join <name> | leave | list | changename <newname> | war] | /sao leaderboard",
    aliases: ["sao"],
    category: "Games 🎮"
  },
  run: async ({ api, event, args, db }) => {
    if (!db) {
      await api.sendMessage("Database not available.", event.threadID, event.messageID);
      return;
    }
    const { threadID, messageID, senderID } = event;
    const styledMessage = (header: string, body: string, symbol: string) => AuroraBetaStyler.styleOutput({
      headerText: header,
      headerSymbol: symbol,
      headerStyle: "bold",
      bodyText: body,
      bodyStyle: "bold",
      footerText: ""
    });
    const action = args[0]?.toLowerCase();
    const currentTime = Math.floor(Date.now() / 1000);
    const battleCooldown = 300;
    const duelCooldown = 300;
    const raidCooldown = 3600;
    const dungeonCooldown = 3600;
    const playersCollection = db.db("players");
    let playerData = await playersCollection.findOne({ userID: senderID }) || {
      userID: senderID,
      username: "",
      class: "",
      level: 1,
      exp: 0,
      floor: 1,
      col: 0,
      equipment: { weapon: "Basic Sword", armor: "Leather Armor", level: 1 },
      inventory: { potions: { health_potion: 2 }, materials: {}, equipment: {} },
      skills: [],
      duelCooldown: 0,
      raidCooldown: 0,
      dungeonCooldown: 0,
      stats: { hp: 100, attack: 10, agility: 10 }
    };

    if (action === "register") {
      if (playerData.username) {
        await api.sendMessage(styledMessage("SAO Register", `Already registered as ${playerData.username}.`, "🛑"), threadID, messageID);
        return;
      }
      const coolNames = [
        "Kirito", "Asuna", "Sinon", "Leafa", "Klein", "Agil", "Silica", "Lisbeth",
        "Yuuki", "Eugeo", "Alice", "Sachi", "Argo", "Heathcliff", "Yuna", "Rekka",
        "Kizmel", "Yui", "Strea", "Philia", "Rain", "Seven", "Premiere", "Lux",
        "Diavel", "Kibaou", "Thinker", "Yulier", "Sasha", "Rosalia", "Grimlock",
        "Schmitt", "Yolko", "Caynz", "Kureha", "Zeliska", "Itsuki", "Clarence",
        "Shirayuki", "Eiji", "Nautilus", "Kuradeel", "PoH", "DeathGun", "Spiegel",
        "Xaxa", "JohnnyBlack", "Luxia", "Selka", "Ronie", "Tiese", "Frenzy",
        "ShadowBlade", "Starlight", "Moonstrike", "DuskWarden", "BlazeHeart",
        "FrostViper", "StormCaller", "NightRaven", "DawnSpear", "TwilightFang",
        "CrimsonTide", "SilverWind", "ObsidianEdge", "GoldenArrow", "SapphireRose",
        "EmeraldFlame", "IronWolf", "SkyReaver", "BloodOath", "GhostDancer",
        "ThunderClaw", "MistRider", "Eclipse", "Solaris", "LunarShade", "NovaBurst",
        "AetherBlade", "Zephyr", "Ignis", "Tempest", "Vortex", "AuroraSlash",
        "Nebula", "Comet", "Meteor", "Starborn", "VoidWalker", "DreadHawk",
        "Frostbite", "Blaze", "Shadowveil", "Lightbringer", "Darkstorm", "Sunspear",
        "Moondancer", "Ironclad", "Skyforge", "Bloodreaver", "Dawnbreaker"
      ];
      const nameList = coolNames.map((name, i) => `${i + 1}. ${name}`).join("\n");
      const validClasses = ["swordsman", "mage", "archer", "tamer"];
      let sentMessageID: string;
      await new Promise(resolve => {
        api.sendMessage(styledMessage("SAO Register", `Choose a name by replying with a number (1-100):\n${nameList}\nThen specify class: <swordsman/mage/archer/tamer>`, "📋"), threadID, (err: any, info: any) => {
          sentMessageID = info?.messageID;
          resolve(info);
        }, messageID);
      });
      if (!global.Kagenou.replyListeners) global.Kagenou.replyListeners = new Map();
      global.Kagenou.replyListeners.set(sentMessageID, {
        callback: async ({ api, event }) => {
          const { threadID: replyThreadID, messageID: replyMessageID, body } = event;
          if (replyThreadID !== threadID || !body) return;
          const [number, className] = body.trim().toLowerCase().split(" ");
          const index = parseInt(number) - 1;
          if (isNaN(index) || index < 0 || index >= coolNames.length || !validClasses.includes(className)) {
            await api.sendMessage(styledMessage("SAO Register", "Reply with a valid number (1-100) and class (swordsman/mage/archer/tamer).", "⚠️"), threadID, replyMessageID);
            return;
          }
          const selectedName = coolNames[index];
          if (await playersCollection.findOne({ username: selectedName })) {
            await api.sendMessage(styledMessage("SAO Register", `${selectedName} is taken. Choose another.`, "⚠️"), threadID, replyMessageID);
            return;
          }
          playerData.username = selectedName;
          playerData.class = className;
          playerData.skills = [{ name: className === "swordsman" ? "Linear" : className === "mage" ? "Fireball" : className === "archer" ? "Quick Shot" : "Beast Command", level: 1 }];
          await playersCollection.updateOne({ userID: senderID }, { $set: playerData }, { upsert: true });
          await api.sendMessage(styledMessage("SAO Register", `Registered ${selectedName} as a ${className}! Start on Floor 1.`, "✅"), threadID, replyMessageID);
        }
      });
      return;
    }

    if (!playerData.username && action !== "register") {
      await api.sendMessage(styledMessage("SAO", "Register first with /sao register", "⚠️"), threadID, messageID);
      return;
    }

    if (action === "status") {
      const guild = playerData.guild ? playerData.guild : "None";
      await api.sendMessage(styledMessage("SAO Status", `Username: ${playerData.username}\nClass: ${playerData.class}\nLevel: ${playerData.level}\nEXP: ${playerData.exp}\nFloor: ${playerData.floor}\nCol: ${playerData.col}\nWeapon: ${playerData.equipment.weapon} (Lv ${playerData.equipment.level})\nArmor: ${playerData.equipment.armor}\nSkills: ${playerData.skills.map(s => `${s.name} (Lv ${s.level})`).join(", ") || "None"}\nGuild: ${guild}\nStats: HP ${playerData.stats.hp}, Attack ${playerData.stats.attack}, Agility ${playerData.stats.agility}`, "📊"), threadID, messageID);
      return;
    }

    if (action === "battle") {
      if (playerData.duelCooldown > currentTime) {
        const remaining = Math.ceil((playerData.duelCooldown - currentTime) / 60);
        await api.sendMessage(styledMessage("SAO Battle", `Cooldown active. Wait ${remaining} minutes.`, "⏳"), threadID, messageID);
        return;
      }
      const mobs = [
        { name: "Frenzy Boar", hp: 50, attack: 5, floor: 1 },
        { name: "Dire Wolf", hp: 100, attack: 10, floor: 2 },
        { name: "Trembling Ox", hp: 200, attack: 20, floor: 3 }
      ].filter(m => m.floor <= playerData.floor);
      const mob = mobs[Math.floor(Math.random() * mobs.length)];
      const win = Math.random() < (playerData.stats.attack / (playerData.stats.attack + mob.attack)) || playerData.level >= mob.floor + 2;
      const expGain = Math.floor(Math.random() * 100) + (mob.floor * 50);
      const colGain = Math.floor(Math.random() * 50) + (mob.floor * 25);
      playerData.exp += expGain;
      playerData.col += colGain;
      playerData.level = Math.floor(playerData.exp / 1000) + 1;
      playerData.duelCooldown = currentTime + battleCooldown;
      if (win && playerData.floor === mob.floor) playerData.floor = Math.min(100, playerData.floor + 1);
      await playersCollection.updateOne({ userID: senderID }, { $set: playerData });
      await api.sendMessage(styledMessage("SAO Battle", win ? `Defeated ${mob.name}! Gained ${expGain} EXP, ${colGain} Col. ${playerData.floor > mob.floor ? `Advanced to Floor ${playerData.floor}!` : ""}` : `Lost to ${mob.name}. Gained ${expGain} EXP, ${colGain} Col.`, win ? "⚔️" : "💥"), threadID, messageID);
      return;
    }

    if (action === "duel") {
      if (playerData.duelCooldown > currentTime) {
        const remaining = Math.ceil((playerData.duelCooldown - currentTime) / 60);
        await api.sendMessage(styledMessage("SAO Duel", `Cooldown active. Wait ${remaining} minutes.`, "⏳"), threadID, messageID);
        return;
      }
      const opponentID = Object.keys(event.mentions)[0];
      if (!opponentID || opponentID === senderID) {
        await api.sendMessage(styledMessage("SAO Duel", "Mention one user to duel. Usage: /sao duel @user", "⚠️"), threadID, messageID);
        return;
      }
      const opponentData = await playersCollection.findOne({ userID: opponentID }) || {};
      if (!opponentData.username) {
        await api.sendMessage(styledMessage("SAO Duel", "Opponent not registered.", "❌"), threadID, messageID);
        return;
      }
      let sentMessageID: string;
      await new Promise(resolve => {
        api.sendMessage(styledMessage("SAO Duel", `${opponentData.username} challenged by ${playerData.username}! Reply 'accept' within 60 seconds.`, "⚔️"), threadID, (err: any, info: any) => {
          sentMessageID = info?.messageID;
          resolve(info);
        }, messageID);
      });
      if (!global.Kagenou.replyListeners) global.Kagenou.replyListeners = new Map();
      global.Kagenou.replyListeners.set(sentMessageID, {
        callback: async ({ api, event }) => {
          const { threadID: replyThreadID, messageID: replyMessageID, body, messageReply, senderID: replySenderID } = event;
          if (replyThreadID !== threadID || !messageReply || messageReply.messageID !== sentMessageID || replySenderID !== opponentID) return;
          if (body.toLowerCase() !== "accept") return;
          const duelResult = Math.random() < (playerData.stats.attack / (playerData.stats.attack + opponentData.stats.attack));
          const winnerData = duelResult ? playerData : opponentData;
          const loserData = duelResult ? opponentData : playerData;
          winnerData.exp += 200;
          winnerData.level = Math.floor(winnerData.exp / 1000) + 1;
          winnerData.col += 100;
          loserData.exp += 50;
          loserData.level = Math.floor(loserData.exp / 1000) + 1;
          playerData.duelCooldown = currentTime + duelCooldown;
          opponentData.duelCooldown = currentTime + duelCooldown;
          await playersCollection.updateOne({ userID: winnerData.userID }, { $set: winnerData });
          await playersCollection.updateOne({ userID: loserData.userID }, { $set: loserData });
          await api.sendMessage(styledMessage("SAO Duel", `${winnerData.username} defeated ${loserData.username}! Winner gains 200 EXP, 100 Col. Loser gains 50 EXP.`, "⚔️"), threadID, replyMessageID);
        }
      });
      return;
    }
      
 if (action === "raid") {
  const floor = parseInt(args[1]) || playerData.floor;
  if (isNaN(floor) || floor < 1 || floor > playerData.floor) {
    await api.sendMessage(styledMessage("SAO Raid", "Specify a valid floor (1 to your current floor). Usage: /sao raid <floor>", "⚠️"), threadID, messageID);
    return;
  }
  if (playerData.raidCooldown > currentTime) {
    const remaining = Math.ceil((playerData.raidCooldown - currentTime) / 60);
    await api.sendMessage(styledMessage("SAO Raid", `Cooldown active. Wait ${remaining} minutes.`, "⏳"), threadID, messageID);
    return;
  }
  const boss = { name: `Floor ${floor} Boss`, hp: floor * 200, attack: floor * 10 };
  const raidData = { leader: senderID, players: [{ id: senderID, hp: playerData.stats.hp }], boss, round: 0, active: true };
  await db.db("raids").updateOne({ threadID }, { $set: { raid: raidData } }, { upsert: true });
  let sentMessageID: string;
  await new Promise(resolve => {
    api.sendMessage(styledMessage("SAO Raid", `${boss.name} appeared! Reply 'join' to participate (max 4 players).`, "🛡️"), threadID, messageID, (err: any, info: any) => {
      sentMessageID = info?.messageID;
      resolve(info);
    });
  });
  if (!global.Kagenou.replyListeners) global.Kagenou.replyListeners = new Map();
  global.Kagenou.replyListeners.set(sentMessageID, {
    callback: async ({ api, event }) => {
      const { threadID: replyThreadID, messageID: replyMessageID, body, messageReply, senderID: replySenderID } = event;
      if (replyThreadID !== threadID || !messageReply || messageReply.messageID !== sentMessageID) return;
      const raid = (await db.db("raids").findOne({ threadID }))?.raid;
      if (!raid || !raid.active) return;
      if (body.toLowerCase() === "join" && raid.players.length < 4 && !raid.players.find(p => p.id === replySenderID)) {
        const replyPlayer = await playersCollection.findOne({ userID: replySenderID }) || { stats: { hp: 100 }, username: `Player${replySenderID}` };
        raid.players.push({ id: replySenderID, hp: replyPlayer.stats.hp });
        await db.db("raids").updateOne({ threadID }, { $set: { raid } });
        await api.sendMessage(styledMessage("SAO Raid", `${replyPlayer.username} joined the raid!`, "✅"), threadID, replyMessageID);
        return;
      }
      if (raid.players.find(p => p.id === replySenderID)) {
        const action = body.toLowerCase();
        if (["attack", "heal"].includes(action)) {
          const damage = action === "attack" ? (await playersCollection.findOne({ userID: replySenderID }))?.stats.attack || 10 : 0;
          const heal = action === "heal" ? 30 : 0;
          raid.boss.hp -= damage;
          if (action === "heal") raid.players.forEach(p => p.hp = Math.min(100, p.hp + heal));
          raid.round++;
          if (raid.boss.hp <= 0) {
            raid.active = false;
            const rewards = raid.players.map(p => ({ id: p.id, exp: floor * 200, col: floor * 100 }));
            for (const r of rewards) {
              const p = await playersCollection.findOne({ userID: r.id }) || { exp: 0, col: 0, level: 1, floor };
              p.exp += r.exp;
              p.col += r.col;
              p.level = Math.floor(p.exp / 1000) + 1;
              if (p.floor === floor) p.floor++;
              await playersCollection.updateOne({ userID: r.id }, { $set: p }, { upsert: true });
            }
            await db.db("raids").deleteOne({ threadID });
            await api.sendMessage(styledMessage("SAO Raid", `${boss.name} defeated! Rewards: ${rewards[0].exp} EXP, ${rewards[0].col} Col per player.`, "🛡️"), threadID, replyMessageID);
            return;
          }
          let newSentMessageID: string;
          await new Promise(resolve => {
            api.sendMessage(styledMessage("SAO Raid Round", `Round ${raid.round}: ${boss.name} HP: ${raid.boss.hp}\nReply with attack or heal.`, "🛡️"), threadID, replyMessageID, (err: any, info: any) => {
              newSentMessageID = info?.messageID;
              resolve(info);
            });
          });
          global.Kagenou.replyListeners.set(newSentMessageID, { callback: global.Kagenou.replyListeners.get(sentMessageID)!.callback });
          await db.db("raids").updateOne({ threadID }, { $set: { raid } });
        }
      }
    }
  });
  playerData.raidCooldown = currentTime + raidCooldown;
  await playersCollection.updateOne({ userID: senderID }, { $set: playerData });
  return;
}
    
    if (action === "dungeon") {
      const level = parseInt(args[1]) || 1;
      if (isNaN(level) || level < 1 || level > 100) {
        await api.sendMessage(styledMessage("SAO Dungeon", "Specify a valid dungeon level (1-100). Usage: /sao dungeon <level>", "⚠️"), threadID, messageID);
        return;
      }
      if (playerData.dungeonCooldown > currentTime) {
        const remaining = Math.ceil((playerData.dungeonCooldown - currentTime) / 60);
        await api.sendMessage(styledMessage("SAO Dungeon", `Cooldown active. Wait ${remaining} minutes.`, "⏳"), threadID, messageID);
        return;
      }
      const difficulty = Math.ceil(level / 10);
      const mob = { name: `Level ${level} Monster`, hp: level * 50, attack: level * 5 };
      const win = Math.random() < (playerData.stats.attack / (playerData.stats.attack + mob.attack)) || playerData.level >= level;
      const expGain = Math.floor(Math.random() * 100) + (level * 50);
      const colGain = Math.floor(Math.random() * 50) + (level * 25);
      const lootTable = [
        { item: "mana_crystal", type: "material", chance: 0.5 },
        { item: "dragon_scale", type: "material", chance: 0.3 },
        { item: "health_potion", type: "potion", chance: 0.4 },
        { item: "elucidator", type: "equipment", chance: 0.1 },
        { item: "dark_repulser", type: "equipment", chance: 0.08 }
      ];
      const loot = lootTable.filter(l => Math.random() < l.chance).map(l => ({ item: l.item, type: l.type, quantity: Math.floor(Math.random() * 3) + 1 }));
      playerData.exp += expGain;
      playerData.col += colGain;
      playerData.level = Math.floor(playerData.exp / 1000) + 1;
      playerData.dungeonCooldown = currentTime + dungeonCooldown;
      if (win && playerData.floor < Math.ceil(level / 10)) playerData.floor = Math.min(100, Math.ceil(level / 10));
      for (const l of loot) {
        if (l.type === "potion") playerData.inventory.potions[l.item] = (playerData.inventory.potions[l.item] || 0) + l.quantity;
        else if (l.type === "material") playerData.inventory.materials[l.item] = (playerData.inventory.materials[l.item] || 0) + l.quantity;
        else playerData.inventory.equipment[l.item] = (playerData.inventory.equipment[l.item] || 0) + l.quantity;
      }
      await playersCollection.updateOne({ userID: senderID }, { $set: playerData });
      const lootMessage = loot.length ? `Loot: ${loot.map(l => `${l.item.replace("_", " ")} x${l.quantity}`).join(", ")}` : "No loot dropped.";
      await api.sendMessage(styledMessage("SAO Dungeon", win ? `Cleared Level ${level} Dungeon! Gained ${expGain} EXP, ${colGain} Col. ${playerData.floor > Math.ceil(level / 10) ? `Advanced to Floor ${playerData.floor}!` : ""}\n${lootMessage}` : `Failed Level ${level} Dungeon. Gained ${expGain} EXP, ${colGain} Col.\n${lootMessage}`, win ? "🏰" : "💥"), threadID, messageID);
      return;
    }

    if (action === "inventory") {
      const potions = Object.entries(playerData.inventory.potions).map(([k, v]) => `${k.replace("_", " ")} x${v}`).join(", ") || "None";
      const materials = Object.entries(playerData.inventory.materials).map(([k, v]) => `${k.replace("_", " ")} x${v}`).join(", ") || "None";
      const equipment = Object.entries(playerData.inventory.equipment).map(([k, v]) => `${k.replace("_", " ")} x${v}`).join(", ") || "None";
      await api.sendMessage(styledMessage("SAO Inventory", `Potions: ${potions}\nMaterials: ${materials}\nEquipment: ${equipment}\nCol: ${playerData.col}`, "🎒"), threadID, messageID);
      return;
    }

    if (action === "shop") {
      const shopItems: { [key: string]: { cost: number; type: string; effect: string } } = {
        health_potion: { cost: 50, type: "potion", effect: "Restores 50 HP" },
        mana_potion: { cost: 60, type: "potion", effect: "Restores 30 MP" },
        elucidator: { cost: 500, type: "equipment", effect: "Increases attack by 20" },
        dark_repulser: { cost: 600, type: "equipment", effect: "Increases attack by 25" },
        mythril_armor: { cost: 400, type: "equipment", effect: "Increases HP by 50" },
        dragon_scale: { cost: 100, type: "material", effect: "Crafting material" }
      };
      let sentMessageID: string;
      await new Promise(resolve => {
        api.sendMessage(styledMessage("SAO Shop", Object.entries(shopItems).map(([k, v]) => `${k.replace("_", " ")}: ${v.effect} (${v.cost} Col)`).join("\n") + "\nReply with 'buy <item> <quantity>'", "🛍️"), threadID, (err: any, info: any) => {
          sentMessageID = info?.messageID;
          resolve(info);
        }, messageID);
      });
      if (!global.Kagenou.replyListeners) global.Kagenou.replyListeners = new Map();
      global.Kagenou.replyListeners.set(sentMessageID, {
        callback: async ({ api, event }) => {
          const { threadID: replyThreadID, messageID: replyMessageID, body } = event;
          if (replyThreadID !== threadID || !body.toLowerCase().startsWith("buy")) return;
          const [_, item, qty] = body.toLowerCase().split(" ");
          const quantity = parseInt(qty) || 1;
          if (!shopItems[item] || quantity <= 0) {
            await api.sendMessage(styledMessage("SAO Shop", "Invalid item or quantity. Reply with 'buy <item> <quantity>'", "⚠️"), threadID, replyMessageID);
            return;
          }
          const totalCost = shopItems[item].cost * quantity;
          if (playerData.col < totalCost) {
            await api.sendMessage(styledMessage("SAO Shop", `Need ${totalCost} Col to buy ${quantity} ${item.replace("_", " ")}.`, "❌"), threadID, replyMessageID);
            return;
          }
          playerData.col -= totalCost;
          if (shopItems[item].type === "potion") playerData.inventory.potions[item] = (playerData.inventory.potions[item] || 0) + quantity;
          else if (shopItems[item].type === "material") playerData.inventory.materials[item] = (playerData.inventory.materials[item] || 0) + quantity;
          else {
            playerData.inventory.equipment[item] = (playerData.inventory.equipment[item] || 0) + quantity;
            if (item === "elucidator") playerData.stats.attack += 20 * quantity;
            else if (item === "dark_repulser") playerData.stats.attack += 25 * quantity;
            else if (item === "mythril_armor") playerData.stats.hp += 50 * quantity;
          }
          await playersCollection.updateOne({ userID: senderID }, { $set: playerData });
          await api.sendMessage(styledMessage("SAO Shop", `Bought ${quantity} ${item.replace("_", " ")}! ${shopItems[item].effect}.`, "✅"), threadID, replyMessageID);
        }
      });
      return;
    }

    if (action === "guild") {
      const subAction = args[1]?.toLowerCase();
      const guildsCollection = db.db("guilds");
      const guilds = await guildsCollection.find({ isSAO: true }).toArray();

      if (subAction === "create") {
        const guildName = args.slice(2).join(" ") || `Guild${Math.floor(Math.random() * 1000)}`;
        if (playerData.guild) {
          await api.sendMessage(styledMessage("SAO Guild", `Already in ${playerData.guild}. Leave to create a new one.`, "🛑"), threadID, messageID);
          return;
        }
        if (guilds.some(g => g.name === guildName)) {
          await api.sendMessage(styledMessage("SAO Guild", `Guild ${guildName} exists. Join it instead!`, "⚠️"), threadID, messageID);
          return;
        }
        playerData.guild = guildName;
        await guildsCollection.insertOne({ name: guildName, members: [senderID], totalStrength: playerData.stats.attack + 50, floorProgress: playerData.floor, hasChangedName: false, isSAO: true });
        await playersCollection.updateOne({ userID: senderID }, { $set: playerData });
        await api.sendMessage(styledMessage("SAO Guild", `Created ${guildName}! +50 Guild Strength.`, "🛡️"), threadID, messageID);
        return;
      }

      if (subAction === "join") {
        const guildName = args.slice(2).join(" ");
        if (!guildName) {
          await api.sendMessage(styledMessage("SAO Guild", "Specify guild name. Usage: /sao guild join <name>", "⚠️"), threadID, messageID);
          return;
        }
        if (playerData.guild) {
          await api.sendMessage(styledMessage("SAO Guild", `Already in ${playerData.guild}. Leave to join another.`, "🛑"), threadID, messageID);
          return;
        }
        const targetGuild = guilds.find(g => g.name.toLowerCase() === guildName.toLowerCase());
        if (!targetGuild) {
          await api.sendMessage(styledMessage("SAO Guild", `Guild ${guildName} not found.`, "❌"), threadID, messageID);
          return;
        }
        playerData.guild = targetGuild.name;
        targetGuild.members.push(senderID);
        targetGuild.totalStrength += playerData.stats.attack;
        await guildsCollection.updateOne({ name: targetGuild.name, isSAO: true }, { $set: targetGuild });
        await playersCollection.updateOne({ userID: senderID }, { $set: playerData });
        await api.sendMessage(styledMessage("SAO Guild", `Joined ${targetGuild.name}! Added ${playerData.stats.attack} to guild strength.`, "✅"), threadID, messageID);
        return;
      }

      if (subAction === "leave") {
        if (!playerData.guild) {
          await api.sendMessage(styledMessage("SAO Guild", "Not in a guild.", "❌"), threadID, messageID);
          return;
        }
        const currentGuild = guilds.find(g => g.name === playerData.guild);
        if (!currentGuild) {
          playerData.guild = undefined;
          await playersCollection.updateOne({ userID: senderID }, { $set: playerData });
          await api.sendMessage(styledMessage("SAO Guild", "Your guild no longer exists.", "ℹ️"), threadID, messageID);
          return;
        }
        currentGuild.members = currentGuild.members.filter(m => m !== senderID);
        currentGuild.totalStrength -= playerData.stats.attack;
        await guildsCollection.updateOne({ name: currentGuild.name, isSAO: true }, { $set: currentGuild });
        playerData.guild = undefined;
        await playersCollection.updateOne({ userID: senderID }, { $set: playerData });
        await api.sendMessage(styledMessage("SAO Guild", `Left ${currentGuild.name}.`, "🚪"), threadID, messageID);
        return;
      }

      if (subAction === "list") {
        const guildList = guilds.length ? guilds.map(g => `- ${g.name}: ${g.totalStrength} Strength, Floor ${g.floorProgress}`).join("\n") : "No guilds created.";
        await api.sendMessage(styledMessage("SAO Guild List", guildList, "🛡️"), threadID, messageID);
        return;
      }

      if (subAction === "changename") {
        const newGuildName = args.slice(2).join(" ");
        if (!playerData.guild) {
          await api.sendMessage(styledMessage("SAO Guild", "Not in a guild.", "❌"), threadID, messageID);
          return;
        }
        if (!newGuildName) {
          await api.sendMessage(styledMessage("SAO Guild", "Specify new guild name. Usage: /sao guild changename <newname>", "⚠️"), threadID, messageID);
          return;
        }
        const currentGuild = guilds.find(g => g.name === playerData.guild);
        if (!currentGuild) {
          playerData.guild = undefined;
          await playersCollection.updateOne({ userID: senderID }, { $set: playerData });
          await api.sendMessage(styledMessage("SAO Guild", "Your guild no longer exists.", "ℹ️"), threadID, messageID);
          return;
        }
        if (currentGuild.hasChangedName) {
          await api.sendMessage(styledMessage("SAO Guild", `Guild ${currentGuild.name} has already changed its name.`, "🛑"), threadID, messageID);
          return;
        }
        if (guilds.some(g => g.name.toLowerCase() === newGuildName.toLowerCase())) {
          await api.sendMessage(styledMessage("SAO Guild", `Name ${newGuildName} is taken.`, "⚠️"), threadID, messageID);
          return;
        }
        await guildsCollection.updateOne({ name: currentGuild.name, isSAO: true }, { $set: { name: newGuildName, hasChangedName: true } });
        await playersCollection.updateMany({ guild: currentGuild.name }, { $set: { guild: newGuildName } });
        playerData.guild = newGuildName;
        await playersCollection.updateOne({ userID: senderID }, { $set: playerData });
        await api.sendMessage(styledMessage("SAO Guild", `Guild renamed from ${currentGuild.name} to ${newGuildName}.`, "✅"), threadID, messageID);
        return;
      }

      if (subAction === "war") {
        if (!playerData.guild) {
          await api.sendMessage(styledMessage("SAO Guild", "You must be in a guild to fight!", "❌"), threadID, messageID);
          return;
        }
        const currentGuild = guilds.find(g => g.name === playerData.guild);
        if (!currentGuild) {
          playerData.guild = undefined;
          await playersCollection.updateOne({ userID: senderID }, { $set: playerData });
          await api.sendMessage(styledMessage("SAO Guild", "Your guild no longer exists.", "ℹ️"), threadID, messageID);
          return;
        }
        const targetGuild = guilds.filter(g => g.name !== currentGuild.name)[Math.floor(Math.random() * (guilds.length - 1))];
        if (!targetGuild) {
          await api.sendMessage(styledMessage("SAO Guild War", "No opponent guild found!", "⚠️"), threadID, messageID);
          return;
        }
        const win = Math.random() < (currentGuild.totalStrength / (currentGuild.totalStrength + targetGuild.totalStrength));
        const expGain = win ? 1000 : 200;
        const colGain = win ? 500 : 100;
        playerData.exp += expGain;
        playerData.col += colGain;
        playerData.level = Math.floor(playerData.exp / 1000) + 1;
        await playersCollection.updateOne({ userID: senderID }, { $set: playerData });
        await api.sendMessage(styledMessage("SAO Guild War", win ? `${currentGuild.name} defeated ${targetGuild.name}! Gained ${expGain} EXP, ${colGain} Col.` : `${currentGuild.name} lost to ${targetGuild.name}. Gained ${expGain} EXP, ${colGain} Col.`, win ? "⚔️" : "💥"), threadID, messageID);
        return;
      }

      await api.sendMessage(styledMessage("SAO Guild", "Usage: /sao guild [create <name> | join <name> | leave | list | changename <newname> | war]", "⚠️"), threadID, messageID);
      return;
    }

    if (action === "leaderboard") {
      const topPlayers = await playersCollection.find().sort({ exp: -1 }).limit(10).toArray();
      const leaderboard = topPlayers.length ? topPlayers.map((p, i) => `${i + 1}. ${p.username} (Lv ${p.level}, Floor ${p.floor}, ${p.exp} EXP)`).join("\n") : "No players ranked.";
      await api.sendMessage(styledMessage("SAO Leaderboard", leaderboard, "🏆"), threadID, messageID);
      return;
    }

    await api.sendMessage(styledMessage("SAO", "Usage: /sao [register | status | battle | duel @user | raid <floor> | dungeon <level> | shop | inventory | guild [create <name> | join <name> | leave | list | changename <newname> | war] | leaderboard]", "⚠️"), threadID, messageID);
  }
};

export default saoCommand;