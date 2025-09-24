const axios = require('axios');

module.exports = {
  name: 'cid',
  category: 'Ai',
  execute: async (api, event, args, commands, prefix, admins, appState, sendMessage) => {
    const { threadID } = event;
    const query = args.join(" "); 

    if (query === "") {
      sendMessage(api, { threadID, message: "Please provide a question or statement for me to respond to." });
      return;
    }

    try {
      const response = await axios.get(`https://kaiz-apis.gleeze.com/api/gpt-4o?ask=${encodeURIComponent(query)}&uid=1`);
      const data = response.data; 

      if (data.response) {
        sendMessage(api, { threadID, message: data.response });
      } else {
        sendMessage(api, { threadID, message: "I'm sorry, I couldn't understand your request. Please try again." });
      }
    } catch (error) {
      console.error("Error calling Gemini Pro API:", error);
      sendMessage(api, { threadID, message: "An error occurred while processing your request. Please try again later." });
    }
  },
};

