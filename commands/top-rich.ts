import AuroraBetaStyler, { LINE } from '@aurora/styler';

module.exports = {
  config: {
    name: "top-rich",
    category: "Economy",
    description: "Shows the top 5 richest players.",
    usage: "/toprich",
    author: "Aljur Pogoy",
    version: "3.0.0",
    aliases: ["top"],
  },
  async run({ api, event, usersData }: { api: any; event: any; usersData: Map<string, ShadowBot.UserData> }) {
    const { threadID, messageID } = event;

    try {
      const usersArray = Array.from(usersData.entries())
        .map(([userID, user]) => ({
          userID,
          balance: user?.balance ?? 0,
          bank: user?.bank ?? 0,
          totalWealth: (user?.balance ?? 0) + (user?.bank ?? 0),
        }))
        .filter(user => user.totalWealth > 0);

      const topUsers = usersArray.sort((a, b) => b.totalWealth - a.totalWealth).slice(0, 8);

      if (topUsers.length === 0) {
        const noDataMessage = AuroraBetaStyler.styleOutput({
          headerText: 'Top Richest',
          headerStyle: 'bold',
          bodyText: '❌ No users with wealth found.',
          bodyStyle: 'sansSerif',
          footerText: '',
        });
        return api.sendMessage(noDataMessage, threadID, messageID);
      }

      const namePromises = topUsers.map(user =>
        new Promise(resolve => {
          api.getUserInfo(user.userID, (err, info) => {
            if (err || !info[user.userID]) {
              resolve(`${LINE}\n🏆 Unknown (UID: ${user.userID})\n💰 Wallet: ${user.balance} coins\n🏦 Bank: ${user.bank} coins`);
            } else {
              const name = info[user.userID].name;
              resolve(`${LINE}\n🏆 ${name}\n💰 Wallet: ${user.balance} coins\n🏦 Bank: ${user.bank} coins`);
            }
          });
        })
      );

      const names = await Promise.all(namePromises);
      let message = AuroraBetaStyler.styleOutput({
        headerText: 'Top 8 Richest',
        headerStyle: 'bold',
        bodyText: names.join("\n"),
        bodyStyle: 'sansSerif',
        footerText: ': **Aljur**',
      });

      api.sendMessage(message, threadID, messageID);
    } catch (error) {
      console.error("『 🌙 』 Error in toprich command:", error);
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Top Richest Players',
        headerStyle: 'bold',
        bodyText: '❌ An error occurred while fetching the richest players.',
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      api.sendMessage(errorMessage, threadID, messageID);
    }
  },
};