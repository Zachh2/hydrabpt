const AuroraBetaStyler = require('@aurora/styler');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const hentaiCommand = {
  config: {
    name: 'hentai',
    description: 'Fetches a random hentai image (NSFW).',
    usage: '/hentai',
    nonPrefix: false,
    nsfw: true,
    author: 'Aljur Pogoy',
    category: 'media',
  },
  run: async ({ api, event, args }) => {
    try {
      const { threadID, messageID } = event;
      if (!threadID || !messageID) {
        throw new Error('Missing threadID or messageID in event');
      }
      const response = await axios.get('https://kaiz-apis.gleeze.com/api/hentai', {
        params: {
          limit: 1,
          apikey: '117cafc8-ef3b-4632-bc1c-13b38b912081',
        },
      });
      const data = response.data;
      console.log('API response:', data);
      const imageUrl = data.urls?.[0];
      if (!imageUrl) {
        throw new Error('No image URL returned from API');
      }
      const tempFilePath = path.join(__dirname, `temp_hentai_${Date.now()}.jpg`);
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      console.log('Image response status:', imageResponse.status);
      fs.writeFileSync(tempFilePath, Buffer.from(imageResponse.data));
      const imageStream = fs.createReadStream(tempFilePath);
      await api.sendMessage(
        {
          body: AuroraBetaStyler.styleOutput({
            headerText: 'Hentai Image (NSFW)',
            headerSymbol: '🔞',
            headerStyle: 'bold',
            bodyText: 'Warning: This content is NSFW. Viewer discretion advised.',
            bodyStyle: 'sansSerif',
            footerText: '',
          }),
          attachment: imageStream,
        },
        threadID,
        messageID,
      );
      fs.unlinkSync(tempFilePath);
    } catch (error) {
      console.error('Hentai command error:', error.stack || error.message, { event, response: error.response?.data });
      if (event.threadID && event.messageID) {
        await api.sendMessage(
          AuroraBetaStyler.styleOutput({
            headerText: 'Hentai Error',
            headerSymbol: '❌',
            headerStyle: 'bold',
            bodyText: 'Failed to fetch hentai image. Please try again later.',
            bodyStyle: 'sansSerif',
            footerText: '',
          }),
          event.threadID,
          event.messageID,
        );
      } else {
        console.error('Cannot send error message: threadID or messageID missing', event);
      }
    }
  },
};

module.exports = hentaiCommand;