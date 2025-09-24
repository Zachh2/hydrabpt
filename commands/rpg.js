const { format, UNIRedux } = require("cassidy-styler");

class RPGManager {
  constructor(db, usersData) {
    this.db = db;
    this.usersData = usersData;
  }

  async getPlayer(userId) {
    let userData = this.usersData.get(userId) || {};
    if (this.db) {
      try {
        const userDoc = await this.db.db("users").findOne({ userId });
        userData = userDoc?.data || {};
      } catch (error) {
        console.warn(`[RPGManager] DB access failed for user ${userId}: ${error.message}`);
      }
    }
    if (!userData.inventory) userData.inventory = {};
    if (!userData.registered) userData.registered = false;
    if (!userData.balance) userData.balance = 0;
    if (!userData.exp) userData.exp = 0;
    return userData;
  }

  async registerPlayer(userId) {
    let userData = await this.getPlayer(userId);
    if (userData.registered) {
      return { success: false, error: `You are already registered!` };
    }
    userData = { balance: 100, exp: 0, inventory: {}, registered: true };
    this.usersData.set(userId, userData);
    if (this.db) {
      try {
        await this.db.db("users").updateOne(
          { userId },
          { $set: { userId, data: userData } },
          { upsert: true }
        );
      } catch (error) {
        console.warn(`[RPGManager] DB update failed for user ${userId}: ${error.message}`);
      }
    }
    return { success: true };
  }

  async updatePlayer(userId, updates) {
    let userData = await this.getPlayer(userId);
    userData = { ...userData, ...updates };
    this.usersData.set(userId, userData);
    if (this.db) {
      try {
        await this.db.db("users").updateOne(
          { userId },
          { $set: { userId, data: userData } },
          { upsert: true }
        );
      } catch (error) {
        console.warn(`[RPGManager] DB update failed for user ${userId}: ${error.message}`);
      }
    }
  }

  async addBalance(userId, amount) {
    let userData = await this.getPlayer(userId);
    userData.balance = (userData.balance || 0) + amount;
    await this.updatePlayer(userId, userData);
    return userData.balance;
  }

  async removeBalance(userId, amount) {
    let userData = await this.getPlayer(userId);
    if (userData.balance < amount) {
      throw new Error("Insufficient balance");
    }
    userData.balance -= amount;
    await this.updatePlayer(userId, userData);
    return userData.balance;
  }

  async transferBalance(fromUserId, toUserId, amount) {
    let fromData = await this.getPlayer(fromUserId);
    let toData = await this.getPlayer(toUserId);
    if (fromData.balance < amount) {
      throw new Error("Insufficient balance");
    }
    fromData.balance -= amount;
    toData.balance = (toData.balance || 0) + amount;
    await this.updatePlayer(fromUserId, fromData);
    await this.updatePlayer(toUserId, toData);
    return { fromBalance: fromData.balance, toBalance: toData.balance };
  }

  async getLeaderboard(limit = 5) {
    let leaderboard = [];
    if (this.db) {
      try {
        leaderboard = await this.db.db("users").find({ "data.registered": true }).toArray();
        leaderboard = leaderboard
          .map(doc => ({
            userId: doc.userId,
            balance: doc.data.balance || 0
          }))
          .sort((a, b) => b.balance - a.balance)
          .slice(0, limit);
      } catch (error) {
        console.warn(`[RPGManager] Leaderboard fetch failed: ${error.message}`);
      }
    } else {
      leaderboard = Array.from(this.usersData.entries())
        .filter(([_, data]) => data.registered)
        .map(([userId, data]) => ({ userId, balance: data.balance || 0 }))
        .sort((a, b) => b.balance - a.balance)
        .slice(0, limit);
    }
    return leaderboard;
  }
}
module.exports = {
  name: "rpg",
  description: "Manage your RPG character with #rpg <subcommand>",
  usage: "#rpg register",
  async run({ api, event, args, db, usersData }) {
    const { threadID, messageID, senderID } = event;

    if (!usersData) {
      console.error("[RPG] usersData is undefined");
      return api.sendMessage(
        format({
          title: "RPG",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          emojis: "🏹",
          content: `Internal error: Data cache not initialized. Contact bot admin.`
        }),
        threadID,
        messageID
      );
    }

    const rpgManager = new RPGManager(db, usersData);
    const subcommand = args[0]?.toLowerCase();
    const player = await rpgManager.getPlayer(senderID);

    if (subcommand !== "register" && !player.registered) {
      return api.sendMessage(
        format({
          title: "RPG",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          emojis: "🏹",
          content: `You're not registered!\nUse #rpg register`
        }),
        threadID,
        messageID
      );
    }

    switch (subcommand) {
      case "register":
        const result = await rpgManager.registerPlayer(senderID);
        if (!result.success) {
          return api.sendMessage(
            format({
              title: "RPG",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🏹",
              content: `${result.error}`
            }),
            threadID,
            messageID
          );
        }
        return api.sendMessage(
          format({
            title: "RPG",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🏹",
            content: `Registered! Start with #rpg battle or #rpg shop`
          }),
          threadID,
          messageID
        );

      case "stats":
        return api.sendMessage(
          format({
            title: "Stats",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "📊",
            content: `Level: ${Math.floor(player.exp / 100) || 1}\nExperience: ${player.exp} XP\nBalance: $${player.balance.toLocaleString()}`
          }),
          threadID,
          messageID
        );

      case "earn":
        const earnAmount = Math.floor(Math.random() * 50) + 10;
        await rpgManager.addBalance(senderID, earnAmount);
        return api.sendMessage(
          format({
            title: "Earn",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "💰",
            content: `You earned $${earnAmount.toLocaleString()}! New balance: $${((player.balance || 0) + earnAmount).toLocaleString()}`
          }),
          threadID,
          messageID
        );

      case "level":
        const level = Math.floor(player.exp / 100) || 1;
        const requiredExp = level * 100;
        return api.sendMessage(
          format({
            title: "Level",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "📈",
            content: `Level: ${level}\nExperience: ${player.exp} XP\nRequired for next level: ${requiredExp - player.exp} XP`
          }),
          threadID,
          messageID
        );

      case "battle":
        const enemies = [
          { name: "Goblin", health: 50, strength: 10, exp: Math.floor(Math.random() * 20) + 20, loot: "Health Potion" },
          { name: "Wolf", health: 70, strength: 15, exp: Math.floor(Math.random() * 30) + 30, loot: "Wolf Pelt" },
          { name: "Troll", health: 100, strength: 20, exp: Math.floor(Math.random() * 40) + 40, loot: "Troll Club" }
        ];
        const enemy = enemies[Math.floor(Math.random() * enemies.length)];
        const playerStrength = (Math.floor(player.exp / 100) || 1) * 10;
        const battleChance = Math.random() * (playerStrength / (playerStrength + enemy.strength));
        if (battleChance > 0.3) {
          player.inventory[enemy.loot] = (player.inventory[enemy.loot] || 0) + 1;
          await rpgManager.updatePlayer(senderID, {
            exp: (player.exp || 0) + enemy.exp,
            inventory: player.inventory
          });
          return api.sendMessage(
            format({
              title: "Battle",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🗡️",
              content: `You defeated a ${enemy.name}! Gained ${enemy.exp} XP and ${enemy.loot} x1. New XP: ${(player.exp || 0) + enemy.exp}`
            }),
            threadID,
            messageID
          );
        }
        return api.sendMessage(
          format({
            title: "Battle",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🛡️",
            content: `You were defeated by a ${enemy.name}! Try again later.`
          }),
          threadID,
          messageID
        );

      case "inventory":
        return api.sendMessage(
          format({
            title: "Inventory",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🎒",
            content: Object.keys(player.inventory).length > 0
              ? `Items: ${Object.entries(player.inventory).map(([item, qty]) => `${item}: ${qty}`).join(", ")}`
              : "Your inventory is empty!"
          }),
          threadID,
          messageID
        );

      case "shop":
        return api.sendMessage(
          format({
            title: "Shop",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🏪",
            content: `Available items:\n- Sword ($200)\n- Shield ($150)\n- Health Potion ($50)\nUse: #rpg buy <item>`
          }),
          threadID,
          messageID
        );

      case "buy":
        const item = args[1]?.toLowerCase();
        const items = { sword: 200, shield: 150, "health potion": 50 };
        if (!item || !items[item]) {
          return api.sendMessage(
            format({
              title: "Buy",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Invalid item! Available: ${Object.keys(items).join(", ")}`
            }),
            threadID,
            messageID
          );
        }
        if (player.balance < items[item]) {
          return api.sendMessage(
            format({
              title: "Buy",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `You need $${items[item]} to buy ${item}!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory[item] = (player.inventory[item] || 0) + 1;
        await rpgManager.removeBalance(senderID, items[item]);
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Buy",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "✅",
            content: `You bought a ${item} for $${items[item]}!`
          }),
          threadID,
          messageID
        );
         case "quest":
        const questReward = Math.floor(Math.random() * 100) + 50;
        await rpgManager.updatePlayer(senderID, {
          balance: (player.balance || 0) + questReward,
          exp: (player.exp || 0) + 20
        });
        return api.sendMessage(
          format({
            title: "Quest",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "📜",
            content: `You completed a quest! Earned $${questReward} and 20 XP.`
          }),
          threadID,
          messageID
        );

      case "train":
        const trainExp = Math.floor(Math.random() * 15) + 10;
        await rpgManager.updatePlayer(senderID, {
          exp: (player.exp || 0) + trainExp
        });
        return api.sendMessage(
          format({
            title: "Train",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "💪",
            content: `You trained and gained ${trainExp} XP! New XP: ${(player.exp || 0) + trainExp}`
          }),
          threadID,
          messageID
        );

      case "heal":
        if (!player.inventory["health potion"]) {
          return api.sendMessage(
            format({
              title: "Heal",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `You need a Health Potion to heal!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["health potion"] -= 1;
        if (player.inventory["health potion"] === 0) {
          delete player.inventory["health potion"];
        }
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Heal",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🩺",
            content: `You used a Health Potion to heal!`
          }),
          threadID,
          messageID
        );

      case "upgrade":
        const upgradeCost = (Math.floor(player.exp / 100) || 1) * 50;
        if (player.balance < upgradeCost) {
          return api.sendMessage(
            format({
              title: "Upgrade",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `You need $${upgradeCost} to upgrade!`
            }),
            threadID,
            messageID
          );
        }
        await rpgManager.removeBalance(senderID, upgradeCost);
        await rpgManager.updatePlayer(senderID, {
          exp: (player.exp || 0) + 50
        });
        return api.sendMessage(
          format({
            title: "Upgrade",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "📈",
            content: `You upgraded your skills for $${upgradeCost}! Gained 50 XP.`
          }),
          threadID,
          messageID
        );

      case "gift":
        const giftAmount = parseInt(args[1]);
        const targetID = args[2];
        if (!giftAmount || giftAmount <= 0 || !targetID) {
          return api.sendMessage(
            format({
              title: "Gift",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Usage: #rpg gift <amount> <userID>`
            }),
            threadID,
            messageID
          );
        }
        if (player.balance < giftAmount) {
          return api.sendMessage(
            format({
              title: "Gift",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `You need $${giftAmount} to gift!`
            }),
            threadID,
            messageID
          );
        }
        await rpgManager.transferBalance(senderID, targetID, giftAmount);
        return api.sendMessage(
          format({
            title: "Gift",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🎁",
            content: `You gifted $${giftAmount} to user ${targetID}!`
          }),
          threadID,
          messageID
        );

      case "leaderboard":
        const leaderboard = await rpgManager.getLeaderboard(5);
        return api.sendMessage(
          format({
            title: "Leaderboard",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🏆",
            content: leaderboard.length > 0
              ? leaderboard.map((entry, i) => `${i + 1}. User ${entry.userId}: $${entry.balance.toLocaleString()}`).join("\n")
              : "No players on the leaderboard!"
          }),
          threadID,
          messageID
        );

      case "reset":
        await rpgManager.updatePlayer(senderID, { balance: 0, exp: 0, inventory: {}, registered: true });
        return api.sendMessage(
          format({
            title: "Reset",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🔄",
            content: `Your stats have been reset!`
          }),
          threadID,
          messageID
        );

      case "trade":
        const tradeItem = args[1]?.toLowerCase();
        const tradeQuantity = parseInt(args[2]) || 1;
        const tradeTargetID = args[3];
        if (!tradeItem || !player.inventory[tradeItem] || tradeQuantity <= 0 || !tradeTargetID) {
          return api.sendMessage(
            format({
              title: "Trade",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Usage: #rpg trade <item> <quantity> <userID>`
            }),
            threadID,
            messageID
          );
        }
        if (player.inventory[tradeItem] < tradeQuantity) {
          return api.sendMessage(
            format({
              title: "Trade",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `You don't have enough ${tradeItem}!`
            }),
            threadID,
            messageID
          );
        }
        const targetData = await rpgManager.getPlayer(tradeTargetID);
        if (!targetData.registered) {
          return api.sendMessage(
            format({
              title: "Trade",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Target user is not registered!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory[tradeItem] -= tradeQuantity;
        if (player.inventory[tradeItem] === 0) {
          delete player.inventory[tradeItem];
        }
        targetData.inventory[tradeItem] = (targetData.inventory[tradeItem] || 0) + tradeQuantity;
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        await rpgManager.updatePlayer(tradeTargetID, { inventory: targetData.inventory });
        return api.sendMessage(
          format({
            title: "Trade",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🤝",
            content: `You traded ${tradeItem} x${tradeQuantity} to user ${tradeTargetID}!`
          }),
          threadID,
          messageID
        );

      // New Subcommands (50 additional)
      case "explore":
        const exploreExp = Math.floor(Math.random() * 30) + 10;
        const lootChance = Math.random();
        let exploreContent = `You explored and gained ${exploreExp} XP! New XP: ${(player.exp || 0) + exploreExp}`;
        if (lootChance > 0.4) {
          const loot = ["Gold Coin", "Gem"][Math.floor(Math.random() * 2)];
          player.inventory[loot] = (player.inventory[loot] || 0) + 1;
          exploreContent += `\nFound ${loot} x1!`;
          await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + exploreExp, inventory: player.inventory });
        }
        return api.sendMessage(
          format({
            title: "Explore",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🗺️",
            content: exploreContent
          }),
          threadID,
          messageID
        );

      case "fish":
        const fishExp = 15;
        const fishLootChance = Math.random();
        let fishContent = `You fished and gained ${fishExp} XP! New XP: ${(player.exp || 0) + fishExp}`;
        if (fishLootChance > 0.6) {
          player.inventory["Fish"] = (player.inventory["Fish"] || 0) + 1;
          fishContent += `\nCaught a Fish x1!`;
          await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + fishExp, inventory: player.inventory });
        }
        return api.sendMessage(
          format({
            title: "Fish",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🎣",
            content: fishContent
          }),
          threadID,
          messageID
        );

      case "mine":
        const mineExp = 20;
        const mineLootChance = Math.random();
        let mineContent = `You mined and gained ${mineExp} XP! New XP: ${(player.exp || 0) + mineExp}`;
        if (mineLootChance > 0.5) {
          player.inventory["Ore"] = (player.inventory["Ore"] || 0) + 1;
          mineContent += `\nMined an Ore x1!`;
          await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + mineExp, inventory: player.inventory });
        }
        return api.sendMessage(
          format({
            title: "Mine",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "⛏️",
            content: mineContent
          }),
          threadID,
          messageID
        );
       case "craft":
        const recipes = { "Iron Sword": { materials: { "Ore": 2 }, cost: 50 } };
        const craftItem = args[1]?.toLowerCase();
        if (!craftItem || !recipes[craftItem]) {
          return api.sendMessage(
            format({
              title: "Craft",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🔨",
              content: `Available: ${Object.keys(recipes).join(", ")}\nUse: #rpg craft <item>`
            }),
            threadID,
            messageID
          );
        }
        if (player.inventory[recipes[craftItem].materials["Ore"]] < 2 || player.balance < recipes[craftItem].cost) {
          return api.sendMessage(
            format({
              title: "Craft",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 2 Ore and $${recipes[craftItem].cost}!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Ore"] -= 2;
        player.inventory[craftItem] = (player.inventory[craftItem] || 0) + 1;
        await rpgManager.removeBalance(senderID, recipes[craftItem].cost);
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Craft",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "✅",
            content: `Crafted ${craftItem}!`
          }),
          threadID,
          messageID
        );

      case "sell":
        const sellItem = args[1]?.toLowerCase();
        if (!sellItem || !player.inventory[sellItem]) {
          return api.sendMessage(
            format({
              title: "Sell",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "💸",
              content: `Use: #rpg sell <item>`
            }),
            threadID,
            messageID
          );
        }
        const sellValue = Math.floor({ "sword": 150, "shield": 100, "health potion": 30, "fish": 10, "ore": 20, "gold coin": 50, "gem": 75 }[sellItem] * 0.8) || 5;
        player.inventory[sellItem] -= 1;
        if (player.inventory[sellItem] === 0) delete player.inventory[sellItem];
        await rpgManager.addBalance(senderID, sellValue);
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Sell",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "💰",
            content: `Sold ${sellItem} for $${sellValue}!`
          }),
          threadID,
          messageID
        );

      case "pet":
        const petType = args[1]?.toLowerCase();
        const petCosts = { dog: 50, cat: 30, dragon: 200 };
        if (!petType || !petCosts[petType]) {
          return api.sendMessage(
            format({
              title: "Pet",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🐾",
              content: `Available: ${Object.keys(petCosts).join(", ")}\nUse: #rpg pet <type>`
            }),
            threadID,
            messageID
          );
        }
        if (player.balance < petCosts[petType]) {
          return api.sendMessage(
            format({
              title: "Pet",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need $${petCosts[petType]}!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory[`${petType} Pet`] = (player.inventory[`${petType} Pet`] || 0) + 1;
        await rpgManager.removeBalance(senderID, petCosts[petType]);
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Pet",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "✅",
            content: `Bought a ${petType} Pet for $${petCosts[petType]}!`
          }),
          threadID,
          messageID
        );

      case "feed":
        if (!player.inventory["Fish"] && !player.inventory["Ore"]) {
          return api.sendMessage(
            format({
              title: "Feed",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need Fish or Ore to feed your pet!`
            }),
            threadID,
            messageID
          );
        }
        const feedItem = player.inventory["Fish"] ? "Fish" : "Ore";
        player.inventory[feedItem] -= 1;
        if (player.inventory[feedItem] === 0) delete player.inventory[feedItem];
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Feed",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🍖",
            content: `Fed your pet with ${feedItem}!`
          }),
          threadID,
          messageID
        );

      case "guild":
        if (!args[1]) {
          return api.sendMessage(
            format({
              title: "Guild",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🏰",
              content: `Join a guild: #rpg guild <name>`
            }),
            threadID,
            messageID
          );
        }
        player.guild = args.slice(1).join(" ");
        await rpgManager.updatePlayer(senderID, { guild: player.guild });
        return api.sendMessage(
          format({
            title: "Guild",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "✅",
            content: `Joined guild: ${player.guild}`
          }),
          threadID,
          messageID
        );

      case "arena":
        const opponentID = args[1];
        if (!opponentID) {
          return api.sendMessage(
            format({
              title: "Arena",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "⚔️",
              content: `Challenge: #rpg arena <userID>`
            }),
            threadID,
            messageID
          );
        }
        const opponent = await rpgManager.getPlayer(opponentID);
        if (!opponent.registered) {
          return api.sendMessage(
            format({
              title: "Arena",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Opponent not registered!`
            }),
            threadID,
            messageID
          );
        }
        const arenaChance = Math.random();
        if (arenaChance > 0.5) {
          const arenaReward = Math.floor(Math.random() * 100) + 50;
          await rpgManager.addBalance(senderID, arenaReward);
          return api.sendMessage(
            format({
              title: "Arena",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🏆",
              content: `Won against ${opponentID}! Earned $${arenaReward}.`
            }),
            threadID,
            messageID
          );
        }
        return api.sendMessage(
          format({
            title: "Arena",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "💥",
            content: `Lost to ${opponentID}!`
          }),
          threadID,
          messageID
        );

      case "tournament":
        const tourReward = Math.floor(Math.random() * 200) + 100;
        await rpgManager.addBalance(senderID, tourReward);
        return api.sendMessage(
          format({
            title: "Tournament",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🏟️",
            content: `Won tournament! Earned $${tourReward}.`
          }),
          threadID,
          messageID
        );

      case "rest":
        const restExp = Math.floor(Math.random() * 10) + 5;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + restExp });
        return api.sendMessage(
          format({
            title: "Rest",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "😴",
            content: `Rested and gained ${restExp} XP!`
          }),
          threadID,
          messageID
        );

      case "journey":
        const journeyExp = Math.floor(Math.random() * 50) + 25;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + journeyExp });
        return api.sendMessage(
          format({
            title: "Journey",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🌍",
            content: `Completed journey! Gained ${journeyExp} XP.`
          }),
          threadID,
          messageID
        );

      case "hunt":
        const huntExp = Math.floor(Math.random() * 40) + 15;
        const huntLootChance = Math.random();
        let huntContent = `You hunted and gained ${huntExp} XP! New XP: ${(player.exp || 0) + huntExp}`;
        if (huntLootChance > 0.5) {
          player.inventory["Deer Hide"] = (player.inventory["Deer Hide"] || 0) + 1;
          huntContent += `\nFound Deer Hide x1!`;
          await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + huntExp, inventory: player.inventory });
        }
        return api.sendMessage(
          format({
            title: "Hunt",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🏹",
            content: huntContent
          }),
          threadID,
          messageID
        );

      case "forge":
        if (player.inventory["Ore"] < 3) {
          return api.sendMessage(
            format({
              title: "Forge",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 3 Ore to forge!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Ore"] -= 3;
        player.inventory["Steel Blade"] = (player.inventory["Steel Blade"] || 0) + 1;
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Forge",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🔥",
            content: `Forged a Steel Blade!`
          }),
          threadID,
          messageID
        );

      case "alchemy":
        if (player.inventory["Gem"] < 1 || player.inventory["Health Potion"] < 2) {
          return api.sendMessage(
            format({
              title: "Alchemy",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 1 Gem and 2 Health Potions!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Gem"] -= 1;
        player.inventory["Health Potion"] -= 2;
        player.inventory["Elixir"] = (player.inventory["Elixir"] || 0) + 1;
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Alchemy",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "⚗️",
            content: `Crafted an Elixir!`
          }),
          threadID,
          messageID
        );

      case "tame":
        if (player.inventory["Deer Hide"] < 1) {
          return api.sendMessage(
            format({
              title: "Tame",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 1 Deer Hide to tame!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Deer Hide"] -= 1;
        player.inventory["Tamed Deer"] = (player.inventory["Tamed Deer"] || 0) + 1;
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Tame",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🐴",
            content: `Tamed a Deer!`
          }),
          threadID,
          messageID
        );
case "ride":
        if (!player.inventory["Tamed Deer"] && !player.inventory["dragon Pet"]) {
          return api.sendMessage(
            format({
              title: "Ride",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need a Tamed Deer or Dragon Pet!`
            }),
            threadID,
            messageID
          );
        }
        const rideExp = 30;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + rideExp });
        return api.sendMessage(
          format({
            title: "Ride",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🏇",
            content: `Rode your mount! Gained ${rideExp} XP.`
          }),
          threadID,
          messageID
        );

      case "camp":
        const campExp = 15;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + campExp });
        return api.sendMessage(
          format({
            title: "Camp",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "⛺",
            content: `Camped and gained ${campExp} XP!`
          }),
          threadID,
          messageID
        );

      case "scout":
        const scoutExp = Math.floor(Math.random() * 25) + 10;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + scoutExp });
        return api.sendMessage(
          format({
            title: "Scout",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🔭",
            content: `Scouted the area! Gained ${scoutExp} XP.`
          }),
          threadID,
          messageID
        );

      case "gather":
        const gatherExp = 10;
        player.inventory["Herb"] = (player.inventory["Herb"] || 0) + 1;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + gatherExp, inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Gather",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🌿",
            content: `Gathered Herbs! Gained ${gatherExp} XP.`
          }),
          threadID,
          messageID
        );

      case "build":
        if (player.inventory["Wood"] < 5) {
          return api.sendMessage(
            format({
              title: "Build",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 5 Wood to build!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Wood"] -= 5;
        player.inventory["House"] = (player.inventory["House"] || 0) + 1;
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Build",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🏠",
            content: `Built a House!`
          }),
          threadID,
          messageID
        );

      case "tradeup":
        if (player.inventory["Gold Coin"] < 10) {
          return api.sendMessage(
            format({
              title: "TradeUp",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 10 Gold Coins!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Gold Coin"] -= 10;
        player.inventory["Ruby"] = (player.inventory["Ruby"] || 0) + 1;
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "TradeUp",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "💎",
            content: `Traded for a Ruby!`
          }),
          threadID,
          messageID
        );

      case "enchant":
        if (player.inventory["Elixir"] < 1 || player.inventory["Sword"] < 1) {
          return api.sendMessage(
            format({
              title: "Enchant",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 1 Elixir and 1 Sword!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Elixir"] -= 1;
        player.inventory["Sword"] -= 1;
        player.inventory["Enchanted Sword"] = (player.inventory["Enchanted Sword"] || 0) + 1;
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Enchant",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "✨",
            content: `Enchanted a Sword!`
          }),
          threadID,
          messageID
        );

      case "questlist":
        return api.sendMessage(
          format({
            title: "QuestList",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "📜",
            content: `Quests: Hunt, Gather, Explore\nUse: #rpg quest`
          }),
          threadID,
          messageID
        );

      case "profile":
        return api.sendMessage(
          format({
            title: "Profile",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "👤",
            content: `Level: ${Math.floor(player.exp / 100) || 1}\nBalance: $${player.balance.toLocaleString()}\nGuild: ${player.guild || "None"}`
          }),
          threadID,
          messageID
        );

      case "event":
        const eventReward = Math.floor(Math.random() * 150) + 50;
        await rpgManager.addBalance(senderID, eventReward);
        return api.sendMessage(
          format({
            title: "Event",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🎉",
            content: `Won event! Earned $${eventReward}.`
          }),
          threadID,
          messageID
        );

      case "duel":
        const duelOpponent = args[1];
        if (!duelOpponent) {
          return api.sendMessage(
            format({
              title: "Duel",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "⚔️",
              content: `Duel: #rpg duel <userID>`
            }),
            threadID,
            messageID
          );
        }
        const duelChance = Math.random();
        if (duelChance > 0.5) {
          const duelReward = 75;
          await rpgManager.addBalance(senderID, duelReward);
          return api.sendMessage(
            format({
              title: "Duel",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🏆",
              content: `Won duel vs ${duelOpponent}! Earned $${duelReward}.`
            }),
            threadID,
            messageID
          );
        }
        return api.sendMessage(
          format({
            title: "Duel",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "💥",
            content: `Lost duel vs ${duelOpponent}!`
          }),
          threadID,
          messageID
        );

      case "bounty":
        const bountyReward = Math.floor(Math.random() * 300) + 100;
        await rpgManager.addBalance(senderID, bountyReward);
        return api.sendMessage(
          format({
            title: "Bounty",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🔫",
            content: `Completed bounty! Earned $${bountyReward}.`
          }),
          threadID,
          messageID
        );

      case "steal":
        const stealTarget = args[1];
        if (!stealTarget) {
          return api.sendMessage(
            format({
              title: "Steal",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Steal: #rpg steal <userID>`
            }),
            threadID,
            messageID
          );
        }
        const stealChance = Math.random();
        if (stealChance > 0.7) {
          const stealAmount = Math.floor(Math.random() * 50) + 10;
          await rpgManager.transferBalance(stealTarget, senderID, stealAmount);
          return api.sendMessage(
            format({
              title: "Steal",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "💰",
              content: `Stole $${stealAmount} from ${stealTarget}!`
            }),
            threadID,
            messageID
          );
        }
        return api.sendMessage(
          format({
            title: "Steal",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🚨",
            content: `Failed to steal from ${stealTarget}!`
          }),
          threadID,
          messageID
        );

      case "raid":
        const raidReward = Math.floor(Math.random() * 400) + 200;
        await rpgManager.addBalance(senderID, raidReward);
        return api.sendMessage(
          format({
            title: "Raid",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "💣",
            content: `Raided successfully! Earned $${raidReward}.`
          }),
          threadID,
          messageID
        );

      case "defend":
        const defendExp = 25;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + defendExp });
        return api.sendMessage(
          format({
            title: "Defend",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🛡️",
            content: `Defended your base! Gained ${defendExp} XP.`
          }),
          threadID,
          messageID
        );

      case "repair":
        if (player.inventory["Ore"] < 2) {
          return api.sendMessage(
            format({
              title: "Repair",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 2 Ore to repair!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Ore"] -= 2;
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Repair",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🔧",
            content: `Repaired your gear!`
          }),
          threadID,
          messageID
        );

      case "upgradeweapon":
        if (player.inventory["Steel Blade"] < 1) {
          return api.sendMessage(
            format({
              title: "UpgradeWeapon",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 1 Steel Blade!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Steel Blade"] -= 1;
        player.inventory["Upgraded Blade"] = (player.inventory["Upgraded Blade"] || 0) + 1;
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "UpgradeWeapon",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "⚔️",
            content: `Upgraded to Upgraded Blade!`
          }),
          threadID,
          messageID
        );

      case "summon":
        if (player.inventory["Ruby"] < 1) {
          return api.sendMessage(
            format({
              title: "Summon",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 1 Ruby to summon!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Ruby"] -= 1;
        player.inventory["Summoned Spirit"] = (player.inventory["Summoned Spirit"] || 0) + 1;
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Summon",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "👻",
            content: `Summoned a Spirit!`
          }),
          threadID,
          messageID
        );
case "harvest":
        const harvestExp = 12;
        player.inventory["Wheat"] = (player.inventory["Wheat"] || 0) + 1;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + harvestExp, inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Harvest",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🌾",
            content: `Harvested Wheat! Gained ${harvestExp} XP.`
          }),
          threadID,
          messageID
        );

      case "cook":
        if (player.inventory["Wheat"] < 2 || player.inventory["Fish"] < 1) {
          return api.sendMessage(
            format({
              title: "Cook",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 2 Wheat and 1 Fish!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Wheat"] -= 2;
        player.inventory["Fish"] -= 1;
        player.inventory["Cooked Meal"] = (player.inventory["Cooked Meal"] || 0) + 1;
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Cook",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🍲",
            content: `Cooked a Meal!`
          }),
          threadID,
          messageID
        );

      case "tradeall":
        const tradeAllTarget = args[1];
        if (!tradeAllTarget) {
          return api.sendMessage(
            format({
              title: "TradeAll",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Trade all: #rpg tradeall <userID>`
            }),
            threadID,
            messageID
          );
        }
        const targetAllData = await rpgManager.getPlayer(tradeAllTarget);
        if (!targetAllData.registered) {
          return api.sendMessage(
            format({
              title: "TradeAll",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Target not registered!`
            }),
            threadID,
            messageID
          );
        }
        for (let item in player.inventory) {
          targetAllData.inventory[item] = (targetAllData.inventory[item] || 0) + player.inventory[item];
          delete player.inventory[item];
        }
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        await rpgManager.updatePlayer(tradeAllTarget, { inventory: targetAllData.inventory });
        return api.sendMessage(
          format({
            title: "TradeAll",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🤝",
            content: `Traded all items to ${tradeAllTarget}!`
          }),
          threadID,
          messageID
        );

      case "auction":
        if (Object.keys(player.inventory).length === 0) {
          return api.sendMessage(
            format({
              title: "Auction",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `No items to auction!`
            }),
            threadID,
            messageID
          );
        }
        const auctionItem = Object.keys(player.inventory)[0];
        const auctionValue = Math.floor({ "sword": 150, "shield": 100, "health potion": 30, "fish": 10, "ore": 20, "gold coin": 50, "gem": 75 }[auctionItem] * 1.2) || 5;
        delete player.inventory[auctionItem];
        await rpgManager.addBalance(senderID, auctionValue);
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Auction",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "📢",
            content: `Auctioned ${auctionItem} for $${auctionValue}!`
          }),
          threadID,
          messageID
        );

      case "meditate":
        const meditateExp = Math.floor(Math.random() * 20) + 10;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + meditateExp });
        return api.sendMessage(
          format({
            title: "Meditate",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🧘",
            content: `Meditated! Gained ${meditateExp} XP.`
          }),
          threadID,
          messageID
        );

      case "bargain":
        const bargainTarget = args[1];
        if (!bargainTarget) {
          return api.sendMessage(
            format({
              title: "Bargain",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Bargain: #rpg bargain <userID>`
            }),
            threadID,
            messageID
          );
        }
        const bargainChance = Math.random();
        if (bargainChance > 0.6) {
          const bargainAmount = Math.floor(Math.random() * 30) + 10;
          await rpgManager.transferBalance(bargainTarget, senderID, bargainAmount);
          return api.sendMessage(
            format({
              title: "Bargain",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "💬",
              content: `Bargained $${bargainAmount} from ${bargainTarget}!`
            }),
            threadID,
            messageID
          );
        }
        return api.sendMessage(
          format({
            title: "Bargain",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "❌",
            content: `Failed to bargain with ${bargainTarget}!`
          }),
          threadID,
          messageID
        );

      case "sacrifice":
        if (player.inventory["Gem"] < 3) {
          return api.sendMessage(
            format({
              title: "Sacrifice",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 3 Gems to sacrifice!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Gem"] -= 3;
        const sacrificeExp = 100;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + sacrificeExp, inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Sacrifice",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🙏",
            content: `Sacrificed 3 Gems! Gained ${sacrificeExp} XP.`
          }),
          threadID,
          messageID
        );

      case "exploredeep":
        const deepExp = Math.floor(Math.random() * 50) + 25;
        const deepLootChance = Math.random();
        let deepContent = `Explored deep! Gained ${deepExp} XP. New XP: ${(player.exp || 0) + deepExp}`;
        if (deepLootChance > 0.3) {
          player.inventory["Rare Crystal"] = (player.inventory["Rare Crystal"] || 0) + 1;
          deepContent += `\nFound Rare Crystal x1!`;
          await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + deepExp, inventory: player.inventory });
        }
        return api.sendMessage(
          format({
            title: "ExploreDeep",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🌌",
            content: deepContent
          }),
          threadID,
          messageID
        );

      case "trainhard":
        const hardExp = Math.floor(Math.random() * 30) + 20;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + hardExp });
        return api.sendMessage(
          format({
            title: "TrainHard",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "💪",
            content: `Trained hard! Gained ${hardExp} XP.`
          }),
          threadID,
          messageID
        );

      case "questelite":
        const eliteReward = Math.floor(Math.random() * 250) + 100;
        await rpgManager.addBalance(senderID, eliteReward);
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + 50 });
        return api.sendMessage(
          format({
            title: "QuestElite",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🌟",
            content: `Completed elite quest! Earned $${eliteReward} and 50 XP.`
          }),
          threadID,
          messageID
        );

      case "guildwar":
        const warReward = Math.floor(Math.random() * 300) + 150;
        await rpgManager.addBalance(senderID, warReward);
        return api.sendMessage(
          format({
            title: "GuildWar",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "⚔️",
            content: `Won guild war! Earned $${warReward}.`
          }),
          threadID,
          messageID
        );

      case "collect":
        const collectExp = 15;
        player.inventory["Coin"] = (player.inventory["Coin"] || 0) + 1;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + collectExp, inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Collect",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "💰",
            content: `Collected a Coin! Gained ${collectExp} XP.`
          }),
          threadID,
          messageID
        );

      case "barter":
        const barterItem = args[1]?.toLowerCase();
        if (!barterItem || !player.inventory[barterItem]) {
          return api.sendMessage(
            format({
              title: "Barter",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Barter: #rpg barter <item>`
            }),
            threadID,
            messageID
          );
        }
        const barterValue = Math.floor({ "sword": 150, "shield": 100, "health potion": 30 }[barterItem] * 0.9) || 5;
        player.inventory[barterItem] -= 1;
        if (player.inventory[barterItem] === 0) delete player.inventory[barterItem];
        await rpgManager.addBalance(senderID, barterValue);
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Barter",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🤝",
            content: `Bartered ${barterItem} for $${barterValue}!`
          }),
          threadID,
          messageID
        );

      case "questdaily":
        const dailyReward = Math.floor(Math.random() * 100) + 40;
        await rpgManager.addBalance(senderID, dailyReward);
        return api.sendMessage(
          format({
            title: "QuestDaily",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "📅",
            content: `Completed daily quest! Earned $${dailyReward}.`
          }),
          threadID,
          messageID
        );

      case "adventure":
        const adventureExp = Math.floor(Math.random() * 60) + 30;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + adventureExp });
        return api.sendMessage(
          format({
            title: "Adventure",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🌄",
            content: `Went on adventure! Gained ${adventureExp} XP.`
          }),
          threadID,
          messageID
        );

      case "treasure":
        const treasureChance = Math.random();
        let treasureContent = `Searched for treasure!`;
        if (treasureChance > 0.4) {
          const treasureReward = Math.floor(Math.random() * 200) + 100;
          await rpgManager.addBalance(senderID, treasureReward);
          treasureContent += `\nFound $${treasureReward}!`;
        }
        return api.sendMessage(
          format({
            title: "Treasure",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🏴‍☠️",
            content: treasureContent
          }),
          threadID,
          messageID
        );

      case "bless":
        if (player.inventory["Elixir"] < 1) {
          return api.sendMessage(
            format({
              title: "Bless",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 1 Elixir to bless!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Elixir"] -= 1;
        const blessExp = 40;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + blessExp, inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Bless",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🙌",
            content: `Blessed yourself! Gained ${blessExp} XP.`
          }),
          threadID,
          messageID
        );
      case "challenge":
        const challengeReward = Math.floor(Math.random() * 150) + 75;
        await rpgManager.addBalance(senderID, challengeReward);
        return api.sendMessage(
          format({
            title: "Challenge",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🎯",
            content: `Completed challenge! Earned $${challengeReward}.`
          }),
          threadID,
          messageID
        );

      case "guard":
        const guardExp = 20;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + guardExp });
        return api.sendMessage(
          format({
            title: "Guard",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🛡️",
            content: `Guarded the village! Gained ${guardExp} XP.`
          }),
          threadID,
          messageID
        );

      case "explorecave":
        const caveExp = Math.floor(Math.random() * 40) + 20;
        const caveLootChance = Math.random();
        let caveContent = `Explored cave! Gained ${caveExp} XP. New XP: ${(player.exp || 0) + caveExp}`;
        if (caveLootChance > 0.35) {
          player.inventory["Cave Gem"] = (player.inventory["Cave Gem"] || 0) + 1;
          caveContent += `\nFound Cave Gem x1!`;
          await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + caveExp, inventory: player.inventory });
        }
        return api.sendMessage(
          format({
            title: "ExploreCave",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🕳️",
            content: caveContent
          }),
          threadID,
          messageID
        );

        case "farm":
        const farmExp = 10;
        player.inventory["Wheat"] = (player.inventory["Wheat"] || 0) + 1;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + farmExp, inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Farm",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🌾",
            content: `Farmed Wheat! Gained ${farmExp} XP.`
          }),
          threadID,
          messageID
        );

      case "brew":
        if (player.inventory["Herb"] < 2) {
          return api.sendMessage(
            format({
              title: "Brew",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 2 Herbs!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Herb"] -= 2;
        player.inventory["Potion"] = (player.inventory["Potion"] || 0) + 1;
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Brew",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🍵",
            content: `Brewed a Potion!`
          }),
          threadID,
          messageID
        );

      case "excavate":
        const excavateExp = Math.floor(Math.random() * 35) + 15;
        const excavateLootChance = Math.random();
        let excavateContent = `Excavated! Gained ${excavateExp} XP.`;
        if (excavateLootChance > 0.4) {
          player.inventory["Ancient Artifact"] = (player.inventory["Ancient Artifact"] || 0) + 1;
          excavateContent += `\nFound Ancient Artifact x1!`;
          await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + excavateExp, inventory: player.inventory });
        }
        return api.sendMessage(
          format({
            title: "Excavate",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "⛏️",
            content: excavateContent
          }),
          threadID,
          messageID
        );

      case "dance":
        const danceExp = 10;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + danceExp });
        return api.sendMessage(
          format({
            title: "Dance",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "💃",
            content: `Danced for fun! Gained ${danceExp} XP.`
          }),
          threadID,
          messageID
        );

      case "pray":
        const prayExp = Math.floor(Math.random() * 25) + 10;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + prayExp });
        return api.sendMessage(
          format({
            title: "Pray",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🙏",
            content: `Prayed for blessings! Gained ${prayExp} XP.`
          }),
          threadID,
          messageID
        );

      case "forgearmor":
        if (player.inventory["Ore"] < 4) {
          return api.sendMessage(
            format({
              title: "ForgeArmor",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 4 Ore!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Ore"] -= 4;
        player.inventory["Steel Armor"] = (player.inventory["Steel Armor"] || 0) + 1;
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "ForgeArmor",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🛡️",
            content: `Forged Steel Armor!`
          }),
          threadID,
          messageID
        );

      case "rescue":
        const rescueExp = 30;
        const rescueChance = Math.random();
        if (rescueChance > 0.5) {
          await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + rescueExp });
          return api.sendMessage(
            format({
              title: "Rescue",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚑",
              content: `Rescued someone! Gained ${rescueExp} XP.`
            }),
            threadID,
            messageID
          );
        }
        return api.sendMessage(
          format({
            title: "Rescue",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "💥",
            content: `Failed to rescue!`
          }),
          threadID,
          messageID
        );

      case "navigate":
        const navigateExp = Math.floor(Math.random() * 40) + 20;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + navigateExp });
        return api.sendMessage(
          format({
            title: "Navigate",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🧭",
            content: `Navigated successfully! Gained ${navigateExp} XP.`
          }),
          threadID,
          messageID
        );

      case "barricade":
        if (player.inventory["Wood"] < 3) {
          return api.sendMessage(
            format({
              title: "Barricade",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 3 Wood!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Wood"] -= 3;
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Barricade",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🛡️",
            content: `Built a barricade!`
          }),
          threadID,
          messageID
        );

      case "study":
        const studyExp = Math.floor(Math.random() * 20) + 15;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + studyExp });
        return api.sendMessage(
          format({
            title: "Study",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "📚",
            content: `Studied ancient texts! Gained ${studyExp} XP.`
          }),
          threadID,
          messageID
        );

      case "bribe":
        const bribeTarget = args[1];
        if (!bribeTarget) {
          return api.sendMessage(
            format({
              title: "Bribe",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Bribe: #rpg bribe <userID>`
            }),
            threadID,
            messageID
          );
        }
        if (player.balance < 100) {
          return api.sendMessage(
            format({
              title: "Bribe",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 100 coins!`
            }),
            threadID,
            messageID
          );
        }
        await rpgManager.removeBalance(senderID, 100);
        const bribeChance = Math.random();
        if (bribeChance > 0.6) {
          await rpgManager.addBalance(senderID, 50);
          return api.sendMessage(
            format({
              title: "Bribe",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "💰",
              content: `Bribed ${bribeTarget} successfully! Gained 50 coins.`
            }),
            threadID,
            messageID
          );
        }
        return api.sendMessage(
          format({
            title: "Bribe",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "❌",
            content: `Bribe failed with ${bribeTarget}!`
          }),
          threadID,
          messageID
        );

      case "disguise":
        if (player.inventory["Deer Hide"] < 1) {
          return api.sendMessage(
            format({
              title: "Disguise",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 1 Deer Hide!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Deer Hide"] -= 1;
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Disguise",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🎭",
            content: `Disguised successfully!`
          }),
          threadID,
          messageID
        );

      case "sneak":
        const sneakChance = Math.random();
        if (sneakChance > 0.7) {
          const sneakExp = 25;
          await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + sneakExp });
          return api.sendMessage(
            format({
              title: "Sneak",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🥷",
              content: `Sneaked past guards! Gained ${sneakExp} XP.`
            }),
            threadID,
            messageID
          );
        }
        return api.sendMessage(
          format({
            title: "Sneak",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "💥",
            content: `Caught sneaking!`
          }),
          threadID,
          messageID
        );

      case "ambush":
        const ambushTarget = args[1];
        if (!ambushTarget) {
          return api.sendMessage(
            format({
              title: "Ambush",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Ambush: #rpg ambush <userID>`
            }),
            threadID,
            messageID
          );
        }
        const ambushChance = Math.random();
        if (ambushChance > 0.6) {
          const ambushReward = Math.floor(Math.random() * 80) + 20;
          await rpgManager.addBalance(senderID, ambushReward);
          return api.sendMessage(
            format({
              title: "Ambush",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🏹",
              content: `Ambushed ${ambushTarget}! Gained $${ambushReward}.`
            }),
            threadID,
            messageID
          );
        }
        return api.sendMessage(
          format({
            title: "Ambush",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "💥",
            content: `Ambush on ${ambushTarget} failed!`
          }),
          threadID,
          messageID
        );

      case "escape":
        const escapeChance = Math.random();
        if (escapeChance > 0.5) {
          const escapeExp = 20;
          await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + escapeExp });
          return api.sendMessage(
            format({
              title: "Escape",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🏃",
              content: `Escaped danger! Gained ${escapeExp} XP.`
            }),
            threadID,
            messageID
          );
        }
        return api.sendMessage(
          format({
            title: "Escape",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "💥",
            content: `Failed to escape!`
          }),
          threadID,
          messageID
        );

      case "patrol":
        const patrolExp = 15;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + patrolExp });
        return api.sendMessage(
          format({
            title: "Patrol",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "👮",
            content: `Patrolled the area! Gained ${patrolExp} XP.`
          }),
          threadID,
          messageID
        );

      case "investigate":
        const investigateExp = Math.floor(Math.random() * 30) + 15;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + investigateExp });
        return api.sendMessage(
          format({
            title: "Investigate",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🔎",
            content: `Investigated clues! Gained ${investigateExp} XP.`
          }),
          threadID,
          messageID
        );

      case "bountyhunt":
        const bountyHuntReward = Math.floor(Math.random() * 350) + 150;
        await rpgManager.addBalance(senderID, bountyHuntReward);
        return api.sendMessage(
          format({
            title: "BountyHunt",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🔫",
            content: `Completed bounty hunt! Earned $${bountyHuntReward}.`
          }),
          threadID,
          messageID
        );

      case "rally":
        const rallyExp = 25;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + rallyExp });
        return api.sendMessage(
          format({
            title: "Rally",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "📣",
            content: `Rallied allies! Gained ${rallyExp} XP.`
          }),
          threadID,
          messageID
        );

        case "forage":
        const forageExp = 12;
        player.inventory["Berry"] = (player.inventory["Berry"] || 0) + 1;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + forageExp, inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Forage",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🍇",
            content: `Foraged Berries! Gained ${forageExp} XP.`
          }),
          threadID,
          messageID
        );

      case "carve":
        if (player.inventory["Wood"] < 1) {
          return api.sendMessage(
            format({
              title: "Carve",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 1 Wood!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Wood"] -= 1;
        player.inventory["Wooden Statue"] = (player.inventory["Wooden Statue"] || 0) + 1;
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Carve",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🗿",
            content: `Carved a Wooden Statue!`
          }),
          threadID,
          messageID
        );

      case "scavenge":
        const scavengeExp = Math.floor(Math.random() * 25) + 10;
        const scavengeLootChance = Math.random();
        let scavengeContent = `Scavenged! Gained ${scavengeExp} XP.`;
        if (scavengeLootChance > 0.45) {
          player.inventory["Scrap Metal"] = (player.inventory["Scrap Metal"] || 0) + 1;
          scavengeContent += `\nFound Scrap Metal x1!`;
          await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + scavengeExp, inventory: player.inventory });
        }
        return api.sendMessage(
          format({
            title: "Scavenge",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🔍",
            content: scavengeContent
          }),
          threadID,
          messageID
        );

      case "chant":
        const chantExp = Math.floor(Math.random() * 20) + 15;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + chantExp });
        return api.sendMessage(
          format({
            title: "Chant",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🎶",
            content: `Chanted a spell! Gained ${chantExp} XP.`
          }),
          threadID,
          messageID
        );

      case "plunder":
        const plunderReward = Math.floor(Math.random() * 250) + 100;
        await rpgManager.addBalance(senderID, plunderReward);
        return api.sendMessage(
          format({
            title: "Plunder",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🏴‍☠️",
            content: `Plundered a village! Earned $${plunderReward}.`
          }),
          threadID,
          messageID
        );

      case "construct":
        if (player.inventory["Wood"] < 5 || player.inventory["Ore"] < 2) {
          return api.sendMessage(
            format({
              title: "Construct",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 5 Wood and 2 Ore!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Wood"] -= 5;
        player.inventory["Ore"] -= 2;
        player.inventory["Fortress"] = (player.inventory["Fortress"] || 0) + 1;
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Construct",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🏯",
            content: `Constructed a Fortress!`
          }),
          threadID,
          messageID
        );

      case "bountytrack":
        const trackReward = Math.floor(Math.random() * 200) + 80;
        await rpgManager.addBalance(senderID, trackReward);
        return api.sendMessage(
          format({
            title: "BountyTrack",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🔍",
            content: `Tracked a bounty! Earned $${trackReward}.`
          }),
          threadID,
          messageID
        );

      case "celebrate":
        const celebrateExp = 15;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + celebrateExp });
        return api.sendMessage(
          format({
            title: "Celebrate",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🎉",
            content: `Celebrated a victory! Gained ${celebrateExp} XP.`
          }),
          threadID,
          messageID
        );

      case "disarm":
        const disarmChance = Math.random();
        if (disarmChance > 0.6) {
          const disarmExp = 25;
          await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + disarmExp });
          return api.sendMessage(
            format({
              title: "Disarm",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🛡️",
              content: `Disarmed a trap! Gained ${disarmExp} XP.`
            }),
            threadID,
            messageID
          );
        }
        return api.sendMessage(
          format({
            title: "Disarm",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "💥",
            content: `Failed to disarm!`
          }),
          threadID,
          messageID
        );

      case "exploreforest":
        const forestExp = Math.floor(Math.random() * 30) + 15;
        const forestLootChance = Math.random();
        let forestContent = `Explored forest! Gained ${forestExp} XP.`;
        if (forestLootChance > 0.4) {
          player.inventory["Forest Leaf"] = (player.inventory["Forest Leaf"] || 0) + 1;
          forestContent += `\nFound Forest Leaf x1!`;
          await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + forestExp, inventory: player.inventory });
        }
        return api.sendMessage(
          format({
            title: "ExploreForest",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🌳",
            content: forestContent
          }),
          threadID,
          messageID
        );

      case "haggle":
        const haggleTarget = args[1];
        if (!haggleTarget) {
          return api.sendMessage(
            format({
              title: "Haggle",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Haggle: #rpg haggle <userID>`
            }),
            threadID,
            messageID
          );
        }
        const haggleChance = Math.random();
        if (haggleChance > 0.65) {
          const haggleAmount = Math.floor(Math.random() * 40) + 15;
          await rpgManager.transferBalance(haggleTarget, senderID, haggleAmount);
          return api.sendMessage(
            format({
              title: "Haggle",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "💬",
              content: `Haggled $${haggleAmount} from ${haggleTarget}!`
            }),
            threadID,
            messageID
          );
        }
        return api.sendMessage(
          format({
            title: "Haggle",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "❌",
            content: `Haggle failed with ${haggleTarget}!`
          }),
          threadID,
          messageID
        );

      case "reinforce":
        if (player.inventory["Steel Armor"] < 1) {
          return api.sendMessage(
            format({
              title: "Reinforce",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 1 Steel Armor!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Steel Armor"] -= 1;
        player.inventory["Reinforced Armor"] = (player.inventory["Reinforced Armor"] || 0) + 1;
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Reinforce",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🛡️",
            content: `Reinforced your Armor!`
          }),
          threadID,
          messageID
        );

      case "scry":
        const scryExp = Math.floor(Math.random() * 30) + 20;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + scryExp });
        return api.sendMessage(
          format({
            title: "Scry",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🔮",
            content: `Scryed the future! Gained ${scryExp} XP.`
          }),
          threadID,
          messageID
        );

      case "smuggle":
        const smuggleChance = Math.random();
        if (smuggleChance > 0.7) {
          const smuggleReward = Math.floor(Math.random() * 120) + 50;
          await rpgManager.addBalance(senderID, smuggleReward);
          return api.sendMessage(
            format({
              title: "Smuggle",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚢",
              content: `Smuggled goods! Earned $${smuggleReward}.`
            }),
            threadID,
            messageID
          );
        }
        return api.sendMessage(
          format({
            title: "Smuggle",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "💥",
            content: `Smuggling failed!`
          }),
          threadID,
          messageID
        );

      case "tinker":
        if (player.inventory["Scrap Metal"] < 2) {
          return api.sendMessage(
            format({
              title: "Tinker",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 2 Scrap Metal!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Scrap Metal"] -= 2;
        player.inventory["Gadget"] = (player.inventory["Gadget"] || 0) + 1;
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Tinker",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🔧",
            content: `Tinkered a Gadget!`
          }),
          threadID,
          messageID
        );

      case "voyage":
        const voyageExp = Math.floor(Math.random() * 50) + 25;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + voyageExp });
        return api.sendMessage(
          format({
            title: "Voyage",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "⛵",
            content: `Set sail! Gained ${voyageExp} XP.`
          }),
          threadID,
          messageID
        );

      case "bountycollect":
        const bountyCollectReward = Math.floor(Math.random() * 400) + 200;
        await rpgManager.addBalance(senderID, bountyCollectReward);
        return api.sendMessage(
          format({
            title: "BountyCollect",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "💰",
            content: `Collected bounty! Earned $${bountyCollectReward}.`
          }),
          threadID,
          messageID
        );

      case "rallytroops":
        const rallyTroopsExp = 30;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + rallyTroopsExp });
        return api.sendMessage(
          format({
            title: "RallyTroops",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🏰",
            content: `Rallied troops! Gained ${rallyTroopsExp} XP.`
          }),
          threadID,
          messageID
        );

      case "decode":
        const decodeExp = Math.floor(Math.random() * 35) + 15;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + decodeExp });
        return api.sendMessage(
          format({
            title: "Decode",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🔑",
            content: `Decoded a message! Gained ${decodeExp} XP.`
          }),
          threadID,
          messageID
        );

      case "bountyescape":
        const escapeBountyChance = Math.random();
        if (escapeBountyChance > 0.6) {
          const escapeBountyExp = 40;
          await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + escapeBountyExp });
          return api.sendMessage(
            format({
              title: "BountyEscape",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🏃",
              content: `Escaped bounty hunters! Gained ${escapeBountyExp} XP.`
            }),
            threadID,
            messageID
          );
        }
        return api.sendMessage(
          format({
            title: "BountyEscape",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "💥",
            content: `Caught by bounty hunters!`
          }),
          threadID,
          messageID
        );

      case "ritual":
        if (player.inventory["Herb"] < 3) {
          return api.sendMessage(
            format({
              title: "Ritual",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 3 Herbs!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Herb"] -= 3;
        const ritualExp = 50;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + ritualExp, inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Ritual",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🕉️",
            content: `Performed a ritual! Gained ${ritualExp} XP.`
          }),
          threadID,
          messageID
        );

      case "survey":
        const surveyExp = Math.floor(Math.random() * 20) + 10;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + surveyExp });
        return api.sendMessage(
          format({
            title: "Survey",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "📏",
            content: `Surveyed the land! Gained ${surveyExp} XP.`
          }),
          threadID,
          messageID
        );

case "prospect":
        const prospectExp = Math.floor(Math.random() * 25) + 10;
        const prospectLootChance = Math.random();
        let prospectContent = `Prospected for resources! Gained ${prospectExp} XP.`;
        if (prospectLootChance > 0.45) {
          player.inventory["Raw Gem"] = (player.inventory["Raw Gem"] || 0) + 1;
          prospectContent += `\nFound Raw Gem x1!`;
          await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + prospectExp, inventory: player.inventory });
        }
        return api.sendMessage(
          format({
            title: "Prospect",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🔍",
            content: prospectContent
          }),
          threadID,
          messageID
        );

      case "weave":
        if (player.inventory["Forest Leaf"] < 2) {
          return api.sendMessage(
            format({
              title: "Weave",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 2 Forest Leaves!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Forest Leaf"] -= 2;
        player.inventory["Woven Cloak"] = (player.inventory["Woven Cloak"] || 0) + 1;
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Weave",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🧶",
            content: `Wove a Cloak!`
          }),
          threadID,
          messageID
        );

      case "scoutmountain":
        const mountainExp = Math.floor(Math.random() * 35) + 15;
        const mountainLootChance = Math.random();
        let mountainContent = `Scouted mountain! Gained ${mountainExp} XP.`;
        if (mountainLootChance > 0.4) {
          player.inventory["Mountain Rock"] = (player.inventory["Mountain Rock"] || 0) + 1;
          mountainContent += `\nFound Mountain Rock x1!`;
          await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + mountainExp, inventory: player.inventory });
        }
        return api.sendMessage(
          format({
            title: "ScoutMountain",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🏔️",
            content: mountainContent
          }),
          threadID,
          messageID
        );

      case "perform":
        const performExp = Math.floor(Math.random() * 20) + 10;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + performExp });
        return api.sendMessage(
          format({
            title: "Perform",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🎭",
            content: `Performed for the crowd! Gained ${performExp} XP.`
          }),
          threadID,
          messageID
        );

      case "plow":
        const plowExp = 15;
        player.inventory["Planted Seed"] = (player.inventory["Planted Seed"] || 0) + 1;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + plowExp, inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Plow",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🌱",
            content: `Plowed the field! Gained ${plowExp} XP.`
          }),
          threadID,
          messageID
        );

      case "refine":
        if (player.inventory["Raw Gem"] < 1) {
          return api.sendMessage(
            format({
              title: "Refine",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 1 Raw Gem!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Raw Gem"] -= 1;
        player.inventory["Polished Gem"] = (player.inventory["Polished Gem"] || 0) + 1;
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Refine",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "💎",
            content: `Refined a Polished Gem!`
          }),
          threadID,
          messageID
        );

      case "sabotage":
        const sabotageTarget = args[1];
        if (!sabotageTarget) {
          return api.sendMessage(
            format({
              title: "Sabotage",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Sabotage: #rpg sabotage <userID>`
            }),
            threadID,
            messageID
          );
        }
        const sabotageChance = Math.random();
        if (sabotageChance > 0.6) {
          const sabotageExp = 30;
          await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + sabotageExp });
          return api.sendMessage(
            format({
              title: "Sabotage",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "💣",
              content: `Sabotaged ${sabotageTarget}! Gained ${sabotageExp} XP.`
            }),
            threadID,
            messageID
          );
        }
        return api.sendMessage(
          format({
            title: "Sabotage",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "💥",
            content: `Sabotage on ${sabotageTarget} failed!`
          }),
          threadID,
          messageID
        );

      case "track":
        const trackExp = Math.floor(Math.random() * 30) + 15;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + trackExp });
        return api.sendMessage(
          format({
            title: "Track",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "👣",
            content: `Tracked a target! Gained ${trackExp} XP.`
          }),
          threadID,
          messageID
        );

      case "assemble":
        if (player.inventory["Scrap Metal"] < 3) {
          return api.sendMessage(
            format({
              title: "Assemble",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 3 Scrap Metal!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Scrap Metal"] -= 3;
        player.inventory["Mechanic Device"] = (player.inventory["Mechanic Device"] || 0) + 1;
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Assemble",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🔩",
            content: `Assembled a Mechanic Device!`
          }),
          threadID,
          messageID
        );

      case "bountyguard":
        const guardReward = Math.floor(Math.random() * 180) + 70;
        await rpgManager.addBalance(senderID, guardReward);
        return api.sendMessage(
          format({
            title: "BountyGuard",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🛡️",
            content: `Guarded a bounty! Earned $${guardReward}.`
          }),
          threadID,
          messageID
        );

      case "inspire":
        const inspireExp = 20;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + inspireExp });
        return api.sendMessage(
          format({
            title: "Inspire",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🎤",
            content: `Inspired allies! Gained ${inspireExp} XP.`
          }),
          threadID,
          messageID
        );

      case "overthrow":
        const overthrowReward = Math.floor(Math.random() * 300) + 150;
        await rpgManager.addBalance(senderID, overthrowReward);
        return api.sendMessage(
          format({
            title: "Overthrow",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "👑",
            content: `Overthrew a tyrant! Earned $${overthrowReward}.`
          }),
          threadID,
          messageID
        );

      case "camouflage":
        if (player.inventory["Forest Leaf"] < 1) {
          return api.sendMessage(
            format({
              title: "Camouflage",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 1 Forest Leaf!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Forest Leaf"] -= 1;
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Camouflage",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🌿",
            content: `Camouflaged successfully!`
          }),
          threadID,
          messageID
        );

      case "bountyraid":
        const raidBountyReward = Math.floor(Math.random() * 350) + 150;
        await rpgManager.addBalance(senderID, raidBountyReward);
        return api.sendMessage(
          format({
            title: "BountyRaid",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "💣",
            content: `Raided a bounty hideout! Earned $${raidBountyReward}.`
          }),
          threadID,
          messageID
        );

      case "recharge":
        if (player.inventory["Gadget"] < 1) {
          return api.sendMessage(
            format({
              title: "Recharge",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 1 Gadget!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Gadget"] -= 1;
        const rechargeExp = 25;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + rechargeExp, inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Recharge",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🔋",
            content: `Recharged energy! Gained ${rechargeExp} XP.`
          }),
          threadID,
          messageID
        );

      case "skirmish":
        const skirmishTarget = args[1];
        if (!skirmishTarget) {
          return api.sendMessage(
            format({
              title: "Skirmish",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Skirmish: #rpg skirmish <userID>`
            }),
            threadID,
            messageID
          );
        }
        const skirmishChance = Math.random();
        if (skirmishChance > 0.55) {
          const skirmishReward = Math.floor(Math.random() * 90) + 30;
          await rpgManager.addBalance(senderID, skirmishReward);
          return api.sendMessage(
            format({
              title: "Skirmish",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "⚔️",
              content: `Won skirmish vs ${skirmishTarget}! Earned $${skirmishReward}.`
            }),
            threadID,
            messageID
          );
        }
        return api.sendMessage(
          format({
            title: "Skirmish",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "💥",
            content: `Lost skirmish vs ${skirmishTarget}!`
          }),
          threadID,
          messageID
        );

      case "bountyhide":
        const hideChance = Math.random();
        if (hideChance > 0.65) {
          const hideExp = 35;
          await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + hideExp });
          return api.sendMessage(
            format({
              title: "BountyHide",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🌑",
              content: `Hid from bounty! Gained ${hideExp} XP.`
            }),
            threadID,
            messageID
          );
        }
        return api.sendMessage(
          format({
            title: "BountyHide",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "💥",
            content: `Failed to hide from bounty!`
          }),
          threadID,
          messageID
        );

      case "mend":
        if (player.inventory["Woven Cloak"] < 1) {
          return api.sendMessage(
            format({
              title: "Mend",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 1 Woven Cloak!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Woven Cloak"] -= 1;
        player.inventory["Mended Cloak"] = (player.inventory["Mended Cloak"] || 0) + 1;
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Mend",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🧵",
            content: `Mended a Cloak!`
          }),
          threadID,
          messageID
        );

      case "bountyseek":
        const seekReward = Math.floor(Math.random() * 220) + 90;
        await rpgManager.addBalance(senderID, seekReward);
        return api.sendMessage(
          format({
            title: "BountySeek",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🔎",
            content: `Sought a bounty! Earned $${seekReward}.`
          }),
          threadID,
          messageID
        );

      case "rallydefend":
        const rallyDefendExp = 25;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + rallyDefendExp });
        return api.sendMessage(
          format({
            title: "RallyDefend",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🏰",
            content: `Rallied to defend! Gained ${rallyDefendExp} XP.`
          }),
          threadID,
          messageID
        );

      case "illuminate":
        const illuminateExp = Math.floor(Math.random() * 30) + 15;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + illuminateExp });
        return api.sendMessage(
          format({
            title: "Illuminate",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "💡",
            content: `Illuminated the dark! Gained ${illuminateExp} XP.`
          }),
          threadID,
          messageID
        );

      case "bountytrap":
        const trapChance = Math.random();
        if (trapChance > 0.6) {
          const trapReward = Math.floor(Math.random() * 150) + 50;
          await rpgManager.addBalance(senderID, trapReward);
          return api.sendMessage(
            format({
              title: "BountyTrap",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🪤",
              content: `Trapped a bounty! Earned $${trapReward}.`
            }),
            threadID,
            messageID
          );
        }
        return api.sendMessage(
          format({
            title: "BountyTrap",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "💥",
            content: `Trap failed!`
          }),
          threadID,
          messageID
        );

        case "cultivate":
        const cultivateExp = 15;
        player.inventory["Crop"] = (player.inventory["Crop"] || 0) + 1;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + cultivateExp, inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Cultivate",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🌾",
            content: `Cultivated a Crop! Gained ${cultivateExp} XP.`
          }),
          threadID,
          messageID
        );

      case "smelt":
        if (player.inventory["Ore"] < 2) {
          return api.sendMessage(
            format({
              title: "Smelt",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 2 Ore!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Ore"] -= 2;
        player.inventory["Iron Ingot"] = (player.inventory["Iron Ingot"] || 0) + 1;
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Smelt",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🔥",
            content: `Smelted an Iron Ingot!`
          }),
          threadID,
          messageID
        );

      case "scoutdesert":
        const desertExp = Math.floor(Math.random() * 40) + 20;
        const desertLootChance = Math.random();
        let desertContent = `Scouted desert! Gained ${desertExp} XP.`;
        if (desertLootChance > 0.35) {
          player.inventory["Desert Sand"] = (player.inventory["Desert Sand"] || 0) + 1;
          desertContent += `\nFound Desert Sand x1!`;
          await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + desertExp, inventory: player.inventory });
        }
        return api.sendMessage(
          format({
            title: "ScoutDesert",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🏜️",
            content: desertContent
          }),
          threadID,
          messageID
        );

      case "juggle":
        const juggleExp = Math.floor(Math.random() * 15) + 10;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + juggleExp });
        return api.sendMessage(
          format({
            title: "Juggle",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🤹",
            content: `Juggled for the crowd! Gained ${juggleExp} XP.`
          }),
          threadID,
          messageID
        );

      case "plundersea":
        const plunderSeaReward = Math.floor(Math.random() * 300) + 150;
        await rpgManager.addBalance(senderID, plunderSeaReward);
        return api.sendMessage(
          format({
            title: "PlunderSea",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🌊",
            content: `Plundered the sea! Earned $${plunderSeaReward}.`
          }),
          threadID,
          messageID
        );

      case "fortify":
        if (player.inventory["Iron Ingot"] < 3) {
          return api.sendMessage(
            format({
              title: "Fortify",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 3 Iron Ingots!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Iron Ingot"] -= 3;
        player.inventory["Fortified Wall"] = (player.inventory["Fortified Wall"] || 0) + 1;
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Fortify",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🏯",
            content: `Fortified a Wall!`
          }),
          threadID,
          messageID
        );

      case "bountysearch":
        const searchReward = Math.floor(Math.random() * 250) + 100;
        await rpgManager.addBalance(senderID, searchReward);
        return api.sendMessage(
          format({
            title: "BountySearch",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🔎",
            content: `Searched for a bounty! Earned $${searchReward}.`
          }),
          threadID,
          messageID
        );

      case "feast":
        const feastExp = 20;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + feastExp });
        return api.sendMessage(
          format({
            title: "Feast",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🍽️",
            content: `Held a feast! Gained ${feastExp} XP.`
          }),
          threadID,
          messageID
        );

      case "evade":
        const evadeChance = Math.random();
        if (evadeChance > 0.6) {
          const evadeExp = 25;
          await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + evadeExp });
          return api.sendMessage(
            format({
              title: "Evade",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🏃",
              content: `Evaded an attack! Gained ${evadeExp} XP.`
            }),
            threadID,
            messageID
          );
        }
        return api.sendMessage(
          format({
            title: "Evade",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "💥",
            content: `Failed to evade!`
          }),
          threadID,
          messageID
        );

      case "exploreswamp":
        const swampExp = Math.floor(Math.random() * 35) + 15;
        const swampLootChance = Math.random();
        let swampContent = `Explored swamp! Gained ${swampExp} XP.`;
        if (swampLootChance > 0.4) {
          player.inventory["Swamp Mud"] = (player.inventory["Swamp Mud"] || 0) + 1;
          swampContent += `\nFound Swamp Mud x1!`;
          await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + swampExp, inventory: player.inventory });
        }
        return api.sendMessage(
          format({
            title: "ExploreSwamp",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "💦",
            content: swampContent
          }),
          threadID,
          messageID
        );

      case "negotiate":
        const negotiateTarget = args[1];
        if (!negotiateTarget) {
          return api.sendMessage(
            format({
              title: "Negotiate",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Negotiate: #rpg negotiate <userID>`
            }),
            threadID,
            messageID
          );
        }
        const negotiateChance = Math.random();
        if (negotiateChance > 0.65) {
          const negotiateAmount = Math.floor(Math.random() * 50) + 20;
          await rpgManager.transferBalance(negotiateTarget, senderID, negotiateAmount);
          return api.sendMessage(
            format({
              title: "Negotiate",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🤝",
              content: `Negotiated $${negotiateAmount} from ${negotiateTarget}!`
            }),
            threadID,
            messageID
          );
        }
        return api.sendMessage(
          format({
            title: "Negotiate",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "❌",
            content: `Negotiation failed with ${negotiateTarget}!`
          }),
          threadID,
          messageID
        );

      case "upgradearmor":
        if (player.inventory["Reinforced Armor"] < 1) {
          return api.sendMessage(
            format({
              title: "UpgradeArmor",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 1 Reinforced Armor!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Reinforced Armor"] -= 1;
        player.inventory["Elite Armor"] = (player.inventory["Elite Armor"] || 0) + 1;
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "UpgradeArmor",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🛡️",
            content: `Upgraded to Elite Armor!`
          }),
          threadID,
          messageID
        );

      case "divine":
        const divineExp = Math.floor(Math.random() * 40) + 20;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + divineExp });
        return api.sendMessage(
          format({
            title: "Divine",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "✨",
            content: `Divined the future! Gained ${divineExp} XP.`
          }),
          threadID,
          messageID
        );

      case "smugglecargo":
        const smuggleCargoChance = Math.random();
        if (smuggleCargoChance > 0.7) {
          const smuggleCargoReward = Math.floor(Math.random() * 150) + 60;
          await rpgManager.addBalance(senderID, smuggleCargoReward);
          return api.sendMessage(
            format({
              title: "SmuggleCargo",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚢",
              content: `Smuggled cargo! Earned $${smuggleCargoReward}.`
            }),
            threadID,
            messageID
          );
        }
        return api.sendMessage(
          format({
            title: "SmuggleCargo",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "💥",
            content: `Smuggling cargo failed!`
          }),
          threadID,
          messageID
        );

      case "upgradegear":
        if (player.inventory["Mechanic Device"] < 1) {
          return api.sendMessage(
            format({
              title: "UpgradeGear",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 1 Mechanic Device!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Mechanic Device"] -= 1;
        player.inventory["Enhanced Gear"] = (player.inventory["Enhanced Gear"] || 0) + 1;
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "UpgradeGear",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "⚙️",
            content: `Upgraded to Enhanced Gear!`
          }),
          threadID,
          messageID
        );

      case "navigateocean":
        const oceanExp = Math.floor(Math.random() * 50) + 25;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + oceanExp });
        return api.sendMessage(
          format({
            title: "NavigateOcean",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🌊",
            content: `Navigated the ocean! Gained ${oceanExp} XP.`
          }),
          threadID,
          messageID
        );

      case "bountyintercept":
        const interceptReward = Math.floor(Math.random() * 280) + 120;
        await rpgManager.addBalance(senderID, interceptReward);
        return api.sendMessage(
          format({
            title: "BountyIntercept",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🚔",
            content: `Intercepted a bounty! Earned $${interceptReward}.`
          }),
          threadID,
          messageID
        );

      case "motivate":
        const motivateExp = 20;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + motivateExp });
        return api.sendMessage(
          format({
            title: "Motivate",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "📣",
            content: `Motivated the team! Gained ${motivateExp} XP.`
          }),
          threadID,
          messageID
        );

      case "overrun":
        const overrunReward = Math.floor(Math.random() * 320) + 160;
        await rpgManager.addBalance(senderID, overrunReward);
        return api.sendMessage(
          format({
            title: "Overrun",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🏃",
            content: `Overran the enemy! Earned $${overrunReward}.`
          }),
          threadID,
          messageID
        );

      case "cloak":
        if (player.inventory["Swamp Mud"] < 1) {
          return api.sendMessage(
            format({
              title: "Cloak",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 1 Swamp Mud!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Swamp Mud"] -= 1;
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Cloak",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🌫️",
            content: `Cloaked in shadows!`
          }),
          threadID,
          messageID
        );

      case "bountyambush":
        const ambushBountyReward = Math.floor(Math.random() * 300) + 130;
        await rpgManager.addBalance(senderID, ambushBountyReward);
        return api.sendMessage(
          format({
            title: "BountyAmbush",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🏹",
            content: `Ambushed a bounty! Earned $${ambushBountyReward}.`
          }),
          threadID,
          messageID
        );

      case "restore":
        if (player.inventory["Potion"] < 1) {
          return api.sendMessage(
            format({
              title: "Restore",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 1 Potion!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Potion"] -= 1;
        const restoreExp = 30;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + restoreExp, inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Restore",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🩹",
            content: `Restored energy! Gained ${restoreExp} XP.`
          }),
          threadID,
          messageID
        );

      case "skirmishraid":
        const skirmishRaidTarget = args[1];
        if (!skirmishRaidTarget) {
          return api.sendMessage(
            format({
              title: "SkirmishRaid",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `SkirmishRaid: #rpg skirmishraid <userID>`
            }),
            threadID,
            messageID
          );
        }
        const skirmishRaidChance = Math.random();
        if (skirmishRaidChance > 0.55) {
          const skirmishRaidReward = Math.floor(Math.random() * 110) + 40;
          await rpgManager.addBalance(senderID, skirmishRaidReward);
          return api.sendMessage(
            format({
              title: "SkirmishRaid",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "⚔️",
              content: `Won skirmish raid vs ${skirmishRaidTarget}! Earned $${skirmishRaidReward}.`
            }),
            threadID,
            messageID
          );
        }
        return api.sendMessage(
          format({
            title: "SkirmishRaid",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "💥",
            content: `Lost skirmish raid vs ${skirmishRaidTarget}!`
          }),
          threadID,
          messageID
        );

      case "bountyevade":
        const evadeBountyChance = Math.random();
        if (evadeBountyChance > 0.65) {
          const evadeBountyExp = 35;
          await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + evadeBountyExp });
          return api.sendMessage(
            format({
              title: "BountyEvade",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🏃",
              content: `Evaded a bounty! Gained ${evadeBountyExp} XP.`
            }),
            threadID,
            messageID
          );
        }
        return api.sendMessage(
          format({
            title: "BountyEvade",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "💥",
            content: `Failed to evade bounty!`
          }),
          threadID,
          messageID
        );

      case "tailor":
        if (player.inventory["Swamp Mud"] < 1 || player.inventory["Forest Leaf"] < 1) {
          return api.sendMessage(
            format({
              title: "Tailor",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🚫",
              content: `Need 1 Swamp Mud and 1 Forest Leaf!`
            }),
            threadID,
            messageID
          );
        }
        player.inventory["Swamp Mud"] -= 1;
        player.inventory["Forest Leaf"] -= 1;
        player.inventory["Camouflage Cloak"] = (player.inventory["Camouflage Cloak"] || 0) + 1;
        await rpgManager.updatePlayer(senderID, { inventory: player.inventory });
        return api.sendMessage(
          format({
            title: "Tailor",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "👗",
            content: `Tailored a Camouflage Cloak!`
          }),
          threadID,
          messageID
        );

      case "bountytrackdown":
        const trackdownReward = Math.floor(Math.random() * 270) + 110;
        await rpgManager.addBalance(senderID, trackdownReward);
        return api.sendMessage(
          format({
            title: "BountyTrackdown",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🔍",
            content: `Tracked down a bounty! Earned $${trackdownReward}.`
          }),
          threadID,
          messageID
        );

      case "rallyattack":
        const rallyAttackExp = 30;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + rallyAttackExp });
        return api.sendMessage(
          format({
            title: "RallyAttack",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🏹",
            content: `Rallied an attack! Gained ${rallyAttackExp} XP.`
          }),
          threadID,
          messageID
        );

      case "enlighten":
        const enlightenExp = Math.floor(Math.random() * 35) + 15;
        await rpgManager.updatePlayer(senderID, { exp: (player.exp || 0) + enlightenExp });
        return api.sendMessage(
          format({
            title: "Enlighten",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "💡",
            content: `Enlightened your mind! Gained ${enlightenExp} XP.`
          }),
          threadID,
          messageID
        );

      case "bountycapture":
        const captureChance = Math.random();
        if (captureChance > 0.6) {
          const captureReward = Math.floor(Math.random() * 200) + 80;
          await rpgManager.addBalance(senderID, captureReward);
          return api.sendMessage(
            format({
              title: "BountyCapture",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🔗",
              content: `Captured a bounty! Earned $${captureReward}.`
            }),
            threadID,
            messageID
          );
        }
        return api.sendMessage(
          format({
            title: "BountyCapture",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "💥",
            content: `Failed to capture bounty!`
          }),
          threadID,
          messageID
        );
      
  default:
  const allSubcommands = [
    "register", "stats", "earn", "level", "battle", "inventory", "shop", "buy", "quest", "train", "heal", "upgrade",
    "gift", "leaderboard", "reset", "trade", "explore", "fish", "mine", "craft", "sell", "pet", "feed", "guild",
    "arena", "tournament", "rest", "journey", "hunt", "forge", "alchemy", "tame", "ride", "camp", "scout", "gather",
    "build", "tradeup", "enchant", "questlist", "profile", "event", "duel", "bounty", "steal", "raid", "defend",
    "repair", "upgradeweapon", "summon", "harvest", "cook", "tradeall", "auction", "meditate", "bargain", "sacrifice",
    "exploredeep", "trainhard", "questelite", "guildwar", "collect", "barter", "questdaily", "adventure", "treasure",
    "bless", "challenge", "guard", "explorecave", "farm", "brew", "excavate", "dance", "pray", "forgearmor", "rescue",
    "navigate", "barricade", "study", "bribe", "disguise", "sneak", "ambush", "escape", "patrol", "investigate",
    "bountyhunt", "rally", "forage", "carve", "scavenge", "chant", "plunder", "construct", "bountytrack", "celebrate",
    "disarm", "exploreforest", "haggle", "reinforce", "scry", "smuggle", "tinker", "voyage", "bountycollect",
    "rallytroops", "decode", "bountyescape", "ritual", "survey", "prospect", "weave", "scoutmountain", "perform",
    "plow", "refine", "sabotage", "track", "assemble", "bountyguard", "inspire", "overthrow", "camouflage",
    "bountyraid", "recharge", "skirmish", "bountyhide", "mend", "bountyseek", "rallydefend", "illuminate", "bountytarp",
    "cultivate", "smelt", "scoutdesert", "juggle", "plundersea", "fortify", "bountysearch", "feast", "evade",
    "exploreswamp", "negotiate", "upgradearmor", "divine", "smugglecargo", "upgradegear", "navigateocean",
    "bountyintercept", "motivate", "overrun", "cloak", "bountyambush", "restore", "skirmishraid", "bountyevade",
    "tailor", "bountytrackdown", "rallyattack", "enlighten", "bountycapture"
  ];

  const totalSubcommands = allSubcommands.length;
  const commandList = allSubcommands.map(cmd => `**rpg** ${cmd}${cmd === "buy" || cmd === "craft" || cmd === "sell" || cmd === "gift" || cmd === "trade" || cmd === "bargain" || cmd === "barter" || cmd === "duel" || cmd === "arena" || cmd === "steal" || cmd === "raid" || cmd === "haggle" || cmd === "ambush" || cmd === "sabotage" || cmd === "skirmish" || cmd === "skirmishraid" ? " <args>" : ""}`).join("\n- ");

  return api.sendMessage(
    format({
      title: "RPG",
      titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
      titleFont: "double_struck",
      emojis: "🏹",
      content: `**Total Subcommands**: ${totalSubcommands}\n\n**Available commands**:\n- ${commandList}`
    }),
    threadID,
    messageID
  );
   }  
 }
};
