import axios from 'axios';
import AuroraBetaStyler from '@aurora/styler';
import { Readable } from 'stream';

const sadcatCommand: ShadowBot.Command = {
  config: {
    name: 'sadcat',
    description: 'Generates a sad cat image with custom text.',
    usage: 'sadcat <text>',
    nonPrefix: false,
  },
  run: async ({ api, event, args }) => {
    const { threadID, messageID } = event;
    const text = args.join(' ').trim();

    if (!text) {
      return api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: 'Sadcat',
          headerSymbol: '⚠️',
          headerStyle: 'bold',
          bodyText: 'Please provide text.',
          bodyStyle: 'sansSerif',
          footerText: '',
        }),
        threadID,
        messageID,
      );
    }

    try {
      const { data } = await axios.get('https://api.popcat.xyz/v2/sadcat', {
        params: { text: text },
        responseType: 'stream',
      });
      const imageStream = data as Readable;

      const message = AuroraBetaStyler.styleOutput({
        headerText: 'Sadcat',
        headerSymbol: '😿',
        headerStyle: 'bold',
        bodyText: `Sad cat image generated with text: "${text}"`,
        bodyStyle: 'sansSerif',
        footerText: '',
      });

      await api.sendMessage(
        {
          body: message,
          attachment: imageStream,
        },
        threadID,
        messageID,
      );
    } catch (error) {
      api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: 'Sadcat Error',
          headerSymbol: '❌',
          headerStyle: 'bold',
          bodyText: 'Failed to generate sad cat image.',
          bodyStyle: 'sansSerif',
          footerText: '',
        }),
        threadID,
        messageID,
      );
    }
  },
};

export default sadcatCommand;