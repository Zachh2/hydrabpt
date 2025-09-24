import axios from 'axios';
import AuroraBetaStyler from '@aurora/styler';

const jokeCommand: ShadowBot.Command = {
  config: {
    name: 'joke',
    description: 'Fetches a random joke.',
    usage: '/joke',
    nonPrefix: false,
  },
  run: async ({ api, event }) => {
    const { threadID, messageID } = event;
    try {
      const { data } = await axios.get('https://official-joke-api.appspot.com/random_joke');
      const message = AuroraBetaStyler.styleOutput({
        headerText: 'Random Joke',
        headerSymbol: '😄',
        headerStyle: 'bold',
        bodyText: `${data.setup}\n${data.punchline}`,
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      await api.sendMessage(message, threadID, messageID);
    } catch (error) {
      await api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: 'Joke Error',
          headerSymbol: '❌',
          headerStyle: 'bold',
          bodyText: 'Failed to fetch joke.',
          bodyStyle: 'sansSerif',
          footerText: '',
        }),
        threadID,
        messageID,
      );
    }
  },
};

export default jokeCommand;