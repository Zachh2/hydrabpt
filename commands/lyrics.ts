import AuroraBetaStyler from '@aurora/styler';
import axios from 'axios';

const lyricsCommand: ShadowBot.Command = {
  config: {
    name: 'lyrics',
    description: 'Fetch song lyrics by title',
    usage: 'lyrics <song title>',
    aliases: ['song', 'lyric'],
    category: 'music',
    role: 0,
    author: 'Aljur Pogoy',
    nonPrefix: true,
  },
  run: async ({ api, event, args }) => {
    const { threadID, messageID, senderID } = event;
    if (!threadID || !messageID) {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Lyrics Error',
        headerSymbol: '❌',
        headerStyle: 'bold',
        bodyText: 'Missing threadID or messageID in event',
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      return api.sendMessage(errorMessage, threadID, messageID);
    }
    if (!args[0]) {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Lyrics Error',
        headerSymbol: '❌',
        headerStyle: 'bold',
        bodyText: 'Please enter a song title.\nExample: lyrics multo',
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      return api.sendMessage(errorMessage, threadID, messageID);
    }
    const query = args.join(' ').trim();
    const waitMessage = AuroraBetaStyler.styleOutput({
      headerText: 'Lyrics Searching',
      headerSymbol: '🎶',
      headerStyle: 'bold',
      bodyText: `Searching lyrics for: "${query}"...`,
      bodyStyle: 'sansSerif',
      footerText: '',
    });
    try {
      const messageInfo = await new Promise((resolve, reject) => {
        api.sendMessage(waitMessage, threadID, (err: any, info: any) => {
          if (err) return reject(err);
          resolve(info);
        }, messageID);
      }) as { messageID: string };
      const apikey = '4fe7e522-70b7-420b-a746-d7a23db49ee5';
      const res = await axios.get(`https://kaiz-apis.gleeze.com/api/lyrics?title=${encodeURIComponent(query)}&apikey=${apikey}`);
      const { title, lyrics } = res.data;
      const userName = await getUserName(api, senderID);
      const timePH = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
      const message = AuroraBetaStyler.styleOutput({
        headerText: 'Lyrics Found',
        headerSymbol: '🎵',
        headerStyle: 'bold',
        bodyText: `Title: ${title}\n\n${lyrics.trim().substring(0, 5000)}\n\nRequested by: ${userName}\nTime: ${timePH}`,
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      await api.editMessage(message, messageInfo.messageID);
    } catch (error) {
      console.error('Lyrics command error:', error.stack || error.message);
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Lyrics Error',
        headerSymbol: '❌',
        headerStyle: 'bold',
        bodyText: `Failed to fetch lyrics:\n${error.response?.data?.message || error.message || 'Unknown error'}`,
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      await api.sendMessage(errorMessage, threadID, messageID);
    }
  },
};

async function getUserName(api: any, userID: string): Promise<string> {
  try {
    const info = await api.getUserInfo([userID]);
    return info?.[userID]?.name || 'Unknown User';
  } catch {
    return 'Unknown User';
  }
}

export default lyricsCommand;