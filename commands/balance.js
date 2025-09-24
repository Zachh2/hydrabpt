module.exports = {

  name: "balance",

  author: "Aljur Pogoy",

  nonPrefix: false,

  description: "Check your wallet and bank balance.",

  async run({ api, event, usersData }) {

    const { threadID, messageID, senderID } = event;

    try {

      // Initialize or fetch user data from usersData

      let user = usersData.get(senderID) || { balance: 0, bank: 0 };

      user.balance = user.balance || 0;

      user.bank = user.bank || 0;

      usersData.set(senderID, user);

      // Construct balance message

      let balanceMessage = `════『 𝗕𝗔𝗟𝗔𝗡𝗖𝗘 』════\n\n`;

      balanceMessage += `  ┏━━━━━━━┓\n`;

      balanceMessage += `  ┃ 『 𝗪𝗔𝗟𝗟𝗘𝗧 』 💸 ${user.balance} coins\n`;

      balanceMessage += `  ┃ 『 𝗕𝗔𝗡𝗞 』 🏦 ${user.bank} coins\n`;

      balanceMessage += `  ┗━━━━━━━┛\n`;

      api.sendMessage(balanceMessage, threadID, messageID);

    } catch (error) {

      console.error("『 🌙 』 Error in balance command:", error);

      let errorMessage = `════『 𝗕𝗔𝗟𝗔𝗡𝗖𝗘 』════\n\n`;

      errorMessage += `  ┏━━━━━━━┓\n`;

      errorMessage += `  ┃ 『 𝗜𝗡𝗙𝗢 』 An error occurred while retrieving your balance.\n`;

      errorMessage += `  ┗━━━━━━━┛\n`;

      api.sendMessage(errorMessage, threadID, messageID);

    }

  }

};