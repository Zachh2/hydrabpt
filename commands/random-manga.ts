import axios from 'axios';
import AuroraBetaStyler from '@aurora/styler';
import { Readable } from 'stream';

const randomMangaCommand: ShadowBot.Command = {
  config: {
    name: 'random-manga',
    description: 'Fetches a random manga with its cover as an attachment.',
    usage: '/random-manga',
    nonPrefix: false,
  },
  run: async ({ api, event }) => {
    const { threadID, messageID } = event;

    try {
      const { data } = await axios.get('https://haji-mix.up.railway.app/api/manga/random');
      const { title, description, status, year, tags, cover_url } = data;

      const coverResponse = await axios.get(cover_url, { responseType: 'stream' });
      const coverStream = coverResponse.data as Readable;

      const message = AuroraBetaStyler.styleOutput({
        headerText: 'Random Manga',
        headerSymbol: '📚',
        headerStyle: 'bold',
        bodyText: `Title: ${title}\nStatus: ${status}\nYear: ${year}\nTags: ${tags.join(', ')}\n\nDescription:\n${description}`,
        bodyStyle: 'sansSerif',
        footerText: '',
      });

      await api.sendMessage(
        {
          body: message,
          attachment: coverStream,
        },
        threadID,
        messageID,
      );
    } catch (error) {
      api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: 'Random Manga Error',
          headerSymbol: '❌',
          headerStyle: 'bold',
          bodyText: 'Failed to fetch manga data.',
          bodyStyle: 'sansSerif',
          footerText: '',
        }),
        threadID,
        messageID,
      );
    }
  },
};

export default randomMangaCommand;