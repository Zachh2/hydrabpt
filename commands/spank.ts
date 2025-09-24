import AuroraBetaStyler from '@aurora/styler';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const spankCommand: ShadowBot.Command = {
  config: {
    name: 'spank',
    description: 'Spank someone using their profile picture',
    usage: '[reply/@mention/uid]',
    aliases: [],
    category: 'fun',
    role: 0,
    author: 'Aljur Pogoy',
    nonPrefix: false,
  },
  run: async ({ api, event, args }) => {
    const { threadID, messageID, senderID } = event;
    if (!threadID || !messageID) {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Spank Error',
        headerSymbol: '❌',
        headerStyle: 'bold',
        bodyText: 'Missing threadID or messageID in event',
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      return api.sendMessage(errorMessage, threadID, messageID);
    }
    let targetID;
    if (args.join().includes('@')) {
      targetID = Object.keys(event.mentions)[0];
    } else if (event.type === 'message_reply') {
      targetID = event.messageReply.senderID;
    } else if (args[0]) {
      targetID = args[0];
    } else {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Spank Error',
        headerSymbol: '❌',
        headerStyle: 'bold',
        bodyText: 'Please reply to a target, mention a user, or provide a UID.',
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      return api.sendMessage(errorMessage, threadID, messageID);
    }
    try {
      const [data1, data2] = await Promise.all([
        api.getUserInfo([senderID]),
        api.getUserInfo([targetID]),
      ]);
      const name1 = data1[senderID]?.name || 'Unknown';
      const name2 = data2[targetID]?.name || 'Unknown';
      const spankURL = `https://api-canvass.vercel.app/spank?uid1=${senderID}&uid2=${targetID}`;
      const outputPath = path.join(__dirname, 'cache', `spank_${senderID}_${targetID}.png`);
      await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
      const response = await axios.get(spankURL, { responseType: 'stream' });
      const writer = fs.createWriteStream(outputPath);
      response.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
      await api.sendMessage(
        {
          body: AuroraBetaStyler.styleOutput({
            headerText: 'Spank Result',
            headerSymbol: '🍑',
            headerStyle: 'bold',
            bodyText: `${name1} has spanked ${name2}!`,
            bodyStyle: 'sansSerif',
            footerText: '',
          }),
          attachment: fs.createReadStream(outputPath),
        },
        threadID,
        () => fs.promises.unlink(outputPath).catch(console.error),
        messageID,
      );
    } catch (error) {
      console.error('Spank command error:', error.stack || error.message);
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Spank Error',
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

export default spankCommand;