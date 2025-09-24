import axios from 'axios';
import AuroraBetaStyler from '@aurora/styler';

const weatherCommand: ShadowBot.Command = {
  config: {
    name: 'weather',
    description: 'Fetches weather for a city.',
    usage: '/weather <city>',
    nonPrefix: false,
  },
  run: async ({ api, event, args }) => {
    const { threadID, messageID } = event;
    const city = args.join(' ').trim();
    if (!city) {
      return api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: 'Weather',
          headerSymbol: '⚠️',
          headerStyle: 'bold',
          bodyText: 'Please provide a city (e.g., /weather Tokyo).',
          bodyStyle: 'sansSerif',
          footerText: '',
        }),
        threadID,
        messageID,
      );
    }
    try {
      const { data } = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
      const current = data.current_condition[0];
      const message = AuroraBetaStyler.styleOutput({
        headerText: 'Weather',
        headerSymbol: '🌦',
        headerStyle: 'bold',
        bodyText: `City: ${city}\nTemp: ${current.temp_C}°C\nCondition: ${current.weatherDesc[0].value}`,
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      await api.sendMessage(message, threadID, messageID);
    } catch (error) {
      await api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: 'Weather Error',
          headerSymbol: '❌',
          headerStyle: 'bold',
          bodyText: 'Failed to fetch weather data.',
          bodyStyle: 'sansSerif',
          footerText: '',
        }),
        threadID,
        messageID,
      );
    }
  },
};

export default weatherCommand;