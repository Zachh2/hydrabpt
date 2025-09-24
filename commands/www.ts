import AuroraBetaStyler from '@aurora/styler';
import axios from 'axios';

const wwwCommand: ShadowBot.Command = {
  config: {
    name: 'www',
    description: 'Determine who would win between two users',
    usage: 'whowouldwin',
    aliases: ['whowouldwin'],
    category: 'fun',
    role: 0,
    author: 'Aljur pogoy',
    nonPrefix: false,
  },
  run: async ({ api, event, args }) => {
    const { threadID, messageID, senderID } = event;
    if (!threadID || !messageID) {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: 'WhoWouldWin Error',
        headerSymbol: '❌',
        headerStyle: 'bold',
        bodyText: 'Missing threadID or messageID in event',
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      return api.sendMessage(errorMessage, threadID, messageID);
    }
    try {
      const threadInfo = await api.getThreadInfo(threadID);
      const participants = threadInfo.participantIDs;
      let id2;
      do {
        id2 = participants[Math.floor(Math.random() * participants.length)];
      } while (id2 === senderID);
      const [data1, data2] = await Promise.all([
        api.getUserInfo([senderID]),
        api.getUserInfo([id2]),
      ]);
      const name1 = data1[senderID]?.name || 'Unknown';
      const name2 = data2[id2]?.name || 'Unknown';
      const arraytag = [
        { id: senderID, tag: name1 },
        { id: id2, tag: name2 },
      ];
      const messageBody = `Who would win? ${name1} vs ${name2}!`;
      const url = `https://api.popcat.xyz/whowouldwin?image1=https://api-canvass.vercel.app/profile?uid=${senderID}&image2=https://api-canvass.vercel.app/profile?uid=${id2}`;
      const response = await axios.get(url, { responseType: 'stream' });
      await api.sendMessage(
        {
          body: AuroraBetaStyler.styleOutput({
            headerText: 'WhoWouldWin Result',
            headerSymbol: '🥊',
            headerStyle: 'bold',
            bodyText: messageBody,
            bodyStyle: 'sansSerif',
            footerText: '',
          }),
          mentions: arraytag,
          attachment: response.data,
        },
        threadID,
        messageID,
      );
    } catch (error) {
      console.error('WhoWouldWin command error:', error.stack || error.message);
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: 'WhoWouldWin Error',
        headerSymbol: '❌',
        headerStyle: 'bold',
        bodyText: `Error: ${error.message || 'Unknown error'}`,
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      await api.sendMessage(errorMessage, threadID, messageID);
    }
  },
};

export default wwwCommand;