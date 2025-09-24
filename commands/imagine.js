const axios = require('axios');

module.exports = {
  name: 'imagine', 
  category: 'AI',
  execute: async ({ api, event, args, sendMessage }) => {
    const { threadID, senderID } = event;
    const prompt = args.join(' ');

    if (!prompt) {
      return sendMessage(api, { threadID, message: '❌ Please enter a prompt to generate an image.' });
    }

    try {
    
      const apiUrl = `https://kaiz-apis.gleeze.com/api/imagine?prompt=${encodeURIComponent(prompt)}`;
      const response = await axios.get(apiUrl);

    
      const imageUrl = response.data.imageUrl || '⚠️ No image generated.';

    
      sendMessage(api, { threadID, message: `Imagine AI Image:\n${imageUrl}` });
    } catch (error) {
      console.error('❌ Error in imagineAI command:', error);
      sendMessage(api, { threadID, message: '⚠️ Oops! Something went wrong. Try again later.' });
    }
  }
};
