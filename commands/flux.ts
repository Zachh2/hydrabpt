import AuroraBetaStyler from '@aurora/styler';
import axios from 'axios';

const fluxCommand: ShadowBot.Command = {
  config: {
    name: 'flux',
    description: 'Generate an image using the Flux AI model',
    usage: 'flux <prompt>',
    aliases: [],
    category: 'art',
    role: 0,
    author: 'Aljur pogoy',
    nonPrefix: false,
  },
  run: async ({ api, event, args }) => {
    const { threadID, messageID } = event;
    if (!threadID || !messageID) {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Flux Error',
        headerSymbol: '❌',
        headerStyle: 'bold',
        bodyText: 'Missing threadID or messageID in event',
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      return api.sendMessage(errorMessage, threadID, messageID);
    }
    const prompt = args.join(' ').trim();
    if (!prompt) {
      const usageMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Flux Usage',
        headerSymbol: '⚠️',
        headerStyle: 'bold',
        bodyText: 'Please provide a prompt to generate an image.\nExample: /flux A futuristic robot flying over Tokyo',
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      return api.sendMessage(usageMessage, threadID, messageID);
    }
    try {
      const waitMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Flux Generating',
        headerSymbol: '🖌️',
        headerStyle: 'bold',
        bodyText: `Generating image for: "${prompt}"\nPlease wait a moment...`,
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      await api.sendMessage(waitMessage, threadID, messageID);
      const apiUrl = 'https://kaiz-apis.gleeze.com/api/flux';
      const response = await axios.get(apiUrl, {
        responseType: 'stream',
        params: {
          prompt,
          apikey: '4fe7e522-70b7-420b-a746-d7a23db49ee5',
        },
      });
      const successMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Flux Result',
        headerSymbol: '✅',
        headerStyle: 'bold',
        bodyText: `Successfully generated image for:\n"${prompt}"\nEnjoy your image!`,
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      await api.sendMessage(
        {
          body: successMessage,
          attachment: response.data,
        },
        threadID,
        messageID,
      );
    } catch (error) {
      console.error('Flux command error:', error.stack || error.message);
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Flux Error',
        headerSymbol: '❌',
        headerStyle: 'bold',
        bodyText: `Failed to generate image.\nReason: ${error.response?.data?.message || error.message || 'Unknown error'}`,
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      await api.sendMessage(errorMessage, threadID, messageID);
    }
  },
};

export default fluxCommand;