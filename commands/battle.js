const { format, UNIRedux } = require("cassidy-styler");

class AdventureManager {

  constructor(db, usersData) {

    this.db = db;

    this.usersData = usersData;

  }

  getAdventurer(userId) {

    let adventurerData = this.usersData.get(userId) || {};

    if (this.db) {

      try {

        const userDoc = this.db.db("users").findOne({ userId });

        adventurerData = userDoc?.data || {};

      } catch (error) {

        console.warn(`[AdventureManager] DB access failed for user ${userId}: ${error.message}`);

      }

    }

    if (!adventurerData.adventure) adventurerData.adventure = { inventory: {}, balance: 0 };

    return adventurerData;

  }

  updateStats(userId, coins, itemKey, quantity) {

    let adventurerData = this.getAdventurer(userId);

    adventurerData.balance = (adventurerData.balance || 0) + coins;

    if (itemKey) {

      if (!adventurerData.adventure.inventory[itemKey]) adventurerData.adventure.inventory[itemKey] = { quantity: 0 };

      adventurerData.adventure.inventory[itemKey].quantity += quantity;

    }

    this.usersData.set(userId, adventurerData);

    if (this.db) {

      try {

        this.db.db("users").updateOne(

          { userId },

          { $set: { userId, data: adventurerData } },

          { upsert: true }

        );

      } catch (error) {

        console.warn(`[AdventureManager] DB update failed for user ${userId}: ${error.message}`);

      }

    }

    return adventurerData;

  }

}

const enemies = [

  { name: "Void Wolf", emoji: "🐺", health: 50, attack: 10, critChance: 0.1 },

  { name: "Iron Golem", emoji: "🤖", health: 80, attack: 15, critChance: 0.1 },

  { name: "Shadow Dragon", emoji: "🐉", health: 120, attack: 25, critChance: 0.2 },

  { name: "Frost Titan", emoji: "❄️", health: 100, attack: 20, critChance: 0.15 },

  { name: "Lava Beast", emoji: "🔥", health: 90, attack: 18, critChance: 0.12 },

  { name: "Storm Eagle", emoji: "🦅", health: 60, attack: 12, critChance: 0.18 },

  { name: "Dark Wraith", emoji: "👻", health: 110, attack: 22, critChance: 0.14 },

  { name: "Crystal Spider", emoji: "🕷️", health: 70, attack: 14, critChance: 0.16 },

];

const bonusItems = [

  { key: "health_potion", name: "Health Potion", emoji: "🧪", description: "Restores 20 health in battles" },

  { key: "lucky_charm", name: "Lucky Charm", emoji: "🍀", description: "Increases crit chance by 5%" },

  { key: "power_gem", name: "Power Gem", emoji: "💎", description: "Boosts attack by 5" },

];

const getRandomEnemy = () => {

  const randomIndex = Math.floor(Math.random() * enemies.length);

  return { ...enemies[randomIndex] };

};

const calculatePlayerStats = (inventory) => {

  let playerHealth = 100;

  let playerAttack = 10;

  let critChance = 0.1;

  let defenseReduction = 0;

  let regenPerTurn = 0;

  let dodgeChance = 0;

  let speedBoost = 0;

  let totalDamage = playerAttack;

  for (const [itemKey, item] of Object.entries(inventory || {})) {

    const quantity = item.quantity || 0;

    switch (itemKey) {

      case "health_potion":

        playerHealth += quantity * 20;

        regenPerTurn += quantity * 5;

        break;

      case "sword":

        playerAttack += quantity * 5;

        totalDamage = playerAttack;

        break;

      case "lucky_charm":

        critChance += quantity * 0.05;

        break;

      case "shield":

        playerHealth += quantity * 15;

        defenseReduction += quantity * 5;

        break;

      case "mana_crystal":

        regenPerTurn += quantity * 3;

        break;

      case "steel_boots":

        defenseReduction += quantity * 3;

        break;

      case "fire_scroll":

        playerAttack += quantity * 10;

        totalDamage = playerAttack;

        break;

      case "invis_cloak":

        dodgeChance += quantity * 0.10;

        break;

      case "speed_amulet":

        speedBoost += quantity * 5;

        break;

      case "golden_sword":

        playerAttack += quantity * 400;

        defenseReduction += quantity * 50;

        regenPerTurn += quantity * 100;

        totalDamage = quantity * 600;

        break;

    }

  }

  const defensePercentage = Math.min(100, (defenseReduction / 50) * 100);

  critChance = Math.min(1, critChance);

  dodgeChance = Math.min(0.5, dodgeChance);

  return {

    health: playerHealth,

    attack: playerAttack,

    critChance,

    defenseReduction,

    defensePercentage,

    regenPerTurn,

    dodgeChance,

    speedBoost,

    totalDamage

  };

};

const isCriticalHit = (critChance) => Math.random() < critChance;

const isDodge = (dodgeChance) => Math.random() < dodgeChance;

module.exports = {

  name: "battle",

  description: "Fight a random enemy using #battle",

  usage: "#battle",

  async run({ api, event, db, usersData }) {

    const { threadID, messageID, senderID } = event;

    if (!usersData) {

      console.error("[Battle] usersData is undefined");

      return api.sendMessage(

        format({

          title: "Battle",

          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,

          titleFont: "double_struck",

          emojis: "⚡",

          content: `Internal error: Data cache not initialized. Contact bot admin.`,

        }),

        threadID,

        messageID

      );

    }

    const adventureManager = new AdventureManager(db, usersData);

    let adventurer = adventureManager.getAdventurer(senderID);

    if (!adventurer.adventure.name) {

      return api.sendMessage(

        format({

          title: "Battle",

          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,

          titleFont: "double_struck",

          emojis: "⚡",

          content: `You're not registered!\nUse #adventure register <name>\nExample: #adventure register Shadow_Warrior`,

        }),

        threadID,

        messageID

      );

    }

    const playerStats = calculatePlayerStats(adventurer.adventure.inventory);

    let playerHealth = playerStats.health;

    const initialPlayerHealth = playerHealth;

    let playerAttack = playerStats.attack;

    let playerCritChance = playerStats.critChance;

    const defenseReduction = playerStats.defenseReduction;

    const defensePercentage = playerStats.defensePercentage;

    const regenPerTurn = playerStats.regenPerTurn;

    const dodgeChance = playerStats.dodgeChance;

    const speedBoost = playerStats.speedBoost;

    const totalDamage = playerStats.totalDamage;

    const enemy = getRandomEnemy();

    let enemyHealth = enemy.health;

    const initialEnemyHealth = enemyHealth;

    let enemyAttack = enemy.attack;

    let enemyCritChance = enemy.critChance;

    let battleLog = `You encounter a ${enemy.emoji} ${enemy.name}!\n`;

    battleLog += `Your Stats:\n- **Health:** ${playerHealth}\n- **Damage:** ${playerAttack}\n- **Defense:** ${defensePercentage}%\n- **Regen:** ${regenPerTurn}\n- **Total Damage:** ${totalDamage}\n`;

    battleLog += `Enemy Stats:\n- **Health:** ${enemyHealth}\n- **ATK Damage:** ${enemyAttack}\n- **Defense:** 0%\n\n`;

    let turns = 0;

    while (playerHealth > 0 && enemyHealth > 0 && turns < 5) {

      turns++;

      // Player attack

      let currentPlayerAttack = playerAttack;

      if (isCriticalHit(playerCritChance)) {

        currentPlayerAttack *= 2;

        battleLog += `Critical Hit! `;

      }

      enemyHealth -= currentPlayerAttack;

      const enemyHealthPercent = Math.round((Math.max(0, enemyHealth) / initialEnemyHealth) * 100);

      battleLog += `You attack the ${enemy.name} for ${currentPlayerAttack} damage!\n`;

      battleLog += `Enemy Health: ${Math.max(0, enemyHealth)} (${enemyHealthPercent}%)\n`;

      if (enemyHealth <= 0) break;

      // Enemy attack

      let currentEnemyAttack = enemyAttack;

      if (isCriticalHit(enemyCritChance)) {

        currentEnemyAttack *= 2;

        battleLog += `Enemy Critical Hit! `;

      }

      if (isDodge(dodgeChance)) {

        battleLog += `You dodge the ${enemy.name}'s attack!\n`;

      } else {

        currentEnemyAttack = Math.max(1, currentEnemyAttack - defenseReduction);

        playerHealth -= currentEnemyAttack;

        battleLog += `${enemy.emoji} ${enemy.name} attacks you for ${currentEnemyAttack} damage!\n`;

      }

      // Regeneration

      if (regenPerTurn > 0) {

        const maxHealth = initialPlayerHealth;

        const prevHealth = playerHealth;

        playerHealth = Math.min(maxHealth, playerHealth + regenPerTurn);

        if (playerHealth > prevHealth) {

          battleLog += `You regenerate ${playerHealth - prevHealth} health!\n`;

        }

      }

      const playerHealthPercent = Math.round((Math.max(0, playerHealth) / initialPlayerHealth) * 100);

      battleLog += `Player Health: ${Math.max(0, playerHealth)} (${playerHealthPercent}%)\n\n`;

    }

    let outcomeMessage = "";

    if (turns >= 5 && playerHealth > 0 && enemyHealth > 0) {

      outcomeMessage = `**Battle paused after 5 turns!**\n`;

      outcomeMessage += `**Your Health:** ${playerHealth} (${Math.round((playerHealth / initialPlayerHealth) * 100)}%)\n`;

      outcomeMessage += `**Enemy Health:** ${enemyHealth} (${Math.round((enemyHealth / initialEnemyHealth) * 100)}%)\n`;

      outcomeMessage += `Try again to finish the fight!`;

    } else if (playerHealth <= 0) {

      outcomeMessage = `You were defeated by the ${enemy.emoji} ${enemy.name}! Better luck next time.\n`;

      outcomeMessage += `Visit the #shop to gear up!`;

      adventurer = adventureManager.updateStats(senderID, -Math.floor(enemy.health * 0.5), null, 0);

    } else {

      const coinReward = 800;

      adventurer = adventureManager.updateStats(senderID, coinReward, null, 0);

      outcomeMessage = `You defeated the ${enemy.emoji} ${enemy.name}!\n`;

      outcomeMessage += `💰 **Reward:** ${coinReward} coins\n`;

      if (Math.random() < 0.1) {

        const bonusItem = bonusItems[Math.floor(Math.random() * bonusItems.length)];

        adventurer = adventureManager.updateStats(senderID, 0, bonusItem.key, 1);

        outcomeMessage += `🎁 **Bonus Drop: **You found a ${bonusItem.emoji} ${bonusItem.name}!\n`;

        outcomeMessage += `Description: ${bonusItem.description}\n`;

      }

      outcomeMessage += `**New Balance:** ${adventurer.balance} coins`;

    }

    return api.sendMessage(

      format({

        title: "Battle",

        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,

        titleFont: "double_struck",

        emojis: "⚡",

        content: `${battleLog}\n${outcomeMessage}`,

      }),

      threadID,

      messageID

    );

  },

};