const { format, UNIRedux } = require("cassidy-styler");

module.exports = {

  name: "balance-reset",

  author: "Aljur Pogoy",

  version: "3.0.0",

  description: "Reset a user's coin balance to zero (Admin only). Usage: #resetbalance <uid>",

  async run({ api, event, args, admins, db, usersData }) {

    const { threadID, messageID, senderID } = event;

    if (!admins.includes(senderID)) {

      const errorMessage = format({

        title: "Reset Balance",

        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,

        titleFont: "double_struck",

        emojis: "💰",

        content: `𝘖𝘯𝘭𝘺 𝘢𝘥𝘮𝘪𝘯𝘴 𝘤𝘢𝘯 𝘶𝘴𝘦 𝘵𝘩𝘪𝘴 𝘤𝘰𝘮𝘮𝘢𝘯𝘥.\n\n> 𝘛𝘩𝘢𝘯𝘬 𝘺𝘰𝘶 𝘧𝘰𝘳 𝘶𝘴𝘪𝘯𝘨 𝘰𝘶𝘳 𝘊𝘪𝘥 𝘒𝘢𝘨𝘦𝘯𝘰𝘶 𝘣𝘰𝘵`

      });

      return api.sendMessage(errorMessage, threadID, messageID);

    }

    if (!args[0]) {

      const errorMessage = format({

        title: "Reset Balance",

        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,

        titleFont: "double_struck",

        emojis: "💰",

        content: `𝘜𝘴𝘢𝘨𝘦: #𝘣𝘢𝘭𝘢𝘯𝘤𝘦-𝘳𝘦𝘴𝘦𝘵 <𝘶𝘪𝘥>\n𝘌𝘹𝘢𝘮𝘱𝘭𝘦: #𝘣𝘢𝘭𝘢𝘯𝘤𝘦-𝘳𝘦𝘴𝘦𝘵 1234567890\n\n> 𝘛𝘩𝘢𝘯𝘬 𝘺𝘰𝘶 𝘧𝘰𝘳 𝘶𝘴𝘪𝘯𝘨 𝘰𝘶𝘳 𝘊𝘪𝘥 𝘒𝘢𝘨𝘦𝘯𝘰𝘶 𝘣𝘰𝘵`

      });

      return api.sendMessage(errorMessage, threadID, messageID);

    }

    const targetUID = args[0];

    let userData = usersData.get(targetUID) || {};

    if (db) {

      const userDoc = await db.db("users").findOne({ userId: targetUID });

      userData = userDoc?.data || {};

    }

    if (!userData.hasOwnProperty("balance")) {

      const errorMessage = format({

        title: "Reset Balance",

        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,

        titleFont: "double_struck",

        emojis: "💰",

        content: `𝘜𝘐𝘋 ${targetUID} 𝘩𝘢𝘴 𝘯𝘰 𝘣𝘢𝘭𝘢𝘯𝘤𝘦 𝘥𝘢𝘵𝘢 𝘵𝘰 𝘳𝘦𝘴𝘦𝘵.\n\n> 𝘛𝘩𝘢𝘯𝘬 𝘺𝘰𝘶 𝘧𝘰𝘳 𝘶𝘴𝘪𝘯𝘨 𝘰𝘶𝘳 𝘊𝘪𝘥 𝘒𝘢𝘨𝘦𝘯𝘰𝘶 𝘣𝘰𝘵`

      });

      return api.sendMessage(errorMessage, threadID, messageID);

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

    const successMessage = format({

      title: "Reset Balance",

      titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,

      titleFont: "double_struck",

      emojis: "💰",

      content: `𝘉𝘢𝘭𝘢𝘯𝘤𝘦 𝘳𝘦𝘴𝘦𝘵 𝘧𝘰𝘳 𝘜𝘐𝘋 ${targetUID}.\n\n> 𝘛𝘩𝘢𝘯𝘬 𝘺𝘰𝘶 𝘧𝘰𝘳 𝘶𝘴𝘪𝘯𝘨 𝘰𝘶𝘳 𝘊𝘪𝘥 𝘒𝘢𝘨𝘦𝘯𝘰𝘶 𝘣𝘰𝘵`

    });

    return api.sendMessage(successMessage, threadID, messageID);

  }

};