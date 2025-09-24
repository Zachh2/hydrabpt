import fs from 'fs';
import path from 'path';
import AuroraBetaStyler from '@aurora/styler';


const configPath = path.join(__dirname, '..', 'antispam.json');
const loadStates = () => fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
const saveStates = (states: any) => fs.writeFileSync(configPath, JSON.stringify(states, null, 2));
const threadStates = loadStates();
const messageTimestamps: { [key: string]: number[] } = {};

const antispamCommand: ShadowBot.Command = {
    config: {
    name: 'anti-spam',
    description: 'Warns users for spamming messages.',
    usage: 'anti-spam [on|off]',
    nonPrefix: false,
    role: 2,
  },
  handleEvent: async ({ api, event }) => {
    if (event.type !== 'message' || !threadStates[event.threadID]) return;
    const { senderID, threadID } = event;
    if (senderID === api.getCurrentUserID()) return;
    const now = Date.now();
    messageTimestamps[senderID] = messageTimestamps[senderID] || [];
    messageTimestamps[senderID].push(now);
    messageTimestamps[senderID] = messageTimestamps[senderID].filter((t: number) => now - t < 10000);
    if (messageTimestamps[senderID].length > 5) {
      const userInfo = await api.getUserInfo([senderID]);
      const userName = userInfo[senderID]?.name || 'User';
      await api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: 'Anti-Spam',
          headerSymbol: '🚨',
          headerStyle: 'bold',
          bodyText: `${userName}, please stop spamming! or else you'll get kicked.`,
          bodyStyle: 'sansSerif',
          footerText: '',
        }),
        threadID,
      );
    }
  },
  run: async ({ api, event, args }) => {
    const { threadID, messageID } = event;
    const action = args[0]?.toLowerCase();
    if (action === 'on') {
      threadStates[threadID] = true;
      saveStates(threadStates);
      return api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: 'Anti-Spam',
          headerSymbol: '✅',
          headerStyle: 'bold',
          bodyText: 'Anti-spam enabled.',
          bodyStyle: 'sansSerif',
          footerText: '',
        }),
        threadID,
        messageID,
      );
    } else if (action === 'off') {
      threadStates[threadID] = false;
      saveStates(threadStates);
      return api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: 'Anti-Spam',
          headerSymbol: '❌',
          headerStyle: 'bold',
          bodyText: 'Anti-spam disabled.',
          bodyStyle: 'sansSerif',
          footerText: '',
        }),
        threadID,
        messageID,
      );
    }
    return api.sendMessage(
      AuroraBetaStyler.styleOutput({
        headerText: 'Anti-Spam',
        headerSymbol: '⚠️',
        headerStyle: 'bold',
        bodyText: 'Usage: /antispam [on|off]',
        bodyStyle: 'sansSerif',
        footerText: '',
        }),
        threadID,
        messageID,
      );
    },
};

export default antispamCommand;