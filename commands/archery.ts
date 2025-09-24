import AuroraBetaStyler from '@aurora/styler';

module.exports = {
  config: {
    name: "archery",
    author: "Aljur Pogoy",
    description: "Play an archery game to earn coins!",
    cooldown: 30,
  },
  async run({ api, event, usersData }: { api: any; event: any; usersData: Map<string, ShadowBot.UserData> }) {
    const { threadID, messageID, senderID } = event;
    try {
      let user = usersData.get(senderID) || { balance: 0, bank: 0 };
      user.balance = user.balance || 0;
      user.bank = user.bank || 0;
      usersData.set(senderID, user);

      const bet = 20;
      if (user.balance < bet) {
        const errorMessage = AuroraBetaStyler.styleOutput({
          headerText: 'Archery',
          headerStyle: 'bold',
          bodyText: `❌ Insufficient balance! You need ${bet} coins to play. Current: ${user.balance} coins`,
          bodyStyle: 'sansSerif',
          footerText: '',
        });
        return api.sendMessage(errorMessage, threadID, messageID);
      }

      user.balance -= bet;
      const accuracy = Math.random();
      let earnings = 0;

      if (accuracy > 0.8) {
        earnings = bet * 5;
        user.balance += earnings;
      } else if (accuracy > 0.5) {
        earnings = bet * 2;
        user.balance += earnings;
      }

      usersData.set(senderID, user);
      const message = AuroraBetaStyler.styleOutput({
        headerText: 'Archery',
        headerStyle: 'bold',
        bodyText: `🎯 Accuracy: ${Math.round(accuracy * 100)}%\n${earnings > 0 ? `🎉 You earned ${earnings} coins!` : '😔 Missed the target.'}\nBalance: ${user.balance} coins`,
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      api.sendMessage(message, threadID, messageID);
    } catch (error) {
      console.error("『 🌙 』 Error in archery command:", error);
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Archery',
        headerStyle: 'bold',
        bodyText: '❌ An error occurred while playing archery.',
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      api.sendMessage(errorMessage, threadID, messageID);
    }
  },
};