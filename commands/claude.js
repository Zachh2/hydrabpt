const axios = require('axios');

module.exports = {

  name: 'claude',

  category: 'AI',

  description: 'Ask Claude 3 AI any question.',

  author: 'aljur pogoy',

  version: '3.0.0',

  usage: '/claude <question>',

  async execute(api, event, args, commands, prefix, admins, appState, sendMessage) {

    const { threadID } = event;

    const query = args.join(' ').trim();

    try {

      if (!query) {

        const usageMessage = `====『 𝗖𝗟𝗔𝗨𝗗𝗘 𝗘𝗥𝗥𝗢𝗥 』====\n\n`;

        usageMessage += `  ╭─╮\n`;

        usageMessage += `  | 『 𝗜𝗡𝗙𝗢 』 Please provide a question.\n`;

        usageMessage += `  | ✅ Example: ${prefix}claude What is AI?\n`;

        usageMessage += `  ╰─────────────ꔪ\n\n`;

        usageMessage += `> 𝗧𝗵𝗮𝗻𝗸 𝘆𝗼𝘂 𝗳𝗼𝗿 𝘂𝘀𝗶𝗻𝗴 𝗼𝘂𝗿 𝗖𝗶𝗱 𝗞𝗮𝗴𝗲𝗻𝗼𝘂 𝗯𝗼𝘁\n`;

        usageMessage += `> 𝗙𝗼𝗿 𝗳𝘂𝗿𝘁𝗵𝗲𝗿 𝗮𝘀𝘀𝗶𝘀𝘁𝗮𝗻𝗰𝗲, 𝗰𝗼𝗻𝘁𝗮𝗰𝘁: 𝗸𝗼𝗿𝗶𝘀𝗮𝘄𝗮𝘂𝗺𝘂𝘇𝗮𝗸𝗶@𝗴𝗺𝗮𝗶𝗹.𝗰𝗼𝗺`;

        sendMessage(api, { threadID, message: usageMessage });

        return;

      }

      const apiUrl = `https://kaiz-apis.gleeze.com/api/claude3-haiku?ask=${encodeURIComponent(query)}`;

      const response = await axios.get(apiUrl);

      if (response.data && response.data.response) {

        const aiResponse = response.data.response;

        let successMessage = `====『 𝗖𝗟𝗔𝗨𝗗𝗘 𝟯 𝗔𝗜 』====\n\n`;

        successMessage += `  ╭─╮\n`;

        successMessage += `  | 『 𝗥𝗘𝗦𝗣𝗢𝗡𝗦𝗘 』 ${aiResponse}\n`;

        successMessage += `  ╰─────────────ꔪ\n\n`;

        successMessage += `> 𝗧𝗵𝗮𝗻𝗸 𝘆𝗼𝘂 𝗳𝗼𝗿 𝘂𝘀𝗶𝗻𝗴 𝗼𝘂𝗿 𝗖𝗶𝗱 �_K𝗮𝗴𝗲𝗻𝗼𝘂 𝗯𝗼𝘁\n`;

        successMessage += `> 𝗙𝗼𝗿 𝗳𝘂𝗿𝘁𝗵𝗲𝗿 𝗮𝘀𝘀𝗶𝘀𝘁�_a𝗻𝗰𝗲, 𝗰𝗼𝗻𝘁𝗮𝗰𝘁: 𝗸𝗼𝗿𝗶𝘀𝗮𝘄𝗮𝘂𝗺𝘂𝘇𝗮𝗸𝗶@𝗴𝗺𝗮𝗶𝗹.𝗰𝗼𝗺`;

        sendMessage(api, { threadID, message: successMessage });

      } else {

        const errorMessage = `====『 𝗖𝗟𝗔𝗨𝗗𝗘 𝗘𝗥𝗥𝗢𝗥 』====\n\n`;

        errorMessage += `  ╭─╮\n`;

        errorMessage += `  | 『 𝗜𝗡𝗙𝗢 』 No response received from Claude 3 API.\n`;

        errorMessage += `  ╰─────────────ꔪ\n\n`;

        errorMessage += `> 𝗧𝗵𝗮𝗻𝗸 𝘆𝗼𝘂 𝗳𝗼𝗿 𝘂𝘀𝗶𝗻𝗴 𝗼𝘂𝗿 𝗖𝗶𝗱 𝗞𝗮𝗴𝗲𝗻𝗼𝘂 𝗯𝗼𝘁\n`;

        errorMessage += `> 𝗙𝗼𝗿 𝗳𝘂𝗿𝘁𝗵𝗲𝗿 𝗮𝘀𝘀𝗶𝘀𝘁𝗮𝗻𝗰𝗲, 𝗰𝗼𝗻𝘁𝗮𝗰𝘁: 𝗸𝗼𝗿𝗶𝘀𝗮𝘄𝗮𝘂𝗺𝘂𝘇𝗮𝗸𝗶@�_g𝗺𝗮𝗶𝗹.𝗰𝗼𝗺`;

        sendMessage(api, { threadID, message: errorMessage });

      }

    } catch (error) {

      console.error('❌ Error in claude command:', error);

      const errorMessage = `====『 𝗖𝗟𝗔𝗨𝗗𝗘 𝗘𝗥𝗥𝗢𝗥 』====\n\n`;

      errorMessage += `  ╭─╮\n`;

      errorMessage += `  | 『 𝗜𝗡𝗙𝗢 』 Error retrieving response from Claude 3 AI.\n`;

      errorMessage += `  ╰─────────────ꔪ\n\n`;

      errorMessage += `> 𝗧𝗵𝗮𝗻𝗸 𝘆𝗼𝘂 𝗳𝗼𝗿 𝘂𝘀𝗶𝗻𝗴 𝗼𝘂𝗿 𝗖𝗶𝗱 𝗞𝗮𝗴𝗲𝗻𝗼𝘂 𝗯𝗼𝘁\n`;

      errorMessage += `> 𝗙𝗼𝗿 𝗳𝘂𝗿𝘁𝗵𝗲𝗿 𝗮𝘀𝘀𝗶𝘀𝘁𝗮𝗻𝗰𝗲, 𝗰𝗼𝗻𝘁𝗮𝗰𝘁: 𝗸𝗼𝗿𝗶𝘀𝗮𝘄𝗮𝘂𝗺𝘂𝘇𝗮𝗸𝗶@𝗴𝗺𝗮𝗶𝗹.𝗰𝗼𝗺`;

      sendMessage(api, { threadID, message: errorMessage });

    }

  },

};