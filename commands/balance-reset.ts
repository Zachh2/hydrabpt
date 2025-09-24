import AuroraBetaStyler from '@aurora/styler';

const balanceResetCommand = {
  config: {
    name: "balance-reset",
    author: "Aljur Pogoy",
    version: "3.0.0",
    description: "Reset a user's coin balance to zero (Admin only). Usage: #resetbalance <uid>",
  },
  run: async ({ api, event, args, db, admins, usersData, prefix }: ShadowBot.CommandContext) => {
    const { threadID, messageID, senderID } = event;

    if (!admins.includes(senderID)) {
      return api.sendMessage(AuroraBetaStyler.styleOutput({
        headerText: 'Reset Balance',
        headerSymbol: '💰',
        headerStyle: 'bold',
        bodyText: 'Only admins can use this command.\n\n> Thank you for using our Chatbot',
        bodyStyle: 'sansSerif',
        footerText: '',
      }), threadID, messageID);
    }

    if (!args[0]) {
      return api.sendMessage(AuroraBetaStyler.styleOutput({
        headerText: 'Reset Balance',
        headerSymbol: '💰',
        headerStyle: 'bold',
        bodyText: `Usage: ${prefix}balance-reset <uid>\nExample: ${prefix}balance-reset 1234567890\n\n> Thank you for using our Chatbot`,
        bodyStyle: 'sansSerif',
        footerText: '',
      }), threadID, messageID);
    }

    const targetUID = args[0];

    let userData = usersData.get(targetUID) || {};

    if (db) {
      const userDoc = await db.db("users").findOne({ userId: targetUID });
      userData = userDoc?.data || {};
    }

    if (!userData.hasOwnProperty("balance")) {
      return api.sendMessage(AuroraBetaStyler.styleOutput({
        headerText: 'Reset Balance',
        headerSymbol: '💰',
        headerStyle: 'bold',
        bodyText: `UID ${targetUID} has no balance data to reset.\n\n> Thank you for using our Chatbot`,
        bodyStyle: 'sansSerif',
        footerText: '',
      }), threadID, messageID);
    }

    userData.balance = 0;
    userData.bank = 0;
    usersData.set(targetUID, userData);

    if (db) {
      await db.db("users").updateOne(
        { userId: targetUID },
        { $set: { userId: targetUID, data: userData } },
        { upsert: true }
      );
    }

    return api.sendMessage(AuroraBetaStyler.styleOutput({
      headerText: 'Reset Balance',
      headerSymbol: '💰',
      headerStyle: 'bold',
      bodyText: `Balance reset for UID ${targetUID}.\n\n> Thank you for using our Chatbot`,
      bodyStyle: 'sansSerif',
      footerText: '',
    }), threadID, messageID);
  },
};

export default balanceResetCommand;