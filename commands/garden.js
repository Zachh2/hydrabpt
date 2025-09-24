const axios = require('axios');
const { format, UNIRedux } = require("cassidy-styler");

class GardenManager {
  constructor(db, usersData) {
    this.db = db;
    this.usersData = usersData;
  }

  async getGardener(userId) {
    let userData = this.usersData.get(userId) || {};

    if (this.db) {
      try {
        const userDoc = await this.db.db("users").findOne({ userId });
        userData = userDoc?.data || {};
      } catch (error) {
        console.warn(`[GardenManager] DB access failed for user ${userId}: ${error.message}`);
      }
    }

    if (!userData.garden) userData.garden = { balance: 0, inventory: { seeds: {}, gear: {}, eggs: {}, cosmetics: {} }, crops: [], name: null };
    return userData;
  }

  async registerGardener(userId, name) {
    let userData = this.usersData.get(userId) || {};

    if (this.db) {
      try {
        const userDoc = await this.db.db("users").findOne({ userId });
        userData = userDoc?.data || {};
      } catch (error) {
        console.warn(`[GardenManager] DB access failed for user ${userId}: ${error.message}`);
      }
    }

    if (userData.garden?.name) {
      return { success: false, error: `You're already registered as ${userData.garden.name}!` };
    }

    if (this.db) {
      try {
        const existing = await this.db.db("users").findOne({ "data.garden.name": { $regex: `^${name}$`, $options: "i" } });
        if (existing) {
          return { success: false, error: `Name ${name} is already taken! Choose another.` };
        }
      } catch (error) {
        console.warn(`[GardenManager] Failed to check name uniqueness for ${name}: ${error.message}`);
      }
    }

    userData.garden = {
      name,
      balance: 1000,
      inventory: { seeds: {}, gear: {}, eggs: {}, cosmetics: {} },
      crops: []
    };

    this.usersData.set(userId, userData);

    if (this.db) {
      try {
        await this.db.db("users").updateOne(
          { userId },
          { $set: { userId: userId, data: userData } },
          { upsert: true }
        );
      } catch (error) {
        console.warn(`[GardenManager] DB update failed for user ${userId}: ${error.message}`);
      }
    }

    return { success: true, message: `Welcome, ${name}! You've started your garden with $1000.` };
  }

  async buyItem(userId, itemType, itemName, quantity) {
    let userData = await this.getGardener(userId);
    const garden = userData.garden;
    const itemMaps = {
      seeds: Object.keys(itemData.seeds).reduce((map, key) => ({ ...map, [key.toLowerCase()]: key }), {}),
      gear: Object.keys(itemData.gear).reduce((map, key) => ({ ...map, [key.toLowerCase()]: key }), {}),
      eggs: Object.keys(itemData.eggs).reduce((map, key) => ({ ...map, [key.toLowerCase()]: key }), {}),
      cosmetics: Object.keys(itemData.cosmetics).reduce((map, key) => ({ ...map, [key.toLowerCase()]: key }), {})
    };
    const canonicalName = itemMaps[itemType]?.[itemName.toLowerCase()] || '';

    if (!['seed', 'gear', 'egg', 'cosmetic'].includes(itemType)) {
      return { success: false, error: "Invalid item type! Use: seed, gear, egg, or cosmetic" };
    }

    if (!canonicalName || !itemData[`${itemType}s`][canonicalName]) {
      return { success: false, error: `Item '${itemName}' not found! Check stock with: #garden stock` };
    }

    let stockDataBuy;
    try {
      const endpoint = itemType === 'cosmetic' ? endpoints.cosmetics : itemType === 'egg' ? endpoints.eggs : endpoints.seeds;
      const response = await axios.get(endpoint);
      stockDataBuy = response.data || {};
    } catch (error) {
      return { success: false, error: "Failed to fetch stock data. Try again later." };
    }

    const stockItems = itemType === 'cosmetic' ? stockDataBuy.cosmetics || [] : itemType === 'egg' ? stockDataBuy.egg || [] : stockDataBuy[`${itemType}s`] || [];
    if (quantity > 1 && !stockItems.includes(`${canonicalName} **x${quantity}**`)) {
      return { success: false, error: `${canonicalName} x${quantity} is not in stock! Check: #garden stock` };
    }

    const totalCost = itemData[`${itemType}s`][canonicalName].price * quantity;
    if (garden.balance < totalCost) {
      return { success: false, error: `You need $${totalCost} to buy ${canonicalName} x${quantity}! You have $${garden.balance}.` };
    }

    garden.inventory[`${itemType}s`][canonicalName] = (garden.inventory[`${itemType}s`][canonicalName] || 0) + quantity;
    garden.balance -= totalCost;

    this.usersData.set(userId, userData);

    if (this.db) {
      try {
        await this.db.db("users").updateOne(
          { userId },
          { $set: { userId: userId, data: userData } },
          { upsert: true }
        );
      } catch (error) {
        console.warn(`[GardenManager] DB update failed for user ${userId}: ${error.message}`);
      }
    }

    return { success: true, message: `You bought ${canonicalName} x${quantity} (${itemType}) for $${totalCost}! New balance: $${garden.balance.toLocaleString()}` };
  }

  async plantSeed(userId, seedName) {
    let userData = await this.getGardener(userId);
    const garden = userData.garden;
    const canonicalSeedName = Object.keys(itemData.seeds).reduce((map, key) => ({ ...map, [key.toLowerCase()]: key }), {})[seedName.toLowerCase()] || '';

    if (!canonicalSeedName || !itemData.seeds[canonicalSeedName] || !garden.inventory.seeds[canonicalSeedName] || garden.inventory.seeds[canonicalSeedName] <= 0) {
      return { success: false, error: `You don't have ${seedName}! Check your inventory with: #garden inventory` };
    }

    if (garden.crops.length >= 10) {
      return { success: false, error: "Your garden is full! Harvest or sell crops first with: #garden harvest" };
    }

    let weatherDataPlant;
    try {
      const response = await axios.get(endpoints.weather);
      weatherDataPlant = response.data || { currentWeather: 'Clear', mutations: [] };
    } catch (error) {
      weatherDataPlant = { currentWeather: 'Clear', mutations: [] };
    }

    let growthTime = itemData.seeds[canonicalSeedName].growthTime;
    let mutationChance = 0.1;
    if (weatherDataPlant.currentWeather.includes('Rain')) {
      growthTime *= 0.8;
      mutationChance += 0.1;
    }
    if (garden.inventory.gear['Basic Sprinkler']) {
      growthTime *= 0.9;
      mutationChance += 0.05;
    }

    garden.inventory.seeds[canonicalSeedName] -= 1;
    if (garden.inventory.seeds[canonicalSeedName] === 0) delete garden.inventory.seeds[canonicalSeedName];
    garden.crops.push({
      seedName: canonicalSeedName,
      plantedAt: Date.now(),
      growthTime: growthTime * 1000,
      regrows: itemData.seeds[canonicalSeedName].regrows
    });

    this.usersData.set(userId, userData);

    if (this.db) {
      try {
        await this.db.db("users").updateOne(
          { userId },
          { $set: { userId: userId, data: userData } },
          { upsert: true }
        );
      } catch (error) {
        console.warn(`[GardenManager] DB update failed for user ${userId}: ${error.message}`);
      }
    }

    let message = `You planted a ${canonicalSeedName}! Ready to harvest in ${Math.ceil(growthTime)} seconds.`;
    if (weatherDataPlant.currentWeather.includes('Rain')) message += '\nRain is speeding up growth!';
    if (garden.inventory.gear['Basic Sprinkler']) message += '\nSprinkler is boosting growth!';
    return { success: true, message };
  }

  async harvestCrops(userId) {
    let userData = await this.getGardener(userId);
    const garden = userData.garden;

    if (garden.crops.length === 0) {
      return { success: false, error: "You have no crops growing! Plant seeds with: #garden plant <seed>" };
    }

    let weatherDataHarvest;
    try {
      const response = await axios.get(endpoints.weather);
      weatherDataHarvest = response.data || { currentWeather: 'Clear', mutations: [] };
    } catch (error) {
      weatherDataHarvest = { currentWeather: 'Clear', mutations: [] };
    }

    let totalYield = 0;
    const harvestedCrops = [];
    const remainingCrops = [];
    const now = Date.now();

    for (const crop of garden.crops) {
      const seedName = crop.seedName;
      const isReady = now >= crop.plantedAt + crop.growthTime;
      if (isReady) {
        let yieldValue = itemData.seeds[seedName].baseYield;
        const mutationChance = Math.random();
        let mutations = [];
        if (weatherDataHarvest.currentWeather.includes('Rain') && mutationChance < 0.5) {
          mutations.push('Wet');
          yieldValue *= 2;
        }
        if (weatherDataHarvest.currentWeather.includes('Thunderstorm') && mutationChance < 0.3) {
          mutations.push('Shocked');
          yieldValue *= 3;
        }
        if (weatherDataHarvest.currentWeather.includes('Snow') && mutationChance < 0.2) {
          mutations.push(mutationChance < 0.1 ? 'Frozen' : 'Chilled');
          yieldValue *= mutationChance < 0.1 ? 10 : 2;
        }
        if (mutationChance < 0.01) {
          mutations.push('Gold');
          yieldValue *= 20;
        }
        if (mutationChance < 0.001) {
          mutations.push('Rainbow');
          yieldValue *= 50;
        }
        if (garden.inventory.gear['Basic Sprinkler'] && mutationChance < 0.15) {
          mutations.push('Large');
          yieldValue *= 2;
        }
        totalYield += yieldValue;
        harvestedCrops.push(`${seedName} (${mutations.length > 0 ? mutations.join(', ') : 'None'})`);
        if (crop.regrows) {
          crop.plantedAt = Date.now();
          remainingCrops.push(crop);
        }
      } else {
        remainingCrops.push(crop);
      }
    }

    if (harvestedCrops.length === 0) {
      return { success: false, error: "No crops are ready yet! Check back later or use: #garden status" };
    }

    garden.balance += totalYield;
    garden.crops = remainingCrops;

    this.usersData.set(userId, userData);

    if (this.db) {
      try {
        await this.db.db("users").updateOne(
          { userId },
          { $set: { userId: userId, data: userData } },
          { upsert: true }
        );
      } catch (error) {
        console.warn(`[GardenManager] DB update failed for user ${userId}: ${error.message}`);
      }
    }

    return { success: true, message: `You harvested: ${harvestedCrops.join(', ')}\nEarned: $${totalYield.toLocaleString()}\nNew balance: $${garden.balance.toLocaleString()}` };
  }
}

const API_BASE = "https://growagardenstock.com/api";
const endpoints = {
  seeds: `${API_BASE}/stock?type=gear-seeds&ts=${Date.now()}`,
  eggs: `${API_BASE}/stock?type=egg&ts=${Date.now()}`,
  cosmetics: `${API_BASE}/special-stock?type=cosmetics&ts=${Date.now()}`,
  bloodTwilight: `${API_BASE}/special-stock?type=blood-twilight&ts=${Date.now()}`,
  weather: `${API_BASE}/stock/weather?ts=${Date.now()}`
};

const itemData = {
  seeds: {
    Carrot: { price: 50, growthTime: 60, baseYield: 100, regrows: false },
    Corn: { price: 60, growthTime: 120, baseYield: 150, regrows: false },
    Daffodil: { price: 70, growthTime: 90, baseYield: 120, regrows: false },
    Strawberry: { price: 80, growthTime: 180, baseYield: 200, regrows: true },
    Tomato: { price: 60, growthTime: 120, baseYield: 140, regrows: true },
    Blueberry: { price: 90, growthTime: 240, baseYield: 250, regrows: true }
  },
  gear: {
    "Favorite Tool": { price: 100, effect: "Increases mutation chance" },
    Trowel: { price: 50, effect: "Speeds up planting" },
    "Basic Sprinkler": { price: 20000, effect: "Increases crop size" },
    "Watering Can": { price: 150, effect: "Reduces growth time" },
    "Lightning Rod": { price: 500, effect: "Boosts thunderstorm mutations" },
    "Recall Wrench": { price: 300, effect: "Recalls pets" }
  },
  eggs: {
    "Common Egg": { price: 200, hatchTime: 300 },
    "Uncommon Egg": { price: 500, hatchTime: 600 }
  },
  cosmetics: {
    "Common Gnome Crate": { price: 100 },
    "Ring Walkway": { price: 150 },
    "Large Wood Table": { price: 200 },
    Torch: { price: 80 },
    "Shovel Grave": { price: 120 },
    "Medium Circle Tile": { price: 90 },
    "Yellow Umbrella": { price: 130 },
    "Mini TV": { price: 180 },
    "Axe Stump": { price: 110 }
  }
};

module.exports = {
  name: "garden",
  aliases: ["g"],
  description: "Manage your Grow A Garden farm, plant seeds, buy gear, eggs, cosmetics, and sell crops",
  usage: "#garden register <name>",
  async run({ api, event, args, db, usersData }) {
    const { threadID, messageID, senderID } = event;

    if (!usersData) {
      console.error("[Garden] usersData is undefined");
      return api.sendMessage(
        format({
          title: "Garden",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          emojis: "🌱",
          content: `Internal error: Data cache not initialized. Contact bot admin.`
        }),
        threadID,
        messageID
      );
    }

    const gardenManager = new GardenManager(db, usersData);

    if (args[0]?.toLowerCase() === "register") {
      if (!args[1]) {
        return api.sendMessage(
          format({
            title: "Garden",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🌱",
            content: `Please provide a name!\nUse #garden register <name>\nExample: #garden register GreenThumb`
          }),
          threadID,
          messageID
        );
      }
      const name = args.slice(1).join(" ");
      const result = await gardenManager.registerGardener(senderID, name);
      if (!result.success) {
        return api.sendMessage(
          format({
            title: "Garden",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🌱",
            content: `${result.error}`
          }),
          threadID,
          messageID
        );
      }
      return api.sendMessage(
        format({
          title: "Garden",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          emojis: "🌱",
          content: `${result.message}\nStart managing your garden with #garden <command>`
        }),
        threadID,
        messageID
      );
    }

    const gardener = await gardenManager.getGardener(senderID);

    if (!gardener.garden.name) {
      return api.sendMessage(
        format({
          title: "Garden",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          emojis: "🌱",
          content: `You're not registered!\nUse #garden register <name>\nExample: #garden register GreenThumb`
        }),
        threadID,
        messageID
      );
    }

    const subcommand = args[0]?.toLowerCase() || "";

    switch (subcommand) {
      case "stock":
        let stockData;
        try {
          const [seedGearResponse, eggResponse, cosmeticResponse, bloodTwilightResponse] = await Promise.all([
            axios.get(endpoints.seeds),
            axios.get(endpoints.eggs),
            axios.get(endpoints.cosmetics),
            axios.get(endpoints.bloodTwilight)
          ]);
          stockData = {
            seeds: seedGearResponse.data.seeds || [],
            gear: seedGearResponse.data.gear || [],
            eggs: eggResponse.data.egg || [],
            cosmetics: cosmeticResponse.data.cosmetics || [],
            bloodTwilight: bloodTwilightResponse.data || { blood: {}, twilight: {} },
            updatedAt: seedGearResponse.data.updatedAt || Date.now()
          };
        } catch (error) {
          return api.sendMessage(
            format({
              title: "Garden",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🌱",
              content: `Failed to fetch stock data. Please try again later.`
            }),
            threadID,
            messageID
          );
        }
        let message = `**Seeds** (Updated: ${new Date(stockData.updatedAt).toLocaleString()}):\n`;
        message += stockData.seeds.length > 0
          ? stockData.seeds.map(seed => {
              const seedName = seed.replace(/\*\*x\d+\*\*/, "").trim();
              const quantity = seed.match(/\*\*x(\d+)\*\*/)?.[1] || 1;
              const canonicalName = Object.keys(itemData.seeds).reduce((map, key) => ({ ...map, [key.toLowerCase()]: key }), {})[seedName.toLowerCase()] || seedName;
              const price = itemData.seeds[canonicalName]?.price || "Unknown";
              return `${canonicalName} x${quantity} ($${price} each)`;
            }).join("\n")
          : "No seeds available";
        message += `\n\n**Gear**:\n`;
        message += stockData.gear.length > 0
          ? stockData.gear.map(gear => {
              const gearName = gear.replace(/\*\*x\d+\*\*/, "").trim();
              const quantity = gear.match(/\*\*x(\d+)\*\*/)?.[1] || 1;
              const canonicalName = Object.keys(itemData.gear).reduce((map, key) => ({ ...map, [key.toLowerCase()]: key }), {})[gearName.toLowerCase()] || gearName;
              const price = itemData.gear[canonicalName]?.price || "Unknown";
              return `${canonicalName} x${quantity} ($${price} each)`;
            }).join("\n")
          : "No gear available";
        message += `\n\n**Eggs**:\n`;
        message += stockData.eggs.length > 0
          ? stockData.eggs.map(egg => {
              const eggName = egg.replace(/\*\*x\d+\*\*/, "").trim();
              const quantity = egg.match(/\*\*x(\d+)\*\*/)?.[1] || 1;
              const canonicalName = Object.keys(itemData.eggs).reduce((map, key) => ({ ...map, [key.toLowerCase()]: key }), {})[eggName.toLowerCase()] || eggName;
              const price = itemData.eggs[canonicalName]?.price || "Unknown";
              return `${canonicalName} x${quantity} ($${price} each)`;
            }).join("\n")
          : "No eggs available";
        message += `\n\n**Cosmetics**:\n`;
        message += stockData.cosmetics.length > 0
          ? stockData.cosmetics.map(cosmetic => {
              const cosmeticName = cosmetic.replace(/\*\*x\d+\*\*/, "").trim();
              const quantity = cosmetic.match(/\*\*x(\d+)\*\*/)?.[1] || 1;
              const canonicalName = Object.keys(itemData.cosmetics).reduce((map, key) => ({ ...map, [key.toLowerCase()]: key }), {})[cosmeticName.toLowerCase()] || cosmeticName;
              const price = itemData.cosmetics[canonicalName]?.price || "Unknown";
              return `${canonicalName} x${quantity} ($${price} each)`;
            }).join("\n")
          : "No cosmetics available";
        message += `\n\n**Blood/Twilight Events**:\n`;
        message += Object.keys(stockData.bloodTwilight.blood).length > 0 || Object.keys(stockData.bloodTwilight.twilight).length > 0
          ? `Blood: ${JSON.stringify(stockData.bloodTwilight.blood)}\nTwilight: ${JSON.stringify(stockData.bloodTwilight.twilight)}`
          : "No event items available";
        return api.sendMessage(
          format({
            title: "Garden",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🌱",
            content: message
          }),
          threadID,
          messageID
        );
          
         case "weather":
        let weatherData;
        try {
          const response = await axios.get(endpoints.weather);
          weatherData = response.data || {};
        } catch (error) {
          return api.sendMessage(
            format({
              title: "Garden",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🌱",
              content: "Failed to fetch weather data. Try again later."
            }),
            threadID,
            messageID
          );
        }
        return api.sendMessage(
          format({
            title: "Garden",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🌱",
            content: `Current Weather: ${weatherData.currentWeather || 'N/A'} ${weatherData.icon || ''}\n` +
                     `Description: ${weatherData.description || 'N/A'}\n` +
                     `Effect: ${weatherData.effectDescription || 'None'}\n` +
                     `Crop Bonuses: ${weatherData.cropBonuses || 'None'}\n` +
                     `Mutations: ${weatherData.mutations?.length > 0 ? weatherData.mutations.join(', ') : 'None'}\n` +
                     `Rarity: ${weatherData.rarity || 'Common'}\n` +
                     `Updated: ${new Date(weatherData.updatedAt || Date.now()).toLocaleString()}`
          }),
          threadID,
          messageID
        );

      case "buy":
        if (!args[1] || !args[2]) {
          return api.sendMessage(
            format({
              title: "Garden",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🌱",
              content: "Usage: buy <type> <item> (e.g., #garden buy seed Carrot)"
            }),
            threadID,
            messageID
          );
        }
        const itemType = args[1].toLowerCase();
        const itemName = args.slice(2).join(' ').replace(/\*\*x\d+\*\*/g, '').trim().toLowerCase();
        const quantity = parseInt(args.join(' ').match(/\*\*x(\d+)\*\*/)?.[1] || 1);
        const buyResult = await gardenManager.buyItem(senderID, itemType, itemName, quantity);
        return api.sendMessage(
          format({
            title: "Garden",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🌱",
            content: buyResult.error || buyResult.message
          }),
          threadID,
          messageID
        );

      case "plant":
        if (!args[1]) {
          return api.sendMessage(
            format({
              title: "Garden",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🌱",
              content: "Specify a seed to plant! Use: #garden plant <seed>"
            }),
            threadID,
            messageID
          );
        }
        const plantSeedName = args.slice(1).join(' ').replace(/\*\*x\d+\*\*/g, '').trim();
        const plantResult = await gardenManager.plantSeed(senderID, plantSeedName);
        return api.sendMessage(
          format({
            title: "Garden",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🌱",
            content: plantResult.error || plantResult.message
          }),
          threadID,
          messageID
        );

      case "harvest":
        const harvestResult = await gardenManager.harvestCrops(senderID);
        return api.sendMessage(
          format({
            title: "Garden",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🌱",
            content: harvestResult.error || harvestResult.message
          }),
          threadID,
          messageID
        );

      case "status":
        if (gardener.garden.crops.length === 0) {
          return api.sendMessage(
            format({
              title: "Garden",
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              titleFont: "double_struck",
              emojis: "🌱",
              content: "You have no crops growing! Plant seeds with: #garden plant <seed>"
            }),
            threadID,
            messageID
          );
        }
        const nowStatus = Date.now();
        const cropStatus = gardener.garden.crops.map(crop => {
          const timeLeft = Math.max(0, Math.ceil((crop.plantedAt + crop.growthTime - nowStatus) / 1000));
          return `${crop.seedName}: ${timeLeft > 0 ? `${timeLeft} seconds left` : 'Ready to harvest'}`;
        });
        return api.sendMessage(
          format({
            title: "Garden",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🌱",
            content: `Growing Crops:\n${cropStatus.join('\n')}\nUse: #garden harvest to collect ready crops`
          }),
          threadID,
          messageID
        );

      case "inventory":
        return api.sendMessage(
          format({
            title: "Garden",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🌱",
            content: `Player: ${gardener.garden.name}\n**Seeds**:\n${Object.entries(gardener.garden.inventory.seeds).length > 0
              ? Object.entries(gardener.garden.inventory.seeds).map(([seed, qty]) => `${seed}: ${qty}`).join('\n')
              : 'No seeds'}\n**Gear**:\n${Object.entries(gardener.garden.inventory.gear).length > 0
              ? Object.entries(gardener.garden.inventory.gear).map(([gear, qty]) => `${gear}: ${qty}`).join('\n')
              : 'No gear'}\n**Eggs**:\n${Object.entries(gardener.garden.inventory.eggs).length > 0
              ? Object.entries(gardener.garden.inventory.eggs).map(([egg, qty]) => `${egg}: ${qty}`).join('\n')
              : 'No eggs'}\n**Cosmetics**:\n${Object.entries(gardener.garden.inventory.cosmetics).length > 0
              ? Object.entries(gardener.garden.inventory.cosmetics).map(([cosmetic, qty]) => `${cosmetic}: ${qty}`).join('\n')
              : 'No cosmetics'}`
          }),
          threadID,
          messageID
        );

      case "profile":
        return api.sendMessage(
          format({
            title: "Garden",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🌱",
            content: `Name: ${gardener.garden.name}\nBalance: $${gardener.garden.balance.toLocaleString()}\nSeeds: ${Object.keys(gardener.garden.inventory.seeds).length}\nGear: ${Object.keys(gardener.garden.inventory.gear).length}\nEggs: ${Object.keys(gardener.garden.inventory.eggs).length}\nCosmetics: ${Object.keys(gardener.garden.inventory.cosmetics).length}\nGrowing Crops: ${gardener.garden.crops.length}`
          }),
          threadID,
          messageID
        );

      default:
        return api.sendMessage(
          format({
            title: "Garden",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            emojis: "🌱",
            content: `**Available commands**:\n- #garden register <name>\n- #garden stock\n- #garden weather\n- #garden buy <type> <item> (e.g., seed Carrot)\n- #garden plant <seed>\n- #garden harvest\n- #garden status\n- #garden inventory\n- #garden profile`
          }),
          threadID,
          messageID
        );
    }
  }
};
      