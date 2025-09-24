import axios from 'axios';
import AuroraBetaStyler from '@aurora/styler';



const factCommand: ShadowBot.Command = {
  config: {
    name: 'fact',
    description: 'Fetches a random fact.',
    usage: '/fact',
    nonPrefix: false,
  },
  run: async ({ api, event }) => {
    const { threadID, messageID } = event;
    try {
      const { data } = await axios.get('https://uselessfacts.jsph.pl/api/v2/facts/random');
      const message = AuroraBetaStyler.styleOutput({
        headerText: 'Random Fact',
        headerSymbol: '📜',
        headerStyle: 'bold',
        bodyText: data.text,
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      await api.sendMessage(message, threadID, messageID);
    } catch (error) {
      await api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: 'Fact Error',
          headerSymbol: '❌',
          headerStyle: 'bold',
          bodyText: 'Failed to fetch fact.',
          bodyStyle: 'sansSerif',
          footerText: '',
        }),
        threadID,
        messageID,
      );
    }
  },
};

export default factCommand;