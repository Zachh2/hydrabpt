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

interface ResortData {
  userID: string;
  resortName?: string;
  level: number;
  money: number;
  exp: number;
  rank: string;
  staff: { [role: string]: number };
  facilities: { [facility: string]: number };
  guests: number;
  rating: number;
  reviews: { text: string; rating: number }[];
  revenue: number;
  expenses: number;
  profit: number;
  inventory: { supplies: { [item: string]: number } };
  cooldowns: { [action: string]: number };
  hasChangedName?: boolean;
  guild?: string;
}

interface ResortGuildData {
  name: string;
  members: string[];
  totalRating: number;
  hasChangedName?: boolean;
}

const resortCommand: ShadowBot.Command = {
  config: {
    name: "resort",
    description: "Manage your resort empire!",
    usage: "/resort clean | /resort dashboard | /resort buy <resort-name> | /resort shop | ... (see full list in help)",
    aliases: ["rs"],
    category: "Games 🎮",
  },
  run: async ({ api, event, args, db }) => {
    if (!db) {
      await api.sendMessage("Database not available.", event.threadID, event.messageID);
      return;
    }
    const { threadID, messageID, senderID } = event;
    const action = args[0]?.toLowerCase();
    const userData = await getResortData(db, senderID.toString());
    const currentTime = Math.floor(Date.now() / 1000);
    const defaultCooldown = 1800; // 30 minutes for most actions

    if (!action) {
      const helpMessage = AuroraBetaStyler.styleOutput({
        headerText: "Resort Management Help",
        headerSymbol: "ℹ️",
        headerStyle: "bold",
        bodyText: "Available commands:\n" +
          "1. clean\n2. dashboard\n3. buy <name>\n4. shop\n5. restore\n6. claim\n7. sweep\n8. decorate\n9. hire\n10. fire\n" +
          "11. upgrade\n12. manage\n13. guests\n14. revenue\n15. expenses\n16. profit\n17. rating\n18. review\n19. respond\n20. advertise\n" +
          "21. promote\n22. analyze\n23. forecast\n24. expand\n25. renovate\n26. train\n27. motivate\n28. inspect\n29. maintain\n30. celebrate\n" +
          "31. discount\n32. package\n33. event\n34. catering\n35. spa\n36. fitness\n37. pool\n38. beach\n39. activities\n40. tour\n" +
          "41. transportation\n42. security\n43. feedback\n44. complaint\n45. staffing\n46. scheduling\n47. inventory\n48. supplies\n49. budget\n50. finance\n" +
          "51. investment\n52. partnership\n53. marketing\n54. branding\n55. logo\n56. website\n57. social media\n58. newsletter\n59. loyalty program\n60. referral program\n" +
          "Use /resort <command> to execute.",
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(helpMessage, threadID, messageID);
      return;
    }

    // Handle buy to start/resort creation
    if (action === "buy") {
      if (userData.resortName) {
        const alreadyOwned = AuroraBetaStyler.styleOutput({
          headerText: "Resort Buy",
          headerSymbol: "🛑",
          headerStyle: "bold",
          bodyText: `You already own ${userData.resortName}. Use /resort dashboard to view.`,
          bodyStyle: "sansSerif",
          footerText: "",
        });
        await api.sendMessage(alreadyOwned, threadID, messageID);
        return;
      }
      const resortName = args.slice(1).join(" ");
      if (!resortName) {
        const noName = AuroraBetaStyler.styleOutput({
          headerText: "Resort Buy",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "Please provide a resort name. Usage: /resort buy <name>",
          bodyStyle: "sansSerif",
          footerText: "",
        });
        await api.sendMessage(noName, threadID, messageID);
        return;
      }
      const resortsCollection = db.db("resorts");
      const existingResort = await resortsCollection.findOne({ resortName });
      if (existingResort) {
        const nameTaken = AuroraBetaStyler.styleOutput({
          headerText: "Resort Buy",
          headerSymbol: "🛑",
          headerStyle: "bold",
          bodyText: `The name "${resortName}" is already taken.`,
          bodyStyle: "sansSerif",
          footerText: "",
        });
        await api.sendMessage(nameTaken, threadID, messageID);
        return;
      }
      userData.resortName = resortName;
      userData.level = 1;
      userData.exp = 0;
      userData.money = 10000; // Starting money
      userData.rank = "E";
      userData.staff = {};
      userData.facilities = {};
      userData.guests = 0;
      userData.rating = 0;
      userData.reviews = [];
      userData.revenue = 0;
      userData.expenses = 0;
      userData.profit = 0;
      userData.inventory = { supplies: {} };
      userData.cooldowns = {};
      userData.hasChangedName = false;
      await saveResortData(db, senderID.toString(), userData);
      const buyMessage = AuroraBetaStyler.styleOutput({
        headerText: "Resort Buy",
        headerSymbol: "✅",
        headerStyle: "bold",
        bodyText: `Purchased resort "${resortName}"! Starting money: 10000. Rank: E.`,
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(buyMessage, threadID, messageID);
      return;
    }

    if (!userData.resortName) {
      const noResort = AuroraBetaStyler.styleOutput({
        headerText: "Resort Management",
        headerSymbol: "⚠️",
        headerStyle: "bold",
        bodyText: "You need to buy a resort first. Usage: /resort buy <name>",
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(noResort, threadID, messageID);
      return;
    }

    // Dashboard
    if (action === "dashboard") {
      const dashboardMessage = AuroraBetaStyler.styleOutput({
        headerText: "Resort Dashboard",
        headerSymbol: "📊",
        headerStyle: "bold",
        bodyText: `Name: ${userData.resortName}\nLevel: ${userData.level}\nEXP: ${userData.exp}\nRank: ${userData.rank}\nMoney: ${userData.money}\nStaff: ${Object.entries(userData.staff).map(([k, v]) => `${k}: ${v}`).join(", ") || "None"}\nFacilities: ${Object.entries(userData.facilities).map(([k, v]) => `${k}: ${v}`).join(", ") || "None"}\nGuests: ${userData.guests}\nRating: ${userData.rating}\nRevenue: ${userData.revenue}\nExpenses: ${userData.expenses}\nProfit: ${userData.profit}`,
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(dashboardMessage, threadID, messageID);
      return;
    }

    // Generic cooldown check function
    const checkCooldown = (actionKey: string, cooldownTime: number = defaultCooldown) => {
      if ((userData.cooldowns[actionKey] || 0) > currentTime) {
        const remaining = userData.cooldowns[actionKey] - currentTime;
        return `Cooldown active for ${actionKey}. Wait ${Math.ceil(remaining / 60)} minutes.`;
      }
      userData.cooldowns[actionKey] = currentTime + cooldownTime;
      return null;
    };

    // Clean
    if (action === "clean") {
      const cooldownError = checkCooldown("clean");
      if (cooldownError) {
        await api.sendMessage(AuroraBetaStyler.styleOutput({
          headerText: "Resort Clean",
          headerSymbol: "⏳",
          headerStyle: "bold",
          bodyText: cooldownError,
          bodyStyle: "sansSerif",
          footerText: "",
        }), threadID, messageID);
        return;
      }
      userData.rating += 0.1;
      userData.exp += 50;
      userData.level = Math.floor(userData.exp / 1000) + 1;
      await saveResortData(db, senderID.toString(), userData);
      const cleanMessage = AuroraBetaStyler.styleOutput({
        headerText: "Resort Clean",
        headerSymbol: "🧹",
        headerStyle: "bold",
        bodyText: "Resort cleaned! +0.1 rating, +50 EXP.",
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(cleanMessage, threadID, messageID);
      return;
    }

    // Shop
    if (action === "shop") {
      const shopMessage = AuroraBetaStyler.styleOutput({
        headerText: "Resort Shop",
        headerSymbol: "🛒",
        headerStyle: "bold",
        bodyText: "Categories:\n1. Beach Resorts\n2. Mountain Resorts\n3. Luxury Hotels\n... (20 categories)\nUse /resort buy <item> to purchase.",
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(shopMessage, threadID, messageID);
      return;
    }

    // Restore
    if (action === "restore") {
      const cooldownError = checkCooldown("restore", 3600); // 1 hour
      if (cooldownError) {
        await api.sendMessage(AuroraBetaStyler.styleOutput({
          headerText: "Resort Restore",
          headerSymbol: "⏳",
          headerStyle: "bold",
          bodyText: cooldownError,
          bodyStyle: "sansSerif",
          footerText: "",
        }), threadID, messageID);
        return;
      }
      if (userData.money < 5000) {
        const insufficient = AuroraBetaStyler.styleOutput({
          headerText: "Resort Restore",
          headerSymbol: "❌",
          headerStyle: "bold",
          bodyText: "Not enough money (5000 required).",
          bodyStyle: "sansSerif",
          footerText: "",
        });
        await api.sendMessage(insufficient, threadID, messageID);
        return;
      }
      userData.money -= 5000;
      userData.rating += 0.5;
      userData.exp += 200;
      userData.level = Math.floor(userData.exp / 1000) + 1;
      await saveResortData(db, senderID.toString(), userData);
      const restoreMessage = AuroraBetaStyler.styleOutput({
        headerText: "Resort Restore",
        headerSymbol: "🔧",
        headerStyle: "bold",
        bodyText: "Resort restored! -5000 money, +0.5 rating, +200 EXP.",
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(restoreMessage, threadID, messageID);
      return;
    }

    // Claim
    if (action === "claim") {
      const cooldownError = checkCooldown("claim", 86400); // 24 hours
      if (cooldownError) {
        await api.sendMessage(AuroraBetaStyler.styleOutput({
          headerText: "Resort Claim",
          headerSymbol: "⏳",
          headerStyle: "bold",
          bodyText: cooldownError,
          bodyStyle: "sansSerif",
          footerText: "",
        }), threadID, messageID);
        return;
      }
      const claimAmount = Math.floor(userData.profit * 0.5);
      userData.money += claimAmount;
      userData.profit = 0;
      await saveResortData(db, senderID.toString(), userData);
      const claimMessage = AuroraBetaStyler.styleOutput({
        headerText: "Resort Claim",
        headerSymbol: "💰",
        headerStyle: "bold",
        bodyText: `Claimed ${claimAmount} money from profits!`,
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(claimMessage, threadID, messageID);
      return;
    }

    // Sweep
    if (action === "sweep") {
      const cooldownError = checkCooldown("sweep");
      if (cooldownError) {
        await api.sendMessage(AuroraBetaStyler.styleOutput({
          headerText: "Resort Sweep",
          headerSymbol: "⏳",
          headerStyle: "bold",
          bodyText: cooldownError,
          bodyStyle: "sansSerif",
          footerText: "",
        }), threadID, messageID);
        return;
      }
      userData.rating += 0.05;
      userData.exp += 30;
      userData.level = Math.floor(userData.exp / 1000) + 1;
      await saveResortData(db, senderID.toString(), userData);
      const sweepMessage = AuroraBetaStyler.styleOutput({
        headerText: "Resort Sweep",
        headerSymbol: "🧹",
        headerStyle: "bold",
        bodyText: "Swept the resort! +0.05 rating, +30 EXP.",
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(sweepMessage, threadID, messageID);
      return;
    }

    // Decorate
    if (action === "decorate") {
      const cooldownError = checkCooldown("decorate", 3600);
      if (cooldownError) {
        await api.sendMessage(AuroraBetaStyler.styleOutput({
          headerText: "Resort Decorate",
          headerSymbol: "⏳",
          headerStyle: "bold",
          bodyText: cooldownError,
          bodyStyle: "sansSerif",
          footerText: "",
        }), threadID, messageID);
        return;
      }
      if (userData.money < 2000) {
        const insufficient = AuroraBetaStyler.styleOutput({
          headerText: "Resort Decorate",
          headerSymbol: "❌",
          headerStyle: "bold",
          bodyText: "Not enough money (2000 required).",
          bodyStyle: "sansSerif",
          footerText: "",
        });
        await api.sendMessage(insufficient, threadID, messageID);
        return;
      }
      userData.money -= 2000;
      userData.rating += 0.2;
      userData.exp += 100;
      userData.level = Math.floor(userData.exp / 1000) + 1;
      await saveResortData(db, senderID.toString(), userData);
      const decorateMessage = AuroraBetaStyler.styleOutput({
        headerText: "Resort Decorate",
        headerSymbol: "🎨",
        headerStyle: "bold",
        bodyText: "Decorated the resort! -2000 money, +0.2 rating, +100 EXP.",
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(decorateMessage, threadID, messageID);
      return;
    }

    // Hire
    if (action === "hire") {
      const role = args[1]?.toLowerCase() || "staff";
      const quantity = parseInt(args[2]) || 1;
      const cost = 1000 * quantity;
      if (userData.money < cost) {
        const insufficient = AuroraBetaStyler.styleOutput({
          headerText: "Resort Hire",
          headerSymbol: "❌",
          headerStyle: "bold",
          bodyText: `Not enough money (${cost} required).`,
          bodyStyle: "sansSerif",
          footerText: "",
        });
        await api.sendMessage(insufficient, threadID, messageID);
        return;
      }
      userData.money -= cost;
      userData.staff[role] = (userData.staff[role] || 0) + quantity;
      userData.exp += 50 * quantity;
      userData.level = Math.floor(userData.exp / 1000) + 1;
      await saveResortData(db, senderID.toString(), userData);
      const hireMessage = AuroraBetaStyler.styleOutput({
        headerText: "Resort Hire",
        headerSymbol: "👥",
        headerStyle: "bold",
        bodyText: `Hired ${quantity} ${role}! -${cost} money, +${50 * quantity} EXP.`,
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(hireMessage, threadID, messageID);
      return;
    }

    // Fire
    if (action === "fire") {
      const role = args[1]?.toLowerCase() || "staff";
      const quantity = parseInt(args[2]) || 1;
      if (!userData.staff[role] || userData.staff[role] < quantity) {
        const insufficient = AuroraBetaStyler.styleOutput({
          headerText: "Resort Fire",
          headerSymbol: "❌",
          headerStyle: "bold",
          bodyText: "Not enough staff in that role.",
          bodyStyle: "sansSerif",
          footerText: "",
        });
        await api.sendMessage(insufficient, threadID, messageID);
        return;
      }
      userData.staff[role] -= quantity;
      if (userData.staff[role] <= 0) delete userData.staff[role];
      userData.money += 500 * quantity; // Refund half
      await saveResortData(db, senderID.toString(), userData);
      const fireMessage = AuroraBetaStyler.styleOutput({
        headerText: "Resort Fire",
        headerSymbol: "🔥",
        headerStyle: "bold",
        bodyText: `Fired ${quantity} ${role}! +${500 * quantity} money refund.`,
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(fireMessage, threadID, messageID);
      return;
    }

    // Upgrade
    if (action === "upgrade") {
      const facility = args[1]?.toLowerCase() || "room";
      const cost = 3000;
      if (userData.money < cost) {
        const insufficient = AuroraBetaStyler.styleOutput({
          headerText: "Resort Upgrade",
          headerSymbol: "❌",
          headerStyle: "bold",
          bodyText: `Not enough money (${cost} required).`,
          bodyStyle: "sansSerif",
          footerText: "",
        });
        await api.sendMessage(insufficient, threadID, messageID);
        return;
      }
      userData.money -= cost;
      userData.facilities[facility] = (userData.facilities[facility] || 0) + 1;
      userData.exp += 150;
      userData.level = Math.floor(userData.exp / 1000) + 1;
      await saveResortData(db, senderID.toString(), userData);
      const upgradeMessage = AuroraBetaStyler.styleOutput({
        headerText: "Resort Upgrade",
        headerSymbol: "⬆️",
        headerStyle: "bold",
        bodyText: `Upgraded ${facility}! -${cost} money, +150 EXP.`,
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(upgradeMessage, threadID, messageID);
      return;
    }

    // Manage
    if (action === "manage") {
      const manageMessage = AuroraBetaStyler.styleOutput({
        headerText: "Resort Manage",
        headerSymbol: "🛠️",
        headerStyle: "bold",
        bodyText: `Current status: Guests ${userData.guests}, Staff count ${Object.values(userData.staff).reduce((a, b) => a + b, 0)}, Facilities ${Object.values(userData.facilities).reduce((a, b) => a + b, 0)}.`,
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(manageMessage, threadID, messageID);
      return;
    }

    // Guests
    if (action === "guests") {
      const guestsMessage = AuroraBetaStyler.styleOutput({
        headerText: "Resort Guests",
        headerSymbol: "👥",
        headerStyle: "bold",
        bodyText: `Current guests: ${userData.guests}.`,
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(guestsMessage, threadID, messageID);
      return;
    }

    // Revenue
    if (action === "revenue") {
      const revenueMessage = AuroraBetaStyler.styleOutput({
        headerText: "Resort Revenue",
        headerSymbol: "💵",
        headerStyle: "bold",
        bodyText: `Current revenue: ${userData.revenue}.`,
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(revenueMessage, threadID, messageID);
      return;
    }

    // Expenses
    if (action === "expenses") {
      const expensesMessage = AuroraBetaStyler.styleOutput({
        headerText: "Resort Expenses",
        headerSymbol: "💸",
        headerStyle: "bold",
        bodyText: `Current expenses: ${userData.expenses}.`,
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(expensesMessage, threadID, messageID);
      return;
    }

    // Profit
    if (action === "profit") {
      const profitMessage = AuroraBetaStyler.styleOutput({
        headerText: "Resort Profit",
        headerSymbol: "📈",
        headerStyle: "bold",
        bodyText: `Current profit: ${userData.profit}.`,
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(profitMessage, threadID, messageID);
      return;
    }

    // Rating
    if (action === "rating") {
      const ratingMessage = AuroraBetaStyler.styleOutput({
        headerText: "Resort Rating",
        headerSymbol: "⭐",
        headerStyle: "bold",
        bodyText: `Current rating: ${userData.rating.toFixed(1)}.`,
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(ratingMessage, threadID, messageID);
      return;
    }

    // Review
    if (action === "review") {
      const reviewList = userData.reviews.map(r => `${r.rating}⭐: ${r.text}`).join("\n") || "No reviews yet.";
      const reviewMessage = AuroraBetaStyler.styleOutput({
        headerText: "Resort Reviews",
        headerSymbol: "📝",
        headerStyle: "bold",
        bodyText: reviewList,
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(reviewMessage, threadID, messageID);
      return;
    }

    // Respond
    if (action === "respond") {
      const reviewIndex = parseInt(args[1]) - 1;
      const response = args.slice(2).join(" ");
      if (isNaN(reviewIndex) || !userData.reviews[reviewIndex] || !response) {
        const invalid = AuroraBetaStyler.styleOutput({
          headerText: "Resort Respond",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "Invalid review index or response. Usage: /resort respond <index> <response>",
          bodyStyle: "sansSerif",
          footerText: "",
        });
        await api.sendMessage(invalid, threadID, messageID);
        return;
      }
      userData.rating += 0.05;
      await saveResortData(db, senderID.toString(), userData);
      const respondMessage = AuroraBetaStyler.styleOutput({
        headerText: "Resort Respond",
        headerSymbol: "💬",
        headerStyle: "bold",
        bodyText: `Responded to review #${reviewIndex + 1}! +0.05 rating.`,
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(respondMessage, threadID, messageID);
      return;
    }

    // Advertise
    if (action === "advertise") {
      const cooldownError = checkCooldown("advertise", 3600);
      if (cooldownError) {
        await api.sendMessage(AuroraBetaStyler.styleOutput({
          headerText: "Resort Advertise",
          headerSymbol: "⏳",
          headerStyle: "bold",
          bodyText: cooldownError,
          bodyStyle: "sansSerif",
          footerText: "",
        }), threadID, messageID);
        return;
      }
      if (userData.money < 1500) {
        const insufficient = AuroraBetaStyler.styleOutput({
          headerText: "Resort Advertise",
          headerSymbol: "❌",
          headerStyle: "bold",
          bodyText: "Not enough money (1500 required).",
          bodyStyle: "sansSerif",
          footerText: "",
        });
        await api.sendMessage(insufficient, threadID, messageID);
        return;
      }
      userData.money -= 1500;
      userData.guests += Math.floor(Math.random() * 10) + 5;
      userData.exp += 100;
      userData.level = Math.floor(userData.exp / 1000) + 1;
      await saveResortData(db, senderID.toString(), userData);
      const advertiseMessage = AuroraBetaStyler.styleOutput({
        headerText: "Resort Advertise",
        headerSymbol: "📢",
        headerStyle: "bold",
        bodyText: `Advertised resort! -1500 money, +${userData.guests} guests, +100 EXP.`,
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(advertiseMessage, threadID, messageID);
      return;
    }

    // Discount
    if (action === "discount") {
      const cooldownError = checkCooldown("discount", 7200);
      if (cooldownError) {
        await api.sendMessage(AuroraBetaStyler.styleOutput({
          headerText: "Resort Discount",
          headerSymbol: "⏳",
          headerStyle: "bold",
          bodyText: cooldownError,
          bodyStyle: "sansSerif",
          footerText: "",
        }), threadID, messageID);
        return;
      }
      userData.guests += 10;
      userData.revenue -= 500;
      await saveResortData(db, senderID.toString(), userData);
      const discountMessage = AuroraBetaStyler.styleOutput({
        headerText: "Resort Discount",
        headerSymbol: "💸",
        headerStyle: "bold",
        bodyText: "Offered discounts! +10 guests, -500 revenue.",
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(discountMessage, threadID, messageID);
      return;
    }

    // Package
    if (action === "package") {
      const cooldownError = checkCooldown("package", 3600);
      if (cooldownError) {
        await api.sendMessage(AuroraBetaStyler.styleOutput({
          headerText: "Resort Package",
          headerSymbol: "⏳",
          headerStyle: "bold",
          bodyText: cooldownError,
          bodyStyle: "sansSerif",
          footerText: "",
        }), threadID, messageID);
        return;
      }
      if (userData.money < 1000) {
        const insufficient = AuroraBetaStyler.styleOutput({
          headerText: "Resort Package",
          headerSymbol: "❌",
          headerStyle: "bold",
          bodyText: "Not enough money (1000 required).",
          bodyStyle: "sansSerif",
          footerText: "",
        });
        await api.sendMessage(insufficient, threadID, messageID);
        return;
      }
      userData.money -= 1000;
      userData.guests += 8;
      userData.revenue += 1200;
      userData.exp += 80;
      userData.level = Math.floor(userData.exp / 1000) + 1;
      await saveResortData(db, senderID.toString(), userData);
      const packageMessage = AuroraBetaStyler.styleOutput({
        headerText: "Resort Package",
        headerSymbol: "📦",
        headerStyle: "bold",
        bodyText: "Created guest packages! -1000 money, +8 guests, +1200 revenue, +80 EXP.",
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(packageMessage, threadID, messageID);
      return;
    }

    // Event
    if (action === "event") {
      const cooldownError = checkCooldown("event", 7200);
      if (cooldownError) {
        await api.sendMessage(AuroraBetaStyler.styleOutput({
          headerText: "Resort Event",
          headerSymbol: "⏳",
          headerStyle: "bold",
          bodyText: cooldownError,
          bodyStyle: "sansSerif",
          footerText: "",
        }), threadID, messageID);
        return;
      }
      if (userData.money < 3000) {
        const insufficient = AuroraBetaStyler.styleOutput({
          headerText: "Resort Event",
          headerSymbol: "❌",
          headerStyle: "bold",
          bodyText: "Not enough money (3000 required).",
          bodyStyle: "sansSerif",
          footerText: "",
        });
        await api.sendMessage(insufficient, threadID, messageID);
        return;
      }
      userData.money -= 3000;
      userData.guests += 15;
      userData.rating += 0.3;
      userData.exp += 150;
      userData.level = Math.floor(userData.exp / 1000) + 1;
      await saveResortData(db, senderID.toString(), userData);
      const eventMessage = AuroraBetaStyler.styleOutput({
        headerText: "Resort Event",
        headerSymbol: "🎉",
        headerStyle: "bold",
        bodyText: "Hosted an event! -3000 money, +15 guests, +0.3 rating, +150 EXP.",
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(eventMessage, threadID, messageID);
      return;
    }

    // Catering
    if (action === "catering") {
      const cooldownError = checkCooldown("catering");
      if (cooldownError) {
        await api.sendMessage(AuroraBetaStyler.styleOutput({
          headerText: "Resort Catering",
          headerSymbol: "⏳",
          headerStyle: "bold",
          bodyText: cooldownError,
          bodyStyle: "sansSerif",
          footerText: "",
        }), threadID, messageID);
        return;
      }
      if (userData.money < 2000) {
        const insufficient = AuroraBetaStyler.styleOutput({
          headerText: "Resort Catering",
          headerSymbol: "❌",
          headerStyle: "bold",
          bodyText: "Not enough money (2000 required).",
          bodyStyle: "sansSerif",
          footerText: "",
        });
        await api.sendMessage(insufficient, threadID, messageID);
        return;
      }
      userData.money -= 2000;
      userData.revenue += 2500;
      userData.exp += 100;
      userData.level = Math.floor(userData.exp / 1000) + 1;
      await saveResortData(db, senderID.toString(), userData);
      const cateringMessage = AuroraBetaStyler.styleOutput({
        headerText: "Resort Catering",
        headerSymbol: "🍽️",
        headerStyle: "bold",
        bodyText: "Provided catering! -2000 money, +2500 revenue, +100 EXP.",
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(cateringMessage, threadID, messageID);
      return;
    }

    // Spa
    if (action === "spa") {
      const cooldownError = checkCooldown("spa", 3600);
      if (cooldownError) {
        await api.sendMessage(AuroraBetaStyler.styleOutput({
          headerText: "Resort Spa",
          headerSymbol: "⏳",
          headerStyle: "bold",
          bodyText: cooldownError,
          bodyStyle: "sansSerif",
          footerText: "",
        }), threadID, messageID);
        return;
      }
      if (userData.money < 4000) {
        const insufficient = AuroraBetaStyler.styleOutput({
          headerText: "Resort Spa",
          headerSymbol: "❌",
          headerStyle: "bold",
          bodyText: "Not enough money (4000 required).",
          bodyStyle: "sansSerif",
          footerText: "",
        });
        await api.sendMessage(insufficient, threadID, messageID);
        return;
      }
      userData.money -= 4000;
      userData.facilities["spa"] = (userData.facilities["spa"] || 0) + 1;
      userData.rating += 0.4;
      userData.exp += 200;
      userData.level = Math.floor(userData.exp / 1000) + 1;
      await saveResortData(db, senderID.toString(), userData);
      const spaMessage = AuroraBetaStyler.styleOutput({
        headerText: "Resort Spa",
        headerSymbol: "🛀",
        headerStyle: "bold",
        bodyText: "Added spa services! -4000 money, +0.4 rating, +200 EXP.",
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(spaMessage, threadID, messageID);
      return;
    }

    // Fitness
    if (action === "fitness") {
      const cooldownError = checkCooldown("fitness", 3600);
      if (cooldownError) {
        await api.sendMessage(AuroraBetaStyler.styleOutput({
          headerText: "Resort Fitness",
          headerSymbol: "⏳",
          headerStyle: "bold",
          bodyText: cooldownError,
          bodyStyle: "sansSerif",
          footerText: "",
        }), threadID, messageID);
        return;
      }
      if (userData.money < 3500) {
        const insufficient = AuroraBetaStyler.styleOutput({
          headerText: "Resort Fitness",
          headerSymbol: "❌",
          headerStyle: "bold",
          bodyText: "Not enough money (3500 required).",
          bodyStyle: "sansSerif",
          footerText: "",
        });
        await api.sendMessage(insufficient, threadID, messageID);
        return;
      }
      userData.money -= 3500;
      userData.facilities["fitness"] = (userData.facilities["fitness"] || 0) + 1;
      userData.rating += 0.3;
      userData.exp += 180;
      userData.level = Math.floor(userData.exp / 1000) + 1;
      await saveResortData(db, senderID.toString(), userData);
      const fitnessMessage = AuroraBetaStyler.styleOutput({
        headerText: "Resort Fitness",
        headerSymbol: "🏋️",
        headerStyle: "bold",
        bodyText: "Added fitness facilities! -3500 money, +0.3 rating, +180 EXP.",
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(fitnessMessage, threadID, messageID);
      return;
    }

    // Pool
    if (action === "pool") {
      const cooldownError = checkCooldown("pool");
      if (cooldownError) {
        await api.sendMessage(AuroraBetaStyler.styleOutput({
          headerText: "Resort Pool",
          headerSymbol: "⏳",
          headerStyle: "bold",
          bodyText: cooldownError,
          bodyStyle: "sansSerif",
          footerText: "",
        }), threadID, messageID);
        return;
      }
      userData.rating += 0.2;
      userData.exp += 60;
      userData.level = Math.floor(userData.exp / 1000) + 1;
      await saveResortData(db, senderID.toString(), userData);
      const poolMessage = AuroraBetaStyler.styleOutput({
        headerText: "Resort Pool",
        headerSymbol: "🏊",
        headerStyle: "bold",
        bodyText: "Maintained pool! +0.2 rating, +60 EXP.",
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(poolMessage, threadID, messageID);
      return;
    }

    // Beach
    if (action === "beach") {
      const cooldownError = checkCooldown("beach");
      if (cooldownError) {
        await api.sendMessage(AuroraBetaStyler.styleOutput({
          headerText: "Resort Beach",
          headerSymbol: "⏳",
          headerStyle: "bold",
          bodyText: cooldownError,
          bodyStyle: "sansSerif",
          footerText: "",
        }), threadID, messageID);
        return;
      }
      userData.guests += 5;
      userData.exp += 70;
      userData.level = Math.floor(userData.exp / 1000) + 1;
      await saveResortData(db, senderID.toString(), userData);
      const beachMessage = AuroraBetaStyler.styleOutput({
        headerText: "Resort Beach",
        headerSymbol: "🏖️",
        headerStyle: "bold",
        bodyText: "Managed beach activities! +5 guests, +70 EXP.",
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(beachMessage, threadID, messageID);
      return;
    }

    // Activities
    if (action === "activities") {
      const cooldownError = checkCooldown("activities", 3600);
      if (cooldownError) {
        await api.sendMessage(AuroraBetaStyler.styleOutput({
          headerText: "Resort Activities",
          headerSymbol: "⏳",
          headerStyle: "bold",
          bodyText: cooldownError,
          bodyStyle: "sansSerif",
          footerText: "",
        }), threadID, messageID);
        return;
      }
      if (userData.money < 2500) {
        const insufficient = AuroraBetaStyler.styleOutput({
          headerText: "Resort Activities",
          headerSymbol: "❌",
          headerStyle: "bold",
          bodyText: "Not enough money (2500 required).",
          bodyStyle: "sansSerif",
          footerText: "",
        });
        await api.sendMessage(insufficient, threadID, messageID);
        return;
      }
      userData.money -= 2500;
      userData.guests += 12;
      userData.rating += 0.25;
      userData.exp += 120;
      userData.level = Math.floor(userData.exp / 1000) + 1;
      await saveResortData(db, senderID.toString(), userData);
      const activitiesMessage = AuroraBetaStyler.styleOutput({
        headerText: "Resort Activities",
        headerSymbol: "🎾",
        headerStyle: "bold",
        bodyText: "Offered activities! -2500 money, +12 guests, +0.25 rating, +120 EXP.",
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(activitiesMessage, threadID, messageID);
      return;
    }

    // Tour
    if (action === "tour") {
      const cooldownError = checkCooldown("tour", 3600);
      if (cooldownError) {
        await api.sendMessage(AuroraBetaStyler.styleOutput({
          headerText: "Resort Tour",
          headerSymbol: "⏳",
          headerStyle: "bold",
          bodyText: cooldownError,
          bodyStyle: "sansSerif",
          footerText: "",
        }), threadID, messageID);
        return;
      }
      if (userData.money < 1800) {
        const insufficient = AuroraBetaStyler.styleOutput({
          headerText: "Resort Tour",
          headerSymbol: "❌",
          headerStyle: "bold",
          bodyText: "Not enough money (1800 required).",
          bodyStyle: "sansSerif",
          footerText: "",
        });
        await api.sendMessage(insufficient, threadID, messageID);
        return;
      }
      userData.money -= 1800;
      userData.guests += 7;
      userData.revenue += 2000;
      userData.exp += 90;
      userData.level = Math.floor(userData.exp / 1000) + 1;
      await saveResortData(db, senderID.toString(), userData);
      const tourMessage = AuroraBetaStyler.styleOutput({
        headerText: "Resort Tour",
        headerSymbol: "🚌",
        headerStyle: "bold",
        bodyText: "Provided tours! -1800 money, +7 guests, +2000 revenue, +90 EXP.",
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(tourMessage, threadID, messageID);
      return;
    }

    // Transportation
    if (action === "transportation") {
      const cooldownError = checkCooldown("transportation", 7200);
      if (cooldownError) {
        await api.sendMessage(AuroraBetaStyler.styleOutput({
          headerText: "Resort Transportation",
          headerSymbol: "⏳",
          headerStyle: "bold",
          bodyText: cooldownError,
          bodyStyle: "sansSerif",
          footerText: "",
        }), threadID, messageID);
        return;
      }
      if (userData.money < 5000) {
        const insufficient = AuroraBetaStyler.styleOutput({
          headerText: "Resort Transportation",
          headerSymbol: "❌",
          headerStyle: "bold",
          bodyText: "Not enough money (5000 required).",
          bodyStyle: "sansSerif",
          footerText: "",
        });
        await api.sendMessage(insufficient, threadID, messageID);
        return;
      }
      userData.money -= 5000;
      userData.guests += 20;
      userData.rating += 0.5;
      userData.exp += 250;
      userData.level = Math.floor(userData.exp / 1000) + 1;
      await saveResortData(db, senderID.toString(), userData);
      const transportationMessage = AuroraBetaStyler.styleOutput({
        headerText: "Resort Transportation",
        headerSymbol: "🚗",
        headerStyle: "bold",
        bodyText: "Offered transportation! -5000 money, +20 guests, +0.5 rating, +250 EXP.",
        bodyStyle: "sansSerif",
        footerText: "",
      });
      await api.sendMessage(transportationMessage, threadID, messageID);
      return;
    }

    // Fallback for unknown command
    const invalid = AuroraBetaStyler.styleOutput({
      headerText: "Resort Management",
      headerSymbol: "⚠️",
      headerStyle: "bold",
      bodyText: "Invalid command. Use /resort for help.",
      bodyStyle: "sansSerif",
      footerText: "",
    });
    await api.sendMessage(invalid, threadID, messageID);
  },
};

async function getResortData(db: any, userID: string): Promise<ResortData> {
  const resortsCollection = db.db("resorts");
  let userData = await resortsCollection.findOne({ userID });
  if (!userData) {
    userData = {
      userID,
      resortName: undefined,
      level: 1,
      money: 0,
      exp: 0,
      rank: "E",
      staff: {},
      facilities: {},
      guests: 0,
      rating: 0,
      reviews: [],
      revenue: 0,
      expenses: 0,
      profit: 0,
      inventory: { supplies: {} },
      cooldowns: {},
      hasChangedName: false,
    };
    await saveResortData(db, userID, userData);
  }
  return userData;
}

async function saveResortData(db: any, userID: string, data: ResortData): Promise<void> {
  const resortsCollection = db.db("resorts");
  await resortsCollection.updateOne(
    { userID },
    { $set: data },
    { upsert: true }
  );
}

export default resortCommand;