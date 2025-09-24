import axios from 'axios';
import AuroraBetaStyler from '@aurora/styler';

namespace ShadowBot {
  export interface Command {
    config: {
      name: string;
      description: string;
      usage: string;
      aliases?: string[];
      category?: string;
      role?: number;
    };
    run: (context: { api: any; event: any; args: string[] }) => Promise<void>;
  }
}

const API_KEY = '5445ac64-628b-446a-a2a7-9fe803592176';

const shazamLyricsCommand: ShadowBot.Command = {
  config: {
    name: 'shazam',
    description: 'Fetches lyrics and thumbnail for a song using Shazam API.',
    usage: '/shazam <song title>',
    aliases: ['shazam-lyrics'],
    category: 'Music 🎵',
    role: 4, // Restrict to thread admins
  },
  async run({ api, event, args }) {
    const { threadID, messageID, senderRole } = event;

    const styledMessage = (header: string, body: string, symbol: string) =>
      AuroraBetaStyler.styleOutput({
        headerText: header,
        headerSymbol: symbol,
        headerStyle: 'bold',
        bodyText: body,
        bodyStyle: 'sansSerif',
        footerText: '',
      });
    if (args.length === 0) {
      return api.sendMessage(
        styledMessage(
          'Shazam Error',
          'Please provide a song title. Usage: /shazam <song title>',
          '❌',
        ),
        threadID,
        messageID,
      );
    }

    const songTitle = args.join('+');
    const apiUrl = `https://kaiz-apis.gleeze.com/api/shazam-lyrics?title=${encodeURIComponent(songTitle)}&apikey=${API_KEY}`;

    try {
      const response = await axios.get(apiUrl);
      const data = response.data;

      if (!data.title || !data.lyrics) {
        return api.sendMessage(
          styledMessage(
            'Shazam Error',
            `No lyrics found for "${args.join(' ')}".`,
            '❌',
          ),
          threadID,
          messageID,
        );
      }

      const messageBody = styledMessage(
        `${data.title} by ${data.author}`,
        `${data.description}\n\n${data.lyrics}`,
        '🎵',
      );

      if (data.thumbnail) {
        const thumbnailResponse = await axios.get(data.thumbnail, { responseType: 'stream' });
        await api.sendMessage(
          {
            body: messageBody,
            attachment: thumbnailResponse.data,
          },
          threadID,
          messageID,
        );
      } else {
        await api.sendMessage(messageBody, threadID, messageID);
      }
    } catch (error) {
      return api.sendMessage(
        styledMessage(
          'Shazam Error',
          `Failed to fetch lyrics: ${error.message || 'Unknown error'}`,
          '❌',
        ),
        threadID,
        messageID,
      );
    }
  },
};

export default shazamLyricsCommand;