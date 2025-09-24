import AuroraBetaStyler from '@aurora/styler';

module.exports = {
  config: {
    name: "user",
    author: "Aljur Pogoy",
    version: "3.0.0",
    description: "Manage users (ban, unban, give coins) - Admin only",
    category: "Admin",
    role: 3,
  },
  async run({ api, event, args, admins, usersData, db }) {
    const { threadID, messageID } = event;

    if (!db) {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: 'User',
        headerStyle: 'bold',
        bodyText: '❌ Database is not initialized. Please contact the bot administrator.',
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      return api.sendMessage(errorMessage, threadID, messageID);
    }

    const bannedUsersCollection = db.db("bannedUsers");
    const usersCollection = db.db("users");

    // Handle "ban list" first
    if (args[0]?.toLowerCase() === "ban" && args[1]?.toLowerCase() === "list") {
      try {
        const bannedUsers = await bannedUsersCollection.find({}).toArray();
        if (bannedUsers.length === 0) {
          const noBansMessage = AuroraBetaStyler.styleOutput({
            headerText: 'User',
            headerStyle: 'bold',
            bodyText: '✅ No users are currently banned.',
            bodyStyle: 'sansSerif',
            footerText: '',
          });
          return api.sendMessage(noBansMessage, threadID, messageID);
        }

        const banList = bannedUsers.map(user =>
          `UID: ${user.userId}\nReason: ${user.reason}\nBanned At: ${new Date(user.bannedAt).toLocaleString()}\n---`
        ).join("\n");

        const listMessage = AuroraBetaStyler.styleOutput({
          headerText: 'User',
          headerStyle: 'bold',
          bodyText: `✅ Banned Users:\n${banList}`,
          bodyStyle: 'sansSerif',
          footerText: '',
        });
        return api.sendMessage(listMessage, threadID, messageID);
      } catch (error) {
        console.error("[USER] Error fetching ban list:", error);
        const errorMessage = AuroraBetaStyler.styleOutput({
          headerText: 'User',
          headerStyle: 'bold',
          bodyText: '❌ Failed to fetch ban list due to a database error.',
          bodyStyle: 'sansSerif',
          footerText: '',
        });
        return api.sendMessage(errorMessage, threadID, messageID);
      }
    }

    // Validate minimum arguments for other actions
    if (args.length < 2) {
      const usageMessage = AuroraBetaStyler.styleOutput({
        headerText: 'User',
        headerStyle: 'bold',
        bodyText: '❌ Usage: /user <action> <UID> [reason/amount]\nActions: ban, unban, give, ban list\nExample: /user ban 1234567890 Spamming\n/user give 1234567890 100\n/user ban list',
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      return api.sendMessage(usageMessage, threadID, messageID);
    }

    const action = args[0].toLowerCase();
    const targetUID = args[1];

    switch (action) {
      case "ban": {
        if (args.length < 3) {
          const errorMessage = AuroraBetaStyler.styleOutput({
            headerText: 'User',
            headerStyle: 'bold',
            bodyText: '❌ Please provide a reason for banning.\nUsage: /user ban <UID> <reason>',
            bodyStyle: 'sansSerif',
            footerText: '',
          });
          return api.sendMessage(errorMessage, threadID, messageID);
        }

        const reason = args.slice(2).join(" ");
        try {
          await bannedUsersCollection.updateOne(
            { userId: targetUID },
            { $set: { userId: targetUID, reason, bannedAt: Date.now() } },
            { upsert: true }
          );

          const banMessage = AuroraBetaStyler.styleOutput({
            headerText: 'User',
            headerStyle: 'bold',
            bodyText: `✅ Successfully banned UID ${targetUID}.\nReason: ${reason} 🚫`,
            bodyStyle: 'sansSerif',
            footerText: '',
          });
          return api.sendMessage(banMessage, threadID, messageID);
        } catch (error) {
          console.error(`[USER] Error banning user ${targetUID}:`, error);
          const errorMessage = AuroraBetaStyler.styleOutput({
            headerText: 'User',
            headerStyle: 'bold',
            bodyText: '❌ Failed to ban user due to a database error.',
            bodyStyle: 'sansSerif',
            footerText: '',
          });
          return api.sendMessage(errorMessage, threadID, messageID);
        }
      }

      case "unban": {
        try {
          const bannedUser = await bannedUsersCollection.findOne({ userId: targetUID });
          if (!bannedUser) {
            const errorMessage = AuroraBetaStyler.styleOutput({
              headerText: 'User',
              headerStyle: 'bold',
              bodyText: `❌ UID ${targetUID} is not banned.`,
              bodyStyle: 'sansSerif',
              footerText: '',
            });
            return api.sendMessage(errorMessage, threadID, messageID);
          }

          await bannedUsersCollection.deleteOne({ userId: targetUID });

          const unbanMessage = AuroraBetaStyler.styleOutput({
            headerText: 'User',
            headerStyle: 'bold',
            bodyText: `✅ Successfully unbanned UID ${targetUID}. ✅`,
            bodyStyle: 'sansSerif',
            footerText: '',
          });
          return api.sendMessage(unbanMessage, threadID, messageID);
        } catch (error) {
          console.error(`[USER] Error unbanning user ${targetUID}:`, error);
          const errorMessage = AuroraBetaStyler.styleOutput({
            headerText: 'User',
            headerStyle: 'bold',
            bodyText: '❌ Failed to unban user due to a database error.',
            bodyStyle: 'sansSerif',
            footerText: '',
          });
          return api.sendMessage(errorMessage, threadID, messageID);
        }
      }

      case "give": {
        if (args.length < 3 || isNaN(parseInt(args[2]))) {
          const errorMessage = AuroraBetaStyler.styleOutput({
            headerText: 'User',
            headerStyle: 'bold',
            bodyText: '❌ Please provide a valid amount of coins.\nUsage: /user give <UID> <amount>',
            bodyStyle: 'sansSerif',
            footerText: '',
          });
          return api.sendMessage(errorMessage, threadID, messageID);
        }

        const amount = parseInt(args[2]);
        if (amount <= 0) {
          const errorMessage = AuroraBetaStyler.styleOutput({
            headerText: 'User',
            headerStyle: 'bold',
            bodyText: '❌ Amount must be greater than 0.',
            bodyStyle: 'sansSerif',
            footerText: '',
          });
          return api.sendMessage(errorMessage, threadID, messageID);
        }

        try {
          let userData = usersData.get(targetUID) || { balance: 0, bank: 0, lastWork: 0, car: null, carCondition: 100 };
          userData.balance = (userData.balance || 0) + amount;
          usersData.set(targetUID, userData);

          await usersCollection.updateOne(
            { userId: targetUID },
            { $set: { userId: targetUID, data: userData } },
            { upsert: true }
          );

          const giveMessage = AuroraBetaStyler.styleOutput({
            headerText: 'User',
            headerStyle: 'bold',
            bodyText: `✅ Gave ${amount} coins to UID ${targetUID}. 💰\nNew wallet balance: ${userData.balance} coins.`,
            bodyStyle: 'sansSerif',
            footerText: '',
          });
          return api.sendMessage(giveMessage, threadID, messageID);
        } catch (error) {
          console.error(`[USER] Error giving coins to user ${targetUID}:`, error);
          const errorMessage = AuroraBetaStyler.styleOutput({
            headerText: 'User',
            headerStyle: 'bold',
            bodyText: '❌ Failed to give coins due to a database error.',
            bodyStyle: 'sansSerif',
            footerText: '',
          });
          return api.sendMessage(errorMessage, threadID, messageID);
        }
      }

      default: {
        const errorMessage = AuroraBetaStyler.styleOutput({
          headerText: 'User',
          headerStyle: 'bold',
          bodyText: '❌ Invalid action. Available actions: ban, unban, give, ban list\nUsage: /user <action> <UID> [reason/amount]',
          bodyStyle: 'sansSerif',
          footerText: '',
        });
        return api.sendMessage(errorMessage, threadID, messageID);
      }
    }
  },
};