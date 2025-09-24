import AuroraBetaStyler from '@aurora/styler';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const gayCommand: ShadowBot.Command = {
  config: {
    name: 'gay',
    description: "Randomly finds a 'gay' in group chat",
    usage: '/bakla',
    aliases: ['gay'],
    category: 'fun',
    role: 0,
    author: 'Aljur pogoy',
    nonPrefix: false,
  },
  run: async ({ api, event, args }) => {
    const { threadID, messageID } = event;
    if (!threadID || !messageID) {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Bakla Error',
        headerSymbol: '❌',
        headerStyle: 'bold',
        bodyText: 'Missing threadID or messageID in event',
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      return api.sendMessage(errorMessage, threadID, messageID);
    }
    try {
      const groupInfo = await api.getThreadInfo(threadID);
      const friends = groupInfo.participantIDs.filter((userId: string) => !groupInfo.nicknames[userId]);
      if (friends.length === 0) {
        const errorMessage = AuroraBetaStyler.styleOutput({
          headerText: 'Bakla Error',
          headerSymbol: '❌',
          headerStyle: 'bold',
          bodyText: 'No eligible users found in this group.',
          bodyStyle: 'sansSerif',
          footerText: '',
        });
        return api.sendMessage(errorMessage, threadID, messageID);
      }
      const randomUserID = friends[Math.floor(Math.random() * friends.length)];
      const userInfo = await api.getUserInfo([randomUserID]);
      const realName = userInfo[randomUserID]?.name || 'Unknown';
      const apiURL = `https://api-canvass.vercel.app/rainbow?userid=${randomUserID}`;
      const outputPath = path.join(__dirname, `cache/gay_${randomUserID}.png`);
      const response = await axios({
        method: 'get',
        url: apiURL,
        responseType: 'stream',
      });
      await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
      const writer = fs.createWriteStream(outputPath);
      response.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
      await api.sendMessage(
        {
          body: AuroraBetaStyler.styleOutput({
            headerText: 'Bakla Result',
            headerSymbol: '🌈',
            headerStyle: 'bold',
            bodyText: `Look, I found a gay: ${realName} 😆`,
            bodyStyle: 'sansSerif',
            footerText: '',
          }),
          attachment: fs.createReadStream(outputPath),
        },
        threadID,
        () => fs.promises.unlink(outputPath).catch(err => console.error('Error deleting image:', err.message)),
        messageID,
      );
    } catch (error) {
      console.error('Bakla command error:', error.stack || error.message);
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Bakla Error',
        headerSymbol: '❌',
        headerStyle: 'bold',
        bodyText: 'An error occurred while generating the image.',
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      await api.sendMessage(errorMessage, threadID, messageID);
    }
  },
};

export default gayCommand;