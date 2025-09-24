import axios from 'axios';
import AuroraBetaStyler from '@aurora/styler';
import { Readable } from 'stream';


const memeCommand: ShadowBot.Command = {
  config: {
    name: 'meme',
    description: 'Fetches a random meme image.',
    usage: 'meme',
    nonPrefix: false,
  },
  run: async ({ api, event }) => {
    const { threadID, messageID } = event;
    try {
      const { data } = await axios.get('https://meme-api.com/gimme');
      const memeStream = (await axios.get(data.url, { responseType: 'stream' })).data as Readable;
      const message = AuroraBetaStyler.styleOutput({
        headerText: 'Random Meme',
        headerSymbol: '😂',
        headerStyle: 'bold',
        bodyText: `Title: ${data.title}`,
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      await api.sendMessage({ body: message, attachment: memeStream }, threadID, messageID);
    } catch (error) {
      await api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: 'Meme Error',
          headerSymbol: '❌',
          headerStyle: 'bold',
          bodyText: 'Failed to fetch meme.',
          bodyStyle: 'sansSerif',
          footerText: '',
        }),
        threadID,
        messageID,
      );
    }
  },
};

export default memeCommand;