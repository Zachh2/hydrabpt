const fs = require("fs-extra");

const path = require("path");

module.exports = {

  name: "bank",

  author: "Aljur Pogoy",

  description: "Manage your bank account!",

  Usage: "/bank <action> [amount/name]",

  version: "3.0.0",

  async run({ api, event, args, usersData }) {

    const { threadID, messageID, senderID } = event;

    try {

      // Initialize or fetch user data from usersData

      let user = usersData.get(senderID) || { balance: 0, bank: 0, account: null, loan: null };

      user.balance = user.balance || 0;

      user.bank = user.bank || 0;

      user.account = user.account || null;

      user.loan = user.loan || null;

      usersData.set(senderID, user);

      // Check if user is registered

      const action = args[0] ? args[0].toLowerCase() : null;

      if (!user.account && action !== "register") {

        return api.sendMessage(

          "🏦 『 𝗕𝗔𝗡𝗞 』 🏦\n\n❌ You need to register first!\nUsage: /bank register <name>\nExample: /bank register Aljur Pogoy",

          threadID,

          messageID

        );

      }

      // Handle actions

      if (!action || !["register", "withdraw", "deposit", "loan", "repay"].includes(action)) {

        let menuMessage = "════『 𝗕𝗔𝗡𝗞 𝗠𝗘𝗡𝗨 』════\n\n";

        menuMessage += "📝 『 𝗥𝗘𝗚𝗜𝗦𝗧𝗘𝗥 』 - /bank register <name>\n";

        menuMessage += "💸 『 𝗪𝗜𝗧𝗛𝗗𝗥𝗔𝗪 』 - /bank withdraw <amount>\n";

        menuMessage += "💰 『 𝗗𝗘𝗣𝗢𝗦𝗜𝗧 』 - /bank deposit <amount>\n";

        menuMessage += "🏦 『 𝗟𝗢𝗔𝗡 』 - /bank loan <amount>\n";

        menuMessage += "📜 『 𝗥𝗘𝗣𝗔𝗬 』 - /bank repay\n\n";

        menuMessage += "> 𝗠𝗮𝗻𝗮𝗴𝗲 𝘆𝗼𝘂𝗿 𝗰𝗼𝗶𝗻𝘀 𝘄𝗶𝘁𝗵 𝗲𝗮𝘀𝗲!";

        return api.sendMessage(menuMessage, threadID, messageID);

      }

      if (action === "register") {

        // Register action

        const name = args.slice(1).join(" ").trim();

        if (!name) {

          return api.sendMessage(

            "📝 『 𝗥𝗘𝗚𝗜𝗦𝗧𝗘𝗥 』 📝\n\n❌ Please provide your name!\nUsage: /bank register <name>\nExample: /bank register Aljur Pogoy",

            threadID,

            messageID

          );

        }

        if (user.account) {

          return api.sendMessage(

            "📝 『 𝗥𝗘𝗚𝗜𝗦𝗧𝗘𝗥 』 📝\n\n❌ You are already registered as " + user.account + "!",

            threadID,

            messageID

          );

        }

        user.account = name;

        usersData.set(senderID, user);

        let successMessage = "📝 『 𝗥𝗘𝗚𝗜𝗦𝗧𝗘𝗥 』 📝\n\n";

        successMessage += `✅ Successfully registered as ${name}!\n`;

        successMessage += `🏦 You can now use withdraw, deposit, and loan features.`;

        return api.sendMessage(successMessage, threadID, messageID);

      }

      // Validate amount for withdraw, deposit, and loan

      const amount = parseInt(args[1]);

      if (["withdraw", "deposit", "loan"].includes(action) && (!args[1] || isNaN(amount) || amount <= 0)) {

        return api.sendMessage(

          `🏦 『 𝗕𝗔𝗡𝗞 』 🏦\n\n❌ Please provide a valid amount!\nExample: /bank ${action} 100`,

          threadID,

          messageID

        );

      }

      if (action === "withdraw") {

        // Withdraw action

        if (user.bank < amount) {

          return api.sendMessage(

            `💸 『 𝗪𝗜𝗧𝗛𝗗𝗥𝗔𝗪 』 💸\n\n❌ Insufficient funds in your bank!\nBank Balance: ${user.bank} coins\nRequired: ${amount} coins`,

            threadID,

            messageID

          );

        }

        user.bank -= amount;

        user.balance += amount;

        usersData.set(senderID, user);

        let successMessage = "💸 『 𝗪𝗜𝗧𝗛𝗗𝗥𝗔𝗪 』 💸\n\n";

        successMessage += `✅ Successfully withdrew ${amount} coins!\n`;

        successMessage += `🏦 Bank Balance: ${user.bank} coins\n`;

        successMessage += `💰 Wallet Balance: ${user.balance} coins`;

        return api.sendMessage(successMessage, threadID, messageID);

      }

      if (action === "deposit") {

        // Deposit action

        if (user.balance < amount) {

          return api.sendMessage(

            `💰 『 𝗗𝗘𝗣𝗢𝗦𝗜𝗧 』 💰\n\n❌ Insufficient funds in your wallet!\nWallet Balance: ${user.balance} coins\nRequired: ${amount} coins`,

            threadID,

            messageID

          );

        }

        user.balance -= amount;

        user.bank += amount;

        usersData.set(senderID, user);

        let successMessage = "💰 『 𝗗𝗘𝗣𝗢𝗦𝗜𝗧 』 💰\n\n";

        successMessage += `✅ Successfully deposited ${amount} coins!\n`;

        successMessage += `🏦 Bank Balance: ${user.bank} coins\n`;

        successMessage += `💰 Wallet Balance: ${user.balance} coins`;

        return api.sendMessage(successMessage, threadID, messageID);

      }

      if (action === "loan") {

        // Loan action

        const maxLoan = 10000;

        const interestRate = 0.1; // 10% interest

        if (user.loan) {

          const totalRepay = user.loan.amount + user.loan.interest;

          return api.sendMessage(

            `🏦 『 𝗟𝗢𝗔𝗡 』 🏦\n\n❌ You already have an outstanding loan!\nLoan Amount: ${user.loan.amount} coins\nInterest: ${user.loan.interest} coins\nTotal to Repay: ${totalRepay} coins\n\nPlease repay your loan before taking a new one.`,

            threadID,

            messageID

          );

        }

        if (amount > maxLoan) {

          return api.sendMessage(

            `🏦 『 𝗟𝗢𝗔𝗡 』 🏦\n\n❌ Loan amount cannot exceed ${maxLoan} coins!`,

            threadID,

            messageID

          );

        }

        const interest = Math.floor(amount * interestRate);

        const totalRepay = amount + interest;

        user.balance += amount;

        user.loan = { amount, interest };

        usersData.set(senderID, user);

        let successMessage = "🏦 『 𝗟𝗢𝗔𝗡 』 🏦\n\n";

        successMessage += `✅ Successfully borrowed ${amount} coins!\n`;

        successMessage += `💸 Interest (10%): ${interest} coins\n`;

        successMessage += `📜 Total to Repay: ${totalRepay} coins\n`;

        successMessage += `💰 Wallet Balance: ${user.balance} coins\n\n`;

        successMessage += `⚠️ Repay your loan before taking a new one!`;

        return api.sendMessage(successMessage, threadID, messageID);

      }

      if (action === "repay") {

        // Repay action

        if (!user.loan) {

          return api.sendMessage(

            `🏦 『 𝗥𝗘𝗣𝗔𝗬 』 🏦\n\n❌ You have no outstanding loan to repay!`,

            threadID,

            messageID

          );

        }

        const totalRepay = user.loan.amount + user.loan.interest;

        if (user.balance < totalRepay) {

          return api.sendMessage(

            `🏦 『 𝗥𝗘𝗣𝗔𝗬 』 🏦\n\n❌ Insufficient funds in your wallet!\nWallet Balance: ${user.balance} coins\nRequired to Repay: ${totalRepay} coins`,

            threadID,

            messageID

          );

        }

        user.balance -= totalRepay;

        delete user.loan;

        usersData.set(senderID, user);

        let successMessage = "🏦 『 𝗥𝗘𝗣𝗔𝗬 』 🏦\n\n";

        successMessage += `✅ Successfully repaid your loan of ${totalRepay} coins!\n`;

        successMessage += `💰 Wallet Balance: ${user.balance} coins`;

        return api.sendMessage(successMessage, threadID, messageID);

      }

    } catch (error) {

      console.error("『 🌙 』 Error in bank command:", error);

      let errorMessage = "🏦 『 𝗕𝗔𝗡𝗞 』 🏦\n\n";

      errorMessage += `❌ An error occurred while processing your bank action.\n`;

      api.sendMessage(errorMessage, threadID, messageID);

    }

  },

};