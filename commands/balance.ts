import AuroraBetaStyler from '@aurora/styler';

interface UserData {
  balance: number;
  bank: number;
}

module.exports = {
  config: {
    name: "balance",
    author: "Aljur Pogoy",
    nonPrefix: false,
    description: "Check your wallet and bank balance.",
  },
  async run({ api, event, usersData }: { api: any; event: any; usersData: Map<string, UserData> }) {
    const { threadID, messageID, senderID } = event;
    try {
      let user = usersData.get(senderID) || { balance: 0, bank: 0 };
      user.balance = user.balance || 0;
      user.bank = user.bank || 0;
      usersData.set(senderID, user);
      const balanceMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Balance',
        headerSymbol: '',
        headerStyle: 'bold',
        bodyText: `Wallet: 💸 ${user.balance} coins\nBank: 🏦 ${user.bank} coins`,
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      api.sendMessage(balanceMessage, threadID, messageID);
    } catch (error) {
      console.error("『 🌙 』 Error in balance command:", error);
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Balance',
        headerSymbol: '',
        headerStyle: 'bold',
        bodyText: 'An error occurred while retrieving your balance.',
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      api.sendMessage(errorMessage, threadID, messageID);
    }
  },
};