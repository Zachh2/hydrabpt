import AuroraBetaStyler from '@aurora/styler';

interface UserData {
  balance: number;
  bank: number;
  lastDaily: number;
}

module.exports = {
  config: {
    name: "daily",
    author: "Aljur Pogoy",
    description: "Claim your daily reward of 500 coins! (Once every 24 hours)",
    version: "3.0.0",
    usage: "<prefix>daily",
  },
  async run({ api, event, args, usersData }: { api: any; event: any; args: string[]; usersData: Map<string, UserData> }) {
    const { threadID, messageID, senderID } = event;
    try {
      let user = usersData.get(senderID) || { balance: 0, bank: 0, lastDaily: 0 };
      user.balance = user.balance || 0;
      user.bank = user.bank || 0;
      user.lastDaily = user.lastDaily || 0;
      usersData.set(senderID, user);

      const now = Date.now();
      const timeSinceLastClaim = now - user.lastDaily;
      const cooldown = 24 * 60 * 60 * 1000;
      if (timeSinceLastClaim < cooldown) {
        const remainingTime = cooldown - timeSinceLastClaim;
        const hours = Math.floor(remainingTime / (1000 * 60 * 60));
        const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);
        const cooldownMessage = AuroraBetaStyler.styleOutput({
          headerText: 'Daily Reward',
          headerSymbol: '⏳',
          headerStyle: 'bold',
          bodyText: '❌ You already claimed your daily reward!\n⏰ Please wait ' + hours + 'h ' + minutes + 'm ' + seconds + 's to claim again.',
          bodyStyle: 'sansSerif',
          footerText: '',
        });
        return api.sendMessage(cooldownMessage, threadID, messageID);
      }

      const reward = 500;
      const bonus = 2000;
      user.balance += reward + bonus;
      user.lastDaily = now;
      usersData.set(senderID, user);

      const successMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Daily Reward',
        headerSymbol: '✅',
        headerStyle: 'bold',
        bodyText: 'You claimed your daily reward!\n💰 Reward: ' + reward + ' coins\n✨ Bonus from ownirsV2 company you got ' + bonus + ' Congrats 🥀\n🏦 New Balance: ' + user.balance + ' coins\n\n⏰ Come back in 24 hours for your next reward!',
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      await api.sendMessage(successMessage, threadID, messageID);
    } catch (error) {
      console.error('『 🌙 』 Error in daily command:', error);
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Daily Reward',
        headerSymbol: '⏳',
        headerStyle: 'bold',
        bodyText: '❌ An error occurred while processing your daily reward.',
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      api.sendMessage(errorMessage, threadID, messageID);
    }
  },
};