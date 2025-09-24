const path = require("path");
const fs = require("fs-extra");
const AuroraBetaStyler = require(path.join(__dirname, "..", "core", "plugins", "aurora-beta-styler"));
class GrowAGardenManager {
  constructor(db, usersData) {
    this.db = db;
    this.usersData = usersData;
  }
  async getGardener(userId) {
    let userData = this.usersData.get(userId) || {};
    if (this.db) {
      try {
        const userDoc = await this.db.db("gag_users").findOne({ userId });
        userData = userDoc?.data || {};
      } catch (error) {
        console.warn(`[GrowAGardenManager] DB access failed for user ${userId}: ${error.message}`);
      }
    }
    if (!userData.garden) {
      userData.garden = {
        sheckles: 100,
        seeds: {},
        crops: {},
        gardenPlots: [],
        pets: [],
        gear: [],
        eventActive: null,
        level: 1,
        xp: 0,
        quests: {},
        materials: { honey: 0 },
        biome: "default",
        protectedCrops: [],
        achievements: []
      };
    }
    return userData;
  }
  async updateGardener(userId, userData) {
    this.usersData.set(userId, userData);
    if (this.db) {
      try {
        await this.db.db("gag_users").updateOne(
          { userId },
          { $set: { userId, data: userData } },
          { upsert: true }
        );
      } catch (error) {
        console.warn(`[GrowAGardenManager] DB update failed for user ${userId}: ${error.message}`);
      }
    }
  }
  async addItem(userId, itemType, itemKey, quantity, weight = 1) {
    let userData = await this.getGardener(userId);
    if (itemType === "sheckles") {
      userData.garden.sheckles += quantity;
    } else if (itemType === "seeds") {
      userData.garden.seeds[itemKey] = (userData.garden.seeds[itemKey] || 0) + quantity;
    } else if (itemType === "crops") {
      userData.garden.crops[itemKey] = userData.garden.crops[itemKey] || { quantity: 0, weight: 0 };
      userData.garden.crops[itemKey].quantity += quantity;
      userData.garden.crops[itemKey].weight += weight * quantity;
    } else if (itemType === "pets") {
      userData.garden.pets.push({ key: itemKey, level: 1, hunger: 100 });
    } else if (itemType === "gear") {
      userData.garden.gear.push(itemKey);
    } else if (itemType === "materials") {
      userData.garden.materials[itemKey] = (userData.garden.materials[itemKey] || 0) + quantity;
    } else if (itemType === "achievements") {
      userData.garden.achievements.push(itemKey);
    }
    userData.garden.xp += quantity * 10;
    while (userData.garden.xp >= userData.garden.level * 100) {
      userData.garden.xp -= userData.garden.level * 100;
      userData.garden.level++;
      userData.garden.sheckles += userData.garden.level * 100;
    }
    await this.updateGardener(userId, userData);
    return userData;
  }
  async removeItem(userId, itemType, itemKey, quantity) {
    let userData = await this.getGardener(userId);
    if (itemType === "sheckles") {
      if (userData.garden.sheckles < quantity) return false;
      userData.garden.sheckles -= quantity;
    } else if (itemType === "seeds") {
      if (!userData.garden.seeds[itemKey] || userData.garden.seeds[itemKey] < quantity) return false;
      userData.garden.seeds[itemKey] -= quantity;
      if (userData.garden.seeds[itemKey] === 0) delete userData.garden.seeds[itemKey];
    } else if (itemType === "crops") {
      if (!userData.garden.crops[itemKey] || userData.garden.crops[itemKey].quantity < quantity) return false;
      userData.garden.crops[itemKey].quantity -= quantity;
      userData.garden.crops[itemKey].weight -= (userData.garden.crops[itemKey].weight / userData.garden.crops[itemKey].quantity) * quantity;
      if (userData.garden.crops[itemKey].quantity === 0) delete userData.garden.crops[itemKey];
    } else if (itemType === "materials") {
      if (!userData.garden.materials[itemKey] || userData.garden.materials[itemKey] < quantity) return false;
      userData.garden.materials[itemKey] -= quantity;
      if (userData.garden.materials[itemKey] === 0) delete userData.garden.materials[itemKey];
    }
    await this.updateGardener(userId, userData);
    return userData;
  }
  async setBiome(userId, biome) {
    let userData = await this.getGardener(userId);
    userData.garden.biome = biome;
    await this.updateGardener(userId, userData);
    return userData;
  }
  async protectCrop(userId, crop) {
    let userData = await this.getGardener(userId);
    if (!userData.garden.crops[crop]) return false;
    userData.garden.protectedCrops.push(crop);
    await this.updateGardener(userId, userData);
    return userData;
  }
}
module.exports = {
  config: {
    name: "gag",
    description: "Simulate Grow a Garden: plant, harvest, sell, trade, steal, craft, manage crops, pets, gear, events, quests, biomes.",
    usage: "/gag <plant/buy/harvest/sell/trade/steal/inventory/shop/pets/gear/event/quests/craft/biome/protect/move>",
    cooldown: 3
  },
  run: async ({ api, event, args, db, admins, prefix }) => {
    const { threadID, messageID, senderID } = event;
    const action = args[0]?.toLowerCase();
    const userId = senderID.toString();
    const usersData = new Map();
    const manager = new GrowAGardenManager(db, usersData);
    const crops = {
      carrot: { price: 10, growthTime: 30000, yield: 1, value: 30, multiHarvest: false, tier: "common", biome: "default" },
      strawberry: { price: 50, growthTime: 60000, yield: 2, value: 100, multiHarvest: true, tier: "common", biome: "default" },
      blueberry: { price: 100, growthTime: 90000, yield: 3, value: 150, multiHarvest: true, tier: "common", biome: "default" },
      tomato: { price: 800, growthTime: 120000, yield: 3, value: 500, multiHarvest: true, tier: "uncommon", biome: "default" },
      pumpkin: { price: 2000, growthTime: 180000, yield: 1, value: 1000, multiHarvest: false, tier: "uncommon", biome: "default" },
      watermelon: { price: 3000, growthTime: 240000, yield: 1, value: 1500, multiHarvest: false, tier: "uncommon", biome: "default" },
      bamboo: { price: 4000, growthTime: 300000, yield: 1, value: 2000, multiHarvest: false, tier: "rare", biome: "default", utility: "climb" },
      apple: { price: 5000, growthTime: 360000, yield: 5, value: 300, multiHarvest: true, tier: "rare", biome: "default" },
      grape: { price: 100000, growthTime: 600000, yield: 4, value: 5000, multiHarvest: true, tier: "divine", biome: "default" },
      pepper: { price: 1000000, growthTime: 720000, yield: 5, value: 7000, multiHarvest: true, tier: "legendary", biome: "desert" },
      cactus: { price: 500000, growthTime: 600000, yield: 1, value: 10000, multiHarvest: false, tier: "legendary", biome: "desert" },
      coconut: { price: 2000000, growthTime: 900000, yield: 2, value: 15000, multiHarvest: false, tier: "legendary", biome: "desert" },
      mint: { price: 5000000, growthTime: 720000, yield: 3, value: 20000, multiHarvest: true, tier: "mythical", biome: "lunar", source: "night_seed_pack" },
      sunflower: { price: 8000000, growthTime: 900000, yield: 6, value: 30000, multiHarvest: true, tier: "mythical", biome: "default" },
      sugar_apple: { price: 10000000, growthTime: 1080000, yield: 8, value: 43000, multiHarvest: true, tier: "mythical", biome: "default" },
      dragon_pepper: { price: 12000000, growthTime: 1200000, yield: 7, value: 50000, multiHarvest: true, tier: "mythical", biome: "desert" },
      candy_blossom: { price: 15000000, growthTime: 1440000, yield: 10, value: 100000, multiHarvest: true, tier: "mythical", biome: "default" },
      cherry_blossom: { price: 5000000, growthTime: 720000, yield: 4, value: 25000, multiHarvest: true, tier: "event", biome: "default", source: "event" },
      durian: { price: 6000000, growthTime: 900000, yield: 3, value: 30000, multiHarvest: true, tier: "event", biome: "default", source: "event" },
      cranberry: { price: 4000000, growthTime: 600000, yield: 5, value: 20000, multiHarvest: true, tier: "event", biome: "default", source: "event" },
      lotus: { price: 7000000, growthTime: 720000, yield: 4, value: 28000, multiHarvest: true, tier: "event", biome: "lunar", source: "event" },
      eggplant: { price: 3000000, growthTime: 600000, yield: 3, value: 18000, multiHarvest: true, tier: "event", biome: "default", source: "event" },
      venus_flytrap: { price: 8000000, growthTime: 900000, yield: 2, value: 35000, multiHarvest: true, tier: "event", biome: "lunar", source: "event" }
    };
    const pets = {
      dog: { price: 50000, ability: "seed_drop", chance: 0.05, tier: "common", effect: "Digs up random seeds." },
      red_fox: { price: 75000, ability: "seed_drop", chance: 0.06, tier: "common", effect: "Digs up random seeds." },
      golden_lab: { price: 100000, ability: "seed_drop", chance: 0.08, tier: "rare", effect: "Digs up rare seeds." },
      bee: { price: 150000, ability: "pollinate", chance: 0.05, tier: "common", effect: "Triggers Pollinated mutation." },
      bear_bee: { price: 200000, ability: "honeyglazed", chance: 0.05, tier: "rare", effect: "Triggers HoneyGlazed mutation." },
      anti_bee: { price: 500000, ability: "pest_control", chance: 0.1, tier: "mythical", effect: "Prevents crop loss." },
      moon_cat: { price: 250000, ability: "auto_replant", chance: 0.1, tier: "rare", effect: "Replants multi-harvest crops." },
      dragonfly: { price: 200000, ability: "yield_boost", chance: 0.08, tier: "uncommon", effect: "Increases crop yield by 50%." },
      praying_mantis: { price: 300000, ability: "pest_control", chance: 0.1, tier: "rare", effect: "Prevents crop loss." },
      blood_owl: { price: 1000000, ability: "xp_boost", chance: 0.1, tier: "legendary", effect: "Doubles pet XP gain." },
      chicken_zombie: { price: 1500000, ability: "zombified_mutation", chance: 0.05, tier: "mythical", effect: "Triggers Zombified mutation." },
      divine_thief: { price: 5000000, ability: "steal", chance: 0.05, tier: "divine", effect: "Steals crops from other plots every 15m." }
    };
    const gear = {
      watering_can: { price: 1000, effect: "faster_growth", multiplier: 0.9, description: "Speeds up crop growth by 10%." },
      basic_sprinkler: { price: 5000, effect: "faster_growth", multiplier: 0.8, description: "Speeds up crop growth by 20%." },
      advanced_sprinkler: { price: 25000, effect: "mutation_boost", multiplier: 1.5, description: "Increases mutation chance by 50%." },
      godly_sprinkler: { price: 100000, effect: "mutation_boost", multiplier: 2, description: "Doubles mutation chance." },
      lightning_rod: { price: 50000, effect: "mutation_boost", multiplier: 2, description: "Doubles mutation chance." },
      star_caller: { price: 200000, effect: "celestial_mutation", multiplier: 1, description: "Guarantees Celestial mutation on 6 crops." },
      trowel: { price: 10000, effect: "move_plants", multiplier: 1, description: "Move plants to reorganize garden." },
      favorite_tool: { price: 20000000, effect: "protect_crops", multiplier: 1, description: "Prevents crop stealing." },
      chocolate_sprinkler: { price: 500000, effect: "choc_mutation", multiplier: 1, description: "Applies Choc mutation to nearby crops." },
      recall_wrench: { price: 300000, effect: "instant_harvest", multiplier: 1, description: "Instantly harvests one crop." }
    };
    const mutations = {
      wet: { valueMultiplier: 2, chance: 0.5, trigger: "rain" },
      chilled: { valueMultiplier: 2, chance: 0.1, trigger: "frost" },
      frozen: { valueMultiplier: 10, chance: 0.05, trigger: "frost", requires: "wet" },
      shocked: { valueMultiplier: 50, chance: 0.01, trigger: "thunderstorm" },
      rainbow: { valueMultiplier: 50, chance: 0.005, trigger: "random" },
      celestial: { valueMultiplier: 120, chance: 0.005, trigger: "meteor_shower" },
      pollinated: { valueMultiplier: 3, chance: 0.05, trigger: "bee" },
      honeyglazed: { valueMultiplier: 5, chance: 0.05, trigger: "bear_bee" },
      bloodlit: { valueMultiplier: 4, chance: 0.02, trigger: "blood_moon" },
      molten: { valueMultiplier: 35, chance: 0.01, trigger: "volcano" },
      voidtouched: { valueMultiplier: 20, chance: 0.01, trigger: "blackhole" },
      disco: { valueMultiplier: 15, chance: 0.12, trigger: "divine_thief" },
      zombified: { valueMultiplier: 8, chance: 0.05, trigger: "chicken_zombie" },
      choc: { valueMultiplier: 2, chance: 0.1, trigger: "chocolate_sprinkler" },
      dawnbound: { valueMultiplier: 10, chance: 0.01, trigger: "sun_god" }
    };
    const events = {
      rain: { effect: "faster_growth", multiplier: 0.5, duration: 300000, description: "Crops grow 50% faster, 50% Wet mutation." },
      frost: { effect: "mutation_boost", multiplier: 2, duration: 300000, description: "Boosts Chilled/Frozen mutations." },
      thunderstorm: { effect: "mutation_boost", multiplier: 2, duration: 300000, description: "Doubles Shocked mutation chance." },
      nightfall: { effect: "faster_growth", multiplier: 0.8, duration: 300000, description: "Crops grow 20% faster." },
      blood_moon: { effect: "bloodlit_mutation", multiplier: 4, duration: 300000, description: "Grants Bloodlit mutation (4x value)." },
      meteor_shower: { effect: "celestial_mutation", multiplier: 3, duration: 180000, description: "Triples Celestial mutation chance." },
      bee_swarm: { effect: "pollinated_mutation", multiplier: 3, duration: 300000, description: "Triples Pollinated mutation chance." },
      volcano: { effect: "molten_mutation", multiplier: 3, duration: 300000, description: "Grants Molten mutation (35x value)." },
      blackhole: { effect: "voidtouched_mutation", multiplier: 2, duration: 300000, description: "Grants Voidtouched mutation (20x value)." },
      sheckle_rain: { effect: "sheckle_drop", multiplier: 100, duration: 300000, description: "Drops 100 Sheckles." },
      disco: { effect: "disco_mutation", multiplier: 2, duration: 300000, description: "Grants Disco mutation (15x value)." },
      sun_god: { effect: "dawnbound_mutation", multiplier: 2, duration: 300000, description: "Grants Dawnbound mutation for Sunflowers." },
      hungry_plant: { effect: "faster_growth", multiplier: 0.5, duration: 300000, description: "Crops grow 50% faster." }
    };
    const quests = [
      { key: "harvest_50", description: "Harvest 50 crops.", reward: { itemType: "seeds", itemKey: "strawberry", quantity: 5 }, target: 50 },
      { key: "sell_1000", description: "Sell crops for 1000 Sheckles.", reward: { itemType: "sheckles", quantity: 500 }, target: 1000 },
      { key: "plant_10", description: "Plant 10 seeds.", reward: { itemType: "materials", itemKey: "honey", quantity: 10 }, target: 10 },
      { key: "mutate_3", description: "Trigger 3 mutations.", reward: { itemType: "seeds", itemKey: "tomato", quantity: 3 }, target: 3 }
    ];
    const craftingRecipes = {
      pepper_seed: { ingredients: { honey: 50, tomato: 10 }, output: { itemType: "seeds", itemKey: "pepper", quantity: 1 } },
      dragon_pepper_seed: { ingredients: { honey: 100, pepper: 5 }, output: { itemType: "seeds", itemKey: "dragon_pepper", quantity: 1 } },
      candy_blossom_seed: { ingredients: { honey: 200, sugar_apple: 10 }, output: { itemType: "seeds", itemKey: "candy_blossom", quantity: 1 } },
      advanced_sprinkler: { ingredients: { honey: 50, basic_sprinkler: 1 }, output: { itemType: "gear", itemKey: "advanced_sprinkler", quantity: 1 } },
      godly_sprinkler: { ingredients: { honey: 100, advanced_sprinkler: 1 }, output: { itemType: "gear", itemKey: "godly_sprinkler", quantity: 1 } },
      anti_bee_egg: { ingredients: { honey: 150, bee: 1 }, output: { itemType: "pets", itemKey: "anti_bee", quantity: 1 } }
    };
    const biomes = {
      default: { growthMultiplier: 1, allowedCrops: Object.keys(crops).filter(c => crops[c].biome === "default") },
      desert: { growthMultiplier: 1.2, allowedCrops: Object.keys(crops).filter(c => crops[c].biome === "desert" || crops[c].biome === "default") },
      lunar: { growthMultiplier: 0.8, allowedCrops: Object.keys(crops).filter(c => crops[c].biome === "lunar" || crops[c].biome === "default") }
    };
    const achievements = {
      master_farmer: { description: "Reach level 50.", reward: { itemType: "sheckles", quantity: 100000 } },
      mutation_master: { description: "Trigger 100 mutations.", reward: { itemType: "gear", itemKey: "star_caller", quantity: 1 } },
      community_gardener: { description: "Complete a Sun God event.", reward: { itemType: "seeds", itemKey: "sunflower", quantity: 5 } }
    };
    let shopStock = Object.keys(crops).filter(c => crops[c].tier === "common" || crops[c].tier === "uncommon").slice(0, 6);
    const styledMessage = (header, body, symbol) => AuroraBetaStyler.styleOutput({
      headerText: header,
      headerSymbol: symbol,
      headerStyle: "bold",
      bodyText: body,
      bodyStyle: "bold",
      footerText: ""
    });
    const applyPetEffects = async (userData, threadID) => {
      let effects = { seeds: [], replanted: [], pollinated: [], boosted: [], protected: [], xp: [], zombified: [], stolen: [] };
      for (const pet of userData.garden.pets) {
        if (pet.hunger <= 0) continue;
        pet.hunger = Math.max(0, pet.hunger - 5);
        const petInfo = pets[pet.key];
        const xpMultiplier = userData.garden.pets.some(p => p.key === "blood_owl") ? 2 : 1;
        pet.level += Math.floor(Math.random() * 2) * xpMultiplier;
        if (petInfo.ability === "seed_drop" && Math.random() < petInfo.chance) {
          const seed = shopStock[Math.floor(Math.random() * shopStock.length)];
          await manager.addItem(userId, "seeds", seed, 1);
          effects.seeds.push(seed);
        }
        if (petInfo.ability === "pollinate" && Math.random() < petInfo.chance) {
          const plant = userData.garden.gardenPlots[Math.floor(Math.random() * userData.garden.gardenPlots.length)];
          if (plant && !plant.harvested) {
            plant.mutations = plant.mutations || [];
            if (!plant.mutations.includes("pollinated")) {
              plant.mutations.push("pollinated");
              effects.pollinated.push(plant.type);
            }
          }
        }
        if (petInfo.ability === "honeyglazed" && Math.random() < petInfo.chance) {
          const plant = userData.garden.gardenPlots[Math.floor(Math.random() * userData.garden.gardenPlots.length)];
          if (plant && !plant.harvested) {
            plant.mutations = plant.mutations || [];
            if (!plant.mutations.includes("honeyglazed")) {
              plant.mutations.push("honeyglazed");
              effects.pollinated.push(plant.type);
            }
          }
        }
        if (petInfo.ability === "auto_replant" && Math.random() < petInfo.chance) {
          userData.garden.gardenPlots.forEach(plant => {
            if (plant.harvested && crops[plant.type].multiHarvest) {
              plant.harvested = false;
              plant.plantedAt = Date.now();
              effects.replanted.push(plant.type);
            }
          });
        }
        if (petInfo.ability === "yield_boost" && Math.random() < petInfo.chance) {
          const plant = userData.garden.gardenPlots[Math.floor(Math.random() * userData.garden.gardenPlots.length)];
          if (plant && !plant.harvested) {
            plant.yieldMultiplier = (plant.yieldMultiplier || 1) * 1.5;
            effects.boosted.push(plant.type);
          }
        }
        if (petInfo.ability === "pest_control" && Math.random() < petInfo.chance) {
          userData.garden.gardenPlots.forEach(plant => {
            if (!plant.harvested) {
              plant.protected = true;
              effects.protected.push(plant.type);
            }
          });
        }
        if (petInfo.ability === "xp_boost" && Math.random() < petInfo.chance) {
          userData.garden.pets.forEach(p => {
            if (p.key !== pet.key) p.level += 1;
            effects.xp.push(p.key);
          });
        }
        if (petInfo.ability === "zombified_mutation" && Math.random() < petInfo.chance) {
          const plant = userData.garden.gardenPlots[Math.floor(Math.random() * userData.garden.gardenPlots.length)];
          if (plant && !plant.harvested) {
            plant.mutations = plant.mutations || [];
            if (!plant.mutations.includes("zombified")) {
              plant.mutations.push("zombified");
              effects.zombified.push(plant.type);
            }
          }
        }
        if (petInfo.ability === "steal" && Math.random() < petInfo.chance) {
          const targetId = Array.from(usersData.keys()).find(id => id !== userId);
          if (targetId) {
            const targetData = await manager.getGardener(targetId);
            const cropKeys = Object.keys(targetData.garden.crops).filter(c => !targetData.garden.protectedCrops.includes(c));
            if (cropKeys.length) {
              const crop = cropKeys[Math.floor(Math.random() * cropKeys.length)];
              const quantity = 1;
              targetData.garden.crops[crop].quantity -= quantity;
              targetData.garden.crops[crop].weight -= (targetData.garden.crops[crop].weight / targetData.garden.crops[crop].quantity) * quantity;
              if (targetData.garden.crops[crop].quantity === 0) delete targetData.garden.crops[crop];
              await manager.updateGardener(targetId, targetData);
              await manager.addItem(userId, "crops", crop, quantity, targetData.garden.crops[crop]?.weight || 1);
              effects.stolen.push(`${quantity} ${crop} from ${targetId}`);
            }
          }
        }
      }
      if (effects.seeds.length) await api.sendMessage(styledMessage("Pet Bonus", `Pets found seeds: ${effects.seeds.join(", ")}!`, "🐶"), threadID);
      if (effects.pollinated.length) await api.sendMessage(styledMessage("Pet Bonus", `Pets applied mutations: ${effects.pollinated.join(", ")}!`, "🐝"), threadID);
      if (effects.replanted.length) await api.sendMessage(styledMessage("Pet Bonus", `Pets replanted: ${effects.replanted.join(", ")}!`, "🐾"), threadID);
      if (effects.boosted.length) await api.sendMessage(styledMessage("Pet Bonus", `Pets boosted: ${effects.boosted.join(", ")}!`, "🌟"), threadID);
      if (effects.protected.length) await api.sendMessage(styledMessage("Pet Bonus", `Pets protected: ${effects.protected.join(", ")}!`, "🛡️"), threadID);
      if (effects.xp.length) await api.sendMessage(styledMessage("Pet Bonus", `Pets gained XP: ${effects.xp.join(", ")}!`, "📈"), threadID);
      if (effects.zombified.length) await api.sendMessage(styledMessage("Pet Bonus", `Pets zombified: ${effects.zombified.join(", ")}!`, "🧟"), threadID);
      if (effects.stolen.length) await api.sendMessage(styledMessage("Pet Bonus", `Pets stole: ${effects.stolen.join(", ")}!`, "🕵️"), threadID);
      await manager.updateGardener(userId, userData);
      return effects;
    };
    const applyMutation = (cropValue, cropWeight, userData, eventActive, plant) => {
      let appliedMutations = plant?.mutations || [];
      let finalValue = cropValue;
      let finalWeight = cropWeight;
      for (const mutation of Object.keys(mutations)) {
        if (mutation === "frozen" && !appliedMutations.includes("wet")) continue;
        let chance = mutations[mutation].chance;
        if (eventActive?.type === mutations[mutation].trigger) chance *= events[eventActive.type].multiplier || 1;
        if (userData.garden.gear.includes("lightning_rod") && mutation !== "celestial") chance *= gear.lightning_rod.multiplier;
        if (userData.garden.gear.includes("advanced_sprinkler") || userData.garden.gear.includes("godly_sprinkler")) chance *= gear[userData.garden.gear.includes("godly_sprinkler") ? "godly_sprinkler" : "advanced_sprinkler"].multiplier;
        if (userData.garden.gear.includes("star_caller") && mutation === "celestial") chance = plant && userData.garden.gardenPlots.indexOf(plant) < 6 ? 1 : chance;
        if (userData.garden.gear.includes("chocolate_sprinkler") && mutation === "choc") chance = 1;
        if (Math.random() < chance && !appliedMutations.includes(mutation)) {
          finalValue *= mutations[mutation].valueMultiplier;
          finalWeight *= 1.1;
          appliedMutations.push(mutation);
        }
      }
      return { value: finalValue, weight: finalWeight, mutations: appliedMutations };
    };
    const applyGearAndBiomeEffects = (userData) => {
      let growthMultiplier = biomes[userData.garden.biome].growthMultiplier;
      let mutationChanceMultiplier = 1;
      if (userData.garden.gear.includes("watering_can")) growthMultiplier *= gear.watering_can.multiplier;
      if (userData.garden.gear.includes("basic_sprinkler")) growthMultiplier *= gear.basic_sprinkler.multiplier;
      if (userData.garden.eventActive?.effect === "faster_growth") growthMultiplier *= events[userData.garden.eventActive.type].multiplier;
      if (userData.garden.eventActive?.effect === "mutation_boost") mutationChanceMultiplier *= events[userData.garden.eventActive.type].multiplier;
      return { growthMultiplier, mutationChanceMultiplier };
    };
    let userData = await manager.getGardener(userId);
    const petEffects = await applyPetEffects(userData, threadID);
    const { growthMultiplier, mutationChanceMultiplier } = applyGearAndBiomeEffects(userData);
    if (!action) {
      const body = `Usage:\n• ${prefix}gag buy <seed> [amount]\n• ${prefix}gag plant <seed>\n• ${prefix}gag harvest\n• ${prefix}gag sell <crop> [amount]\n• ${prefix}gag trade <userID> <item> <amount> <requestItem> <requestAmount>\n• ${prefix}gag steal <userID> <crop>\n• ${prefix}gag inventory\n• ${prefix}gag shop\n• ${prefix}gag pets <buy/list/feed> [pet]\n• ${prefix}gag gear <buy/list> [gear]\n• ${prefix}gag event <start/end> [type] (admin only)\n• ${prefix}gag quests\n• ${prefix}gag craft <recipe>\n• ${prefix}gag biome <default/desert/lunar>\n• ${prefix}gag protect <crop>\n• ${prefix}gag move <crop> <position>`;
      await api.sendMessage(styledMessage("Grow a Garden", body, "🌱"), threadID, messageID);
      await manager.updateGardener(userId, userData);
      return;
    }
    if (action === "shop") {
      if (Math.random() < 0.2) shopStock = Object.keys(crops).filter(c => crops[c].tier === "common" || crops[c].tier === "uncommon" || (crops[c].tier === "rare" && Math.random() < 0.1)).slice(0, 6);
      const body = `Seed Shop (restocks every 5 mins):\n${shopStock.map(seed => `• ${seed} (${crops[seed].tier}): ${crops[seed].price} Sheckles`).join("\n")}`;
      await api.sendMessage(styledMessage("Seed Shop", body, "🛒"), threadID, messageID);
      await manager.updateGardener(userId, userData);
      return;
    }
    if (action === "buy" && args[1]) {
      const seed = args[1].toLowerCase();
      const amount = parseInt(args[2]) || 1;
      if (!crops[seed] || !shopStock.includes(seed)) {
        await api.sendMessage(styledMessage("Error", `Seed ${seed} not available!`, "❌"), threadID, messageID);
        return;
      }
      const cost = crops[seed].price * amount;
      if (userData.garden.sheckles < cost) {
        await api.sendMessage(styledMessage("Error", `Not enough Sheckles! Need ${cost}.`, "❌"), threadID, messageID);
        return;
      }
      userData = await manager.removeItem(userId, "sheckles", null, cost);
      userData = await manager.addItem(userId, "seeds", seed, amount);
      await api.sendMessage(styledMessage("Purchase", `Bought ${amount} ${seed} seed(s) for ${cost} Sheckles!`, "✅"), threadID, messageID);
      return;
    }
    if (action === "plant" && args[1]) {
      const seed = args[1].toLowerCase();
      if (!crops[seed] || !userData.garden.seeds[seed]) {
        await api.sendMessage(styledMessage("Error", `No ${seed} seeds in inventory!`, "❌"), threadID, messageID);
        return;
      }
      if (!biomes[userData.garden.biome].allowedCrops.includes(seed)) {
        await api.sendMessage(styledMessage("Error", `${seed} cannot be planted in ${userData.garden.biome} biome!`, "❌"), threadID, messageID);
        return;
      }
      if (userData.garden.gardenPlots.length >= 800) {
        await api.sendMessage(styledMessage("Error", "Garden full (800 plants max)! Harvest or sell crops.", "❌"), threadID, messageID);
        return;
      }
      userData = await manager.removeItem(userId, "seeds", seed, 1);
      userData.garden.gardenPlots.push({ type: seed, plantedAt: Date.now(), harvested: false, mutations: [], yieldMultiplier: 1, protected: false, position: userData.garden.gardenPlots.length });
      userData.garden.quests.plant_10 = (userData.garden.quests.plant_10 || 0) + 1;
      await manager.updateGardener(userId, userData);
      await api.sendMessage(styledMessage("Planted", `Planted ${seed}! Growth time: ${(crops[seed].growthTime * growthMultiplier / 1000).toFixed(1)}s.`, "🌱"), threadID, messageID);
      return;
    }
    if (action === "harvest") {
      let harvested = [];
      let questProgress = userData.garden.quests.harvest_50 || 0;
      let mutationProgress = userData.garden.quests.mutate_3 || 0;
      userData.garden.gardenPlots = userData.garden.gardenPlots.filter(plant => {
        const growthTime = crops[plant.type].growthTime * growthMultiplier;
        if (Date.now() - plant.plantedAt >= growthTime && !plant.harvested) {
          const crop = crops[plant.type];
          let yieldAmount = crop.yield * (plant.yieldMultiplier || 1);
          if (!plant.protected && Math.random() < 0.05) {
            yieldAmount = 0;
            harvested.push(`${plant.type} (Lost to pests)`);
          } else {
            const weight = 1 + Math.random() * 0.5;
            const { mutations: appliedMutations } = applyMutation(crop.value, weight, userData, userData.garden.eventActive, plant);
            userData.garden.crops[plant.type] = userData.garden.crops[plant.type] || { quantity: 0, weight: 0 };
            userData.garden.crops[plant.type].quantity += yieldAmount;
            userData.garden.crops[plant.type].weight += weight * yieldAmount;
            harvested.push(`${yieldAmount} ${plant.type}(s) (Weight: ${weight.toFixed(2)})`);
            questProgress += yieldAmount;
            if (appliedMutations.length) mutationProgress += 1;
            if (Math.random() < 0.05) {
              userData.garden.seeds[plant.type] = (userData.garden.seeds[plant.type] || 0) + 1;
              harvested.push(`1 ${plant.type} seed (Lucky Harvest)`);
            }
            if (Math.random() < 0.1) {
              userData.garden.materials.honey = (userData.garden.materials.honey || 0) + 1;
              harvested.push(`1 Honey (Bee Activity)`);
            }
          }
          plant.harvested = true;
          return crop.multiHarvest;
        }
        return true;
      });
      userData.garden.quests.harvest_50 = questProgress;
      userData.garden.quests.mutate_3 = mutationProgress;
      if (mutationProgress >= 100 && !userData.garden.achievements.includes("mutation_master")) {
        userData = await manager.addItem(userId, "achievements", "mutation_master", 1);
        userData = await manager.addItem(userId, achievements.mutation_master.reward.itemType, achievements.mutation_master.reward.itemKey, achievements.mutation_master.reward.quantity);
      }
      await manager.updateGardener(userId, userData);
      if (harvested.length === 0) {
        await api.sendMessage(styledMessage("Harvest", "No crops ready to harvest!", "🌾"), threadID, messageID);
        return;
      }
      await api.sendMessage(styledMessage("Harvest", `Harvested: ${harvested.join(", ")}`, "🌾"), threadID, messageID);
      return;
    }
    if (action === "sell" && args[1]) {
      const crop = args[1].toLowerCase();
      const amount = parseInt(args[2]) || 1;
      if (!crops[crop] || !userData.garden.crops[crop] || userData.garden.crops[crop].quantity < amount) {
        await api.sendMessage(styledMessage("Error", `Not enough ${crop} to sell!`, "❌"), threadID, messageID);
        return;
      }
      const cropWeight = userData.garden.crops[crop].weight / userData.garden.crops[crop].quantity;
      const baseValue = crops[crop].value * amount;
      const { value, mutations: appliedMutations } = applyMutation(baseValue, cropWeight, userData, userData.garden.eventActive, null);
      userData = await manager.removeItem(userId, "crops", crop, amount);
      userData = await manager.addItem(userId, "sheckles", null, value);
      userData.garden.quests.sell_1000 = (userData.garden.quests.sell_1000 || 0) + value;
      if (userData.garden.level >= 50 && !userData.garden.achievements.includes("master_farmer")) {
        userData = await manager.addItem(userId, "achievements", "master_farmer", 1);
        userData = await manager.addItem(userId, achievements.master_farmer.reward.itemType, achievements.master_farmer.reward.itemKey, achievements.master_farmer.reward.quantity);
      }
      await manager.updateGardener(userId, userData);
      const mutationText = appliedMutations.length ? ` (Mutations: ${appliedMutations.join(", ")})` : "";
      await api.sendMessage(styledMessage("Sell", `Sold ${amount} ${crop} for ${value} Sheckles${mutationText}!`, "💰"), threadID, messageID);
      return;
    }
    if (action === "trade" && args[1]) {
      const targetUserId = args[1];
      const item = args[2]?.toLowerCase();
      const amount = parseInt(args[3]) || 1;
      const requestItem = args[4]?.toLowerCase();
      const requestAmount = parseInt(args[5]) || 1;
      const targetData = await manager.getGardener(targetUserId);
      if (!targetData.garden) {
        await api.sendMessage(styledMessage("Error", "Target user not found!", "❌"), threadID, messageID);
        return;
      }
      const isCrop = !!crops[item];
      const userItemKey = isCrop ? "crops" : "seeds";
      const targetItemKey = isCrop ? "crops" : "seeds";
      if (!userData.garden[userItemKey][item] || userData.garden[userItemKey][item].quantity < amount) {
        await api.sendMessage(styledMessage("Error", `You don't have ${amount} ${item}!`, "❌"), threadID, messageID);
        return;
      }
      if (!targetData.garden[targetItemKey][requestItem] || targetData.garden[targetItemKey][requestItem].quantity < requestAmount) {
        await api.sendMessage(styledMessage("Error", `Target user doesn't have ${requestAmount} ${requestItem}!`, "❌"), threadID, messageID);
        return;
      }
      if (targetData.garden.protectedCrops.includes(item)) {
        await api.sendMessage(styledMessage("Error", `${item} is protected by target user!`, "❌"), threadID, messageID);
        return;
      }
      global.Kagenou.replies[messageID] = {
        callback: async ({ api, event, data }) => {
          if (event.senderID !== targetUserId) return;
          if (event.body.toLowerCase() !== "confirm") {
            await api.sendMessage(styledMessage("Trade Cancelled", "Trade not confirmed.", "❌"), threadID, event.messageID);
            delete global.Kagenou.replies[data.data.messageID];
            return;
          }
          userData = await manager.removeItem(userId, userItemKey, item, amount);
          targetData = await manager.addItem(targetUserId, userItemKey, item, amount, userData.garden[userItemKey][item]?.weight || 1);
          targetData = await manager.removeItem(targetUserId, targetItemKey, requestItem, requestAmount);
          userData = await manager.addItem(userId, targetItemKey, requestItem, requestAmount, targetData.garden[targetItemKey][requestItem]?.weight || 1);
          await api.sendMessage(styledMessage("Trade Success", `Traded ${amount} ${item} for ${requestAmount} ${requestItem} with user ${targetUserId}!`, "🤝"), threadID, event.messageID);
          delete global.Kagenou.replies[data.data.messageID];
        },
        author: userId,
        messageID
      };
      const body = `Trade proposed to ${targetUserId}:\n• You give: ${amount} ${item}\n• You get: ${requestAmount} ${requestItem}\nReply "confirm" to accept.`;
      await api.sendMessage(styledMessage("Trade Offer", body, "📦"), threadID, messageID);
      setTimeout(() => delete global.Kagenou.replies[messageID], 300000);
      return;
    }
    if (action === "steal" && args[1] && args[2]) {
      const targetUserId = args[1];
      const crop = args[2].toLowerCase();
      const targetData = await manager.getGardener(targetUserId);
      if (!targetData.garden) {
        await api.sendMessage(styledMessage("Error", "Target user not found!", "❌"), threadID, messageID);
        return;
      }
      if (!targetData.garden.crops[crop] || targetData.garden.protectedCrops.includes(crop)) {
        await api.sendMessage(styledMessage("Error", `Cannot steal ${crop} from user ${targetUserId}!`, "❌"), threadID, messageID);
        return;
      }
      global.Kagenou.replies[messageID] = {
        callback: async ({ api, event, data }) => {
          if (event.senderID !== targetUserId) return;
          if (event.body.toLowerCase() !== "confirm") {
            await api.sendMessage(styledMessage("Steal Cancelled", "Steal not confirmed.", "❌"), threadID, event.messageID);
            delete global.Kagenou.replies[data.data.messageID];
            return;
          }
          const quantity = 1;
          const weight = targetData.garden.crops[crop].weight / targetData.garden.crops[crop].quantity;
          targetData.garden.crops[crop].quantity -= quantity;
          targetData.garden.crops[crop].weight -= weight * quantity;
          if (targetData.garden.crops[crop].quantity === 0) delete targetData.garden.crops[crop];
          await manager.updateGardener(targetUserId, targetData);
          userData = await manager.addItem(userId, "crops", crop, quantity, weight);
          await api.sendMessage(styledMessage("Steal Success", `Stole ${quantity} ${crop} from user ${targetUserId}!`, "🕵️"), threadID, event.messageID);
          delete global.Kagenou.replies[data.data.messageID];
        },
        author: userId,
        messageID
      };
      const body = `Steal attempt by ${userId} to take 1 ${crop}. Reply "confirm" to allow.`;
      await api.sendMessage(styledMessage("Steal Attempt", body, "🕵️"), threadID, messageID);
      setTimeout(() => delete global.Kagenou.replies[messageID], 300000);
      return;
    }
    if (action === "inventory") {
      const seeds = Object.entries(userData.garden.seeds).map(([seed, qty]) => `• ${seed}: ${qty}`).join("\n") || "None";
      const cropsList = Object.entries(userData.garden.crops).map(([crop, data]) => `• ${crop}: ${data.quantity} (Weight: ${data.weight.toFixed(2)})`).join("\n") || "None";
      const garden = userData.garden.gardenPlots.map(plant => {
        const timeLeft = Math.max(0, (crops[plant.type].growthTime * growthMultiplier - (Date.now() - plant.plantedAt)) / 1000);
        return `• ${plant.type} (Pos: ${plant.position}, ${plant.harvested ? "Harvested" : `${timeLeft.toFixed(1)}s left`}${plant.mutations.length ? `, Mutations: ${plant.mutations.join(", ")}` : ""})`;
      }).join("\n") || "None";
      const petsList = userData.garden.pets.map(pet => `• ${pet.key} (${pets[pet.key].tier}, Lvl: ${pet.level}, Hunger: ${pet.hunger}%)`).join("\n") || "None";
      const gearList = userData.garden.gear.map(g => `• ${g} (${gear[g].description})`).join("\n") || "None";
      const materials = Object.entries(userData.garden.materials).map(([m, qty]) => `• ${m}: ${qty}`).join("\n") || "None";
      const eventText = userData.garden.eventActive ? `${userData.garden.eventActive.type} (${Math.max(0, (userData.garden.eventActive.startedAt + userData.garden.eventActive.duration - Date.now()) / 1000).toFixed(1)}s left)` : "None";
      const protectedCrops = userData.garden.protectedCrops.map(c => `• ${c}`).join("\n") || "None";
      const achievementsList = userData.garden.achievements.map(a => `• ${a} (${achievements[a].description})`).join("\n") || "None";
      const body = `Inventory:\nLevel: ${userData.garden.level} (XP: ${userData.garden.xp}/${userData.garden.level * 100})\nSheckles: ${userData.garden.sheckles}\nBiome: ${userData.garden.biome}\nSeeds:\n${seeds}\nCrops:\n${cropsList}\nGarden:\n${garden}\nPets:\n${petsList}\nGear:\n${gearList}\nMaterials:\n${materials}\nEvent: ${eventText}\nProtected Crops:\n${protectedCrops}\nAchievements:\n${achievementsList}`;
      await api.sendMessage(styledMessage("Inventory", body, "🎒"), threadID, messageID);
      await manager.updateGardener(userId, userData);
      return;
    }
    if (action === "pets" && args[1]) {
      const subAction = args[1].toLowerCase();
      if (subAction === "buy" && args[2]) {
        const pet = args[2].toLowerCase();
        if (!pets[pet]) {
          await api.sendMessage(styledMessage("Error", `Pet ${pet} not available!`, "❌"), threadID, messageID);
          return;
        }
        if (userData.garden.sheckles < pets[pet].price) {
          await api.sendMessage(styledMessage("Error", `Not enough Sheckles! Need ${pets[pet].price}.`, "❌"), threadID, messageID);
          return;
        }
        userData = await manager.removeItem(userId, "sheckles", null, pets[pet].price);
        userData = await manager.addItem(userId, "pets", pet, 1);
        await api.sendMessage(styledMessage("Pet Purchase", `Bought ${pet} for ${pets[pet].price} Sheckles!`, "🐶"), threadID, messageID);
        return;
      }
      if (subAction === "list") {
        const body = `Available Pets:\n${Object.entries(pets).map(([pet, info]) => `• ${pet} (${info.tier}): ${info.price} Sheckles - ${info.effect}`).join("\n")}`;
        await api.sendMessage(styledMessage("Pet Shop", body, "🐾"), threadID, messageID);
        return;
      }
      if (subAction === "feed" && args[2]) {
        const pet = args[2].toLowerCase();
        const petIndex = userData.garden.pets.findIndex(p => p.key === pet);
        if (petIndex === -1) {
          await api.sendMessage(styledMessage("Error", `You don't own ${pet}!`, "❌"), threadID, messageID);
          return;
        }
        if (userData.garden.sheckles < 1000) {
          await api.sendMessage(styledMessage("Error", `Not enough Sheckles! Need 1000 to feed.`, "❌"), threadID, messageID);
          return;
        }
        userData.garden.pets[petIndex].hunger = 100;
        userData = await manager.removeItem(userId, "sheckles", null, 1000);
        await api.sendMessage(styledMessage("Pet Fed", `Fed ${pet}! Hunger restored to 100%.`, "🍖"), threadID, messageID);
        await manager.updateGardener(userId, userData);
        return;
      }
      await api.sendMessage(styledMessage("Pets", `Usage: ${prefix}gag pets <buy/list/feed> [pet]`, "🐶"), threadID, messageID);
      return;
    }
    if (action === "gear" && args[1]) {
      const subAction = args[1].toLowerCase();
      if (subAction === "buy" && args[2]) {
        const g = args[2].toLowerCase();
        if (!gear[g]) {
          await api.sendMessage(styledMessage("Error", `Gear ${g} not available!`, "❌"), threadID, messageID);
          return;
        }
        if (userData.garden.gear.includes(g)) {
          await api.sendMessage(styledMessage("Error", `You already own ${g}!`, "❌"), threadID, messageID);
          return;
        }
        if (userData.garden.sheckles < gear[g].price) {
          await api.sendMessage(styledMessage("Error", `Not enough Sheckles! Need ${gear[g].price}!`, "❌"), threadID, messageID);
          return;
        }
        userData = await manager.removeItem(userId, "sheckles", null, gear[g].price);
        userData = await manager.addItem(userId, "gear", g, 1);
        await api.sendMessage(styledMessage("Gear Purchase", `Bought ${g} for ${gear[g].price} Sheckles!`, "⚙️"), threadID, messageID);
        return;
      }
      if (subAction === "list") {
        const body = `Available Gear:\n${Object.entries(gear).map(([g, info]) => `• ${g}: ${info.price} Sheckles - ${info.description}`).join("\n")}`;
        await api.sendMessage(styledMessage("Gear Shop", body, "⚙️"), threadID, messageID);
        return;
      }
      await api.sendMessage(styledMessage("Gear", `Usage: ${prefix}gag gear <buy/list> [gear]`, "⚙️"), threadID, messageID);
      return;
    }
    if (action === "event" && admins.includes(userId)) {
      const subAction = args[1]?.toLowerCase();
      const eventType = args[2]?.toLowerCase();
      if (subAction === "start" && eventType && events[eventType]) {
        for (const [id] of usersData.entries()) {
          let data = await manager.getGardener(id);
          data.garden.eventActive = { type: eventType, startedAt: Date.now(), duration: events[eventType].duration };
          await manager.updateGardener(id, data);
        }
        if (eventType === "sun_god") {
          global.Kagenou.replies[messageID] = {
            callback: async ({ api, event, data }) => {
              if (event.body.toLowerCase() !== "sunflower") return;
              const participant = await manager.getGardener(event.senderID);
              if (!participant.garden.crops.sunflower || participant.garden.crops.sunflower.quantity < 4) return;
              participant.garden.crops.sunflower.quantity -= 4;
              participant.garden.crops.sunflower.weight -= (participant.garden.crops.sunflower.weight / participant.garden.crops.sunflower.quantity) * 4;
              if (participant.garden.crops.sunflower.quantity === 0) delete participant.garden.crops.sunflower;
              if (Math.random() < 0.1) {
                participant.garden.seeds.sunflower = (participant.garden.seeds.sunflower || 0) + 5;
                participant.garden.achievements.push("community_gardener");
                await api.sendMessage(styledMessage("Sun God Success", `User ${event.senderID} earned 5 Sunflower seeds and Community Gardener achievement!`, "🌞"), threadID, event.messageID);
              }
              await manager.updateGardener(event.senderID, participant);
            },
            author: userId,
            messageID
          };
          setTimeout(() => delete global.Kagenou.replies[messageID], 300000);
        }
        let extra = eventType === "sheckle_rain" ? "\nCollected 100 Sheckles!" : "";
        userData = await manager.addItem(userId, "sheckles", null, eventType === "sheckle_rain" ? 100 : 0);
        await api.sendMessage(styledMessage("Event Started", `${eventType} event started! ${events[eventType].description}${extra}`, "🌩️"), threadID, messageID);
        return;
      }
      if (subAction === "end") {
        for (const [id] of usersData.entries()) {
          let data = await manager.getGardener(id);
          data.garden.eventActive = null;
          await manager.updateGardener(id, data);
        }
        await api.sendMessage(styledMessage("Event Ended", "All events have ended.", "🌞"), threadID, messageID);
        return;
      }
      await api.sendMessage(styledMessage("Event", `Usage: ${prefix}gag event <start/end> [rain/frost/thunderstorm/nightfall/blood_moon/meteor_shower/bee_swarm/volcano/sheckle_rain/disco/sun_god/hungry_plant]`, "🌩️"), threadID, messageID);
      return;
    }
    if (action === "quests") {
      userData.garden.quests = userData.garden.quests || {};
      let completed = [];
      for (const quest of quests) {
        if (userData.garden.quests[quest.key]?.quantity >= quest.target) {
          userData = await manager.addItem(userId, quest.reward.itemType, quest.reward.itemKey, quest.reward.quantity);
          completed.push(`${quest.description} (${quest.reward.itemType === "sheckles" ? quest.reward.quantity + " Sheckles" : quest.reward.quantity + " " + quest.reward.itemKey})`);
          userData.garden.quests[quest.key] = 0;
        }
      }
      await manager.updateGardener(userId, userData);
      const activeQuests = quests.map(quest => `• ${quest.description}: ${userData.garden.quests[quest.key] || 0}/${quest.target}`).join("\n");
      const completedText = completed.length ? `Completed:\n${completed.join("\n")}\n` : "";
      const body = `${completedText}Active Quests:\n${activeQuests}`;
      await api.sendMessage(styledMessage("Quests", body, "📜"), threadID, messageID);
      return;
    }
    if (action === "craft" && args[1]) {
      const recipe = args[1].toLowerCase();
      if (!craftingRecipes[recipe]) {
        await api.sendMessage(styledMessage("Error", `Recipe ${recipe} not available!`, "❌"), threadID, messageID);
        return;
      }
      const ingredients = craftingRecipes[recipe].ingredients;
      for (const [item, qty] of Object.entries(ingredients)) {
        const itemType = item === "honey" ? "materials" : (crops[item] ? "crops" : "gear");
        if (!userData.garden[itemType][item] || userData.garden[itemType][item].quantity < qty) {
          await api.sendMessage(styledMessage("Error", `Not enough ${item}! Need ${qty}.`, "❌"), threadID, messageID);
          return;
        }
      }
      for (const [item, qty] of Object.entries(ingredients)) {
        const itemType = item === "honey" ? "materials" : (crops[item] ? "crops" : "gear");
        userData = await manager.removeItem(userId, itemType, item, qty);
      }
      const output = craftingRecipes[recipe].output;
      userData = await manager.addItem(userId, output.itemType, output.itemKey, output.quantity);
      await api.sendMessage(styledMessage("Crafted", `Crafted ${output.quantity} ${output.itemKey} ${output.itemType}!`, "🔨"), threadID, messageID);
      return;
    }
    if (action === "biome" && args[1]) {
      const biome = args[1].toLowerCase();
      if (!biomes[biome]) {
        await api.sendMessage(styledMessage("Error", `Invalid biome! Use: default/desert/lunar`, "❌"), threadID, messageID);
        return;
      }
      if (userData.garden.level < (Object.keys(biomes).indexOf(biome) + 1) * 5) {
        await api.sendMessage(styledMessage("Error", `Need level ${(Object.keys(biomes).indexOf(biome) + 1) * 5} to unlock ${biome}!`, "❌"), threadID, messageID);
        return;
      }
      userData = await manager.setBiome(userId, biome);
      await api.sendMessage(styledMessage("Biome Changed", `Set biome to ${biome}!`, "🌍"), threadID, messageID);
      return;
    }
    if (action === "protect" && args[1]) {
      const crop = args[1].toLowerCase();
      if (!userData.garden.gear.includes("favorite_tool")) {
        await api.sendMessage(styledMessage("Error", "You need Favorite Tool to protect crops!", "❌"), threadID, messageID);
        return;
      }
      if (!userData.garden.crops[crop]) {
        await api.sendMessage(styledMessage("Error", `No ${crop} in inventory to protect!`, "❌"), threadID, messageID);
        return;
      }
      userData = await manager.protectCrop(userId, crop);
      await api.sendMessage(styledMessage("Crop Protected", `${crop} is now protected from stealing!`, "🛡️"), threadID, messageID);
      return;
    }
    if (action === "move" && args[1] && args[2]) {
      const crop = args[1].toLowerCase();
      const position = parseInt(args[2]);
      if (!userData.garden.gear.includes("trowel")) {
        await api.sendMessage(styledMessage("Error", "You need a Trowel to move plants!", "❌"), threadID, messageID);
        return;
      }
      const plantIndex = userData.garden.gardenPlots.findIndex(p => p.type === crop && !p.harvested);
      if (plantIndex === -1 || position < 0 || position >= userData.garden.gardenPlots.length) {
        await api.sendMessage(styledMessage("Error", `Invalid crop or position!`, "❌"), threadID, messageID);
        return;
      }
      userData.garden.gardenPlots[plantIndex].position = position;
      userData.garden.gardenPlots.sort((a, b) => a.position - b.position);
      await manager.updateGardener(userId, userData);
      await api.sendMessage(styledMessage("Plant Moved", `Moved ${crop} to position ${position}!`, "🌿"), threadID, messageID);
      return;
    }
    await api.sendMessage(styledMessage("Error", "Invalid action! Use /gag for help.", "❌"), threadID, messageID);
    await manager.updateGardener(userId, userData);
  }
};

