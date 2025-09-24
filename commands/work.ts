import AuroraBetaStyler from '@aurora/styler';

module.exports = {
  config: {
    name: "work",
    author: "Aljur Pogoy",
    description: "Earn coins by working! (Cooldown: 1 hour)",
    cooldown: 3600,
  },
  async run({ api, event, usersData }: { api: any; event: any; usersData: Map<string, ShadowBot.UserData> }) {
    const { threadID, messageID, senderID } = event;
    try {
      let user = usersData.get(senderID) || { balance: 0, bank: 0, lastWork: 0 };
      user.balance = user.balance || 0;
      user.bank = user.bank || 0;
      user.lastWork = user.lastWork || 0;
      usersData.set(senderID, user);

      const now = Date.now();
      const cooldown = 3600 * 1000;
      if (now - user.lastWork < cooldown) {
        const remaining = Math.ceil((cooldown - (now - user.lastWork)) / (1000 * 60));
        const cooldownMessage = AuroraBetaStyler.styleOutput({
          headerText: 'Work',
          headerStyle: 'bold',
          bodyText: `❌ You must wait ${remaining} minutes before working again!`,
          bodyStyle: 'sansSerif',
          footerText: '',
        });
        return api.sendMessage(cooldownMessage, threadID, messageID);
      }

      const earnings = Math.floor(Math.random() * 100) + 100;
      user.balance += earnings;
      user.lastWork = now;
      usersData.set(senderID, user);

      const message = AuroraBetaStyler.styleOutput({
        headerText: 'Work',
        headerStyle: 'bold',
        bodyText: `✅ You earned ${earnings} coins from work!\nBalance: ${user.balance} coins`,
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      api.sendMessage(message, threadID, messageID);
    } catch (error) {
      console.error("『 🌙 』 Error in work command:", error);
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Work',
        headerStyle: 'bold',
        bodyText: '❌ An error occurred while working.',
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      api.sendMessage(errorMessage, threadID, messageID);
    }
  },
};