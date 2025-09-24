import AuroraBetaStyler from '@aurora/styler';

module.exports = {
  config: {
    name: "boxing",
    description: "Manage boxing activities with subcommands: fight, surrender, training, register",
    usage: "/boxing <fight|surrender|training|register> [UID/name]",
    aliases: ["box"],
    category: "Games",
    version: "1.0.0",
    author: "Aljur Pogoy",
  },
  async run({ api, event, args, usersData }: { api: any; event: any; args: string[]; usersData: Map<string, ShadowBot.UserData> }) {
    const { threadID, messageID, senderID } = event;
    let user = usersData.get(senderID) || { balance: 0, bank: 0, strength: 0, stamina: 10, lastTraining: 0, inFight: null, boxing_account: null };
    user.balance = user.balance || 0;
    user.bank = user.bank || 0;
    user.strength = user.strength || 0;
    user.stamina = user.stamina || 10;
    user.lastTraining = user.lastTraining || 0;
    user.inFight = user.inFight || null;
    user.boxing_account = user.boxing_account || null;
    usersData.set(senderID, user);

    const subcommand = args[0]?.toLowerCase();
    const targetUID = args[1];
    const name = args.slice(1).join(" ").trim();

    const styledMessage = (header: string, body: string, symbol: string) => AuroraBetaStyler.styleOutput({
      headerText: header,
      headerSymbol: symbol,
      headerStyle: "bold",
      bodyText: body,
      bodyStyle: "sansSerif",
      footerText: "",
    });

    const trainingSuccessMessage = styledMessage("Boxing", `✅ Trained successfully!\nStrength: ${user.strength}\nStamina: ${user.stamina}`, "🥊");

    if (!subcommand) {
      const helpMessage = styledMessage("Boxing", "📋 Subcommands:\n- /boxing fight <UID>: Challenge a user to a fight\n- /boxing surrender: Surrender from an ongoing fight\n- /boxing training: Train to increase strength and stamina\n- /boxing register <name>: Register your boxing name", "🥊");
      return api.sendMessage(helpMessage, threadID, messageID);
    }

    switch (subcommand) {
      case "register":
        console.log(`Register attempt for UID ${senderID}: Initial user.boxing_account = ${user.boxing_account}`);
        if (!name) {
          const errorMessage = styledMessage("Boxing", "❌ Please provide a name!\nUsage: /boxing register <name>\nExample: /boxing register AljurDev", "🥊");
          return api.sendMessage(errorMessage, threadID, messageID);
        }
        if (user.boxing_account) {
          const errorMessage = styledMessage("Boxing", `❌ You are already registered as ${user.boxing_account}!`, "🥊");
          return api.sendMessage(errorMessage, threadID, messageID);
        }
        user.boxing_account = name;
        usersData.set(senderID, user);
        const successMessage = styledMessage("Boxing", `✅ Successfully registered as ${name}! You can now fight with your boxing name displayed.`, "🥊");
        api.sendMessage(successMessage, threadID, messageID);
        break;

      case "fight":
        if (!targetUID) {
          const errorMessage = styledMessage("Boxing", "❌ Please provide a target UID!\nUsage: /boxing fight <UID>", "🥊");
          return api.sendMessage(errorMessage, threadID, messageID);
        }
        if (targetUID === senderID) {
          const errorMessage = styledMessage("Boxing", "❌ You cannot fight yourself!", "🥊");
          return api.sendMessage(errorMessage, threadID, messageID);
        }
        if (user.inFight) {
          const errorMessage = styledMessage("Boxing", `❌ You are already in a fight with UID ${user.inFight}!`, "🥊");
          return api.sendMessage(errorMessage, threadID, messageID);
        }

        api.getUserInfo(targetUID, (err, info) => {
          if (err || !info[targetUID]) {
            const errorMessage = styledMessage("Boxing", `❌ UID ${targetUID} is not a valid user!`, "🥊");
            return api.sendMessage(errorMessage, threadID, messageID);
          }

          const opponent = usersData.get(targetUID);
          if (!opponent || opponent.stamina === undefined || opponent.strength === undefined) {
            const errorMessage = styledMessage("Boxing", `❌ ${info[targetUID].name} (UID ${targetUID}) is not a valid opponent or hasn’t trained yet!`, "🥊");
            return api.sendMessage(errorMessage, threadID, messageID);
          }
          if (opponent.inFight) {
            const errorMessage = styledMessage("Boxing", `❌ ${info[targetUID].name} (UID ${targetUID}) is already in a fight!`, "🥊");
            return api.sendMessage(errorMessage, threadID, messageID);
          }
          if (user.stamina < 5) {
            const errorMessage = styledMessage("Boxing", "❌ You don’t have enough stamina (minimum 5 required)!", "🥊");
            return api.sendMessage(errorMessage, threadID, messageID);
          }

          user.inFight = targetUID;
          user.stamina -= 5;
          usersData.set(senderID, user);
          opponent.inFight = senderID;
          opponent.stamina -= 5;
          usersData.set(targetUID, opponent);

          let sentMessageID: string;
          const opponentName = opponent.boxing_account || info[targetUID].name;
          api.sendMessage(styledMessage("Boxing", `🏆 Fight started with ${opponentName} (UID ${targetUID})!\nYour Strength: ${user.strength}\nYour Stamina: ${user.stamina}\nReply 'attack' to strike or 'surrender' to give up.`, "🥊"), threadID, (err: any, info: any) => {
            sentMessageID = info?.messageID;
          }, messageID);

          if (!global.Kagenou.replyListeners) global.Kagenou.replyListeners = new Map();
          global.Kagenou.replyListeners.set(sentMessageID, {
            callback: async ({ api, event }) => {
              const { threadID: replyThreadID, messageID: replyMessageID, body, messageReply } = event;
              if (replyThreadID !== threadID || !messageReply || messageReply.messageID !== sentMessageID) return;
              if (body.toLowerCase() === "attack") {
                const damage = Math.floor(Math.random() * (user.strength + 1));
                opponent.stamina = Math.max(0, opponent.stamina - damage);
                usersData.set(targetUID, opponent);
                const result = damage > 0 ? `💥 You dealt ${damage} damage! ${opponentName}'s stamina: ${opponent.stamina}` : "😞 Missed the hit!";
                await api.sendMessage(styledMessage("Boxing", result, "🥊"), threadID, replyMessageID);
                if (opponent.stamina <= 0) {
                  user.inFight = null;
                  user.stamina = Math.min(10, user.stamina + 2);
                  user.balance += 100;
                  usersData.set(senderID, user);
                  opponent.inFight = null;
                  usersData.set(targetUID, opponent);
                  await api.sendMessage(styledMessage("Boxing", `🎉 You won against ${opponentName}! +100 coins. Your balance: ${user.balance} coins`, "🥊"), threadID, replyMessageID);
                }
              } else if (body.toLowerCase() === "surrender") {
                user.inFight = null;
                user.stamina = Math.min(10, user.stamina + 1);
                usersData.set(senderID, user);
                opponent.inFight = null;
                usersData.set(targetUID, opponent);
                await api.sendMessage(styledMessage("Boxing", `🏳️ You surrendered from the fight with ${opponentName}.`, "🥊"), threadID, replyMessageID);
              }
              global.Kagenou.replyListeners.delete(sentMessageID);
            }
          });
        });
        break;

      case "surrender":
  if (!user.inFight) {
    const errorMessage = styledMessage("Boxing", "❌ You are not in a fight to surrender!", "🥊");
    return api.sendMessage(errorMessage, threadID, messageID);
  }

  const promptMessage = styledMessage("Boxing", "🏳️ Are you sure you want to surrender? Reply 'yes' to confirm.", "🥊");

  const info: any = await new Promise(resolve => {
    api.sendMessage(promptMessage, threadID, (err, info) => {
      resolve(info);
    }, messageID);
  });

  const sentMessageID2 = info.messageID;

  if (!global.Kagenou.replyListeners) global.Kagenou.replyListeners = new Map();

  global.Kagenou.replyListeners.set(sentMessageID2, {
    callback: async ({ api, event }) => {
      const { threadID: replyThreadID, messageID: replyMessageID, body, messageReply } = event;
      if (replyThreadID !== threadID || !messageReply || messageReply.messageID !== sentMessageID2) return;

      if (body.toLowerCase() === "yes") {
        const opponent = usersData.get(user.inFight);
        const opponentInfo = await api.getUserInfo([user.inFight]);
        const opponentName = opponent?.boxing_account || opponentInfo[user.inFight]?.name || `UID ${user.inFight}`;

        user.inFight = null;
        user.stamina = Math.min(10, user.stamina + 1);
        usersData.set(senderID, user);

        if (opponent) {
          opponent.inFight = null;
          usersData.set(user.inFight, opponent); // 🟡 This might be buggy if user.inFight is now null
        }

        await api.sendMessage(styledMessage("Boxing", `🏳️ You have surrendered from the fight with ${opponentName}.`, "🥊"), threadID, replyMessageID);
      }

      global.Kagenou.replyListeners.delete(sentMessageID2);
    }
  });
  break;
      case "training":
        const now = Date.now();
        const cooldown = 3600000;
        if (now - (user.lastTraining || 0) < cooldown) {
          const timeLeft = Math.ceil((cooldown - (now - (user.lastTraining || 0))) / 60000);
          const errorMessage = styledMessage("Boxing", `❌ Training cooldown! Wait ${timeLeft} more minutes.`, "🥊");
          return api.sendMessage(errorMessage, threadID, messageID);
        }
        user.strength = Math.min(100, (user.strength || 0) + 5);
        user.stamina = Math.min(10, (user.stamina || 0) + 2);
        user.lastTraining = now;
        usersData.set(senderID, user);
        api.sendMessage(trainingSuccessMessage, threadID, messageID);
        break;

      default:
        const errorMessage = styledMessage("Boxing", "❌ Invalid subcommand! Use: fight, surrender, training, or register", "🥊");
        api.sendMessage(errorMessage, threadID, messageID);
    }
  },
};