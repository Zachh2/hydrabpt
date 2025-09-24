const AuroraBetaStyler = require('@aurora/styler');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'config', 'anti-out.json');

const loadThreadStates = () => {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    return {};
  } catch (error) {
    console.error('Error loading anti-out.json:', error);
    return {};
  }
};

const saveThreadStates = (states) => {
  try {
    fs.writeFileSync(configPath, JSON.stringify(states, null, 2));
  } catch (error) {
    console.error('Error saving anti-out.json:', error);
  }
};

const threadStates = loadThreadStates();

module.exports = {
  config: {
    name: 'anti-out',
    description: 'Automatically re-adds members who leave the group chat with on/off toggle.',
    role: 2,
    usage: '/anti-out [on|off]',
    category: 'Moderation 🛡️',
  },
  handleEvent: true,
  async handleEvent({ api, event }) {
    if (event.logMessageType === 'log:unsubscribe') {
      const { threadID, logMessageData } = event;
      if (!threadStates[threadID]) return;
      const leftUserId = logMessageData.leftParticipantFbId;
      if (leftUserId === api.getCurrentUserID()) return;
      try {
        const userInfo = await api.getUserInfo([leftUserId]);
        const userName = userInfo[leftUserId]?.name || 'Unknown';
        await api.addUserToGroup(leftUserId, threadID);
        await api.sendMessage(
          AuroraBetaStyler.styleOutput({
            headerText: 'Anti-Out',
            headerSymbol: '🔙',
            headerStyle: 'bold',
            bodyText: `${userName} (UID: ${leftUserId}) was re-added to the group.`,
            bodyStyle: 'sansSerif',
            footerText: '',
          }),
          threadID,
        );
      } catch (error) {
        console.error('Error re-adding user:', error);
        await api.sendMessage(
          AuroraBetaStyler.styleOutput({
            headerText: 'Anti-Out Error',
            headerSymbol: '❌',
            headerStyle: 'bold',
            bodyText: `Failed to re-add user (UID: ${leftUserId}): ${error.message}`,
            bodyStyle: 'sansSerif',
            footerText: '',
          }),
          threadID,
        );
      }
    }
  },
  run: async ({ api, event, args }) => {
    const { threadID, messageID } = event;
    const action = args[0]?.toLowerCase();
    if (action === 'on') {
      threadStates[threadID] = true;
      saveThreadStates(threadStates);
      return api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: 'Anti-Out',
          headerSymbol: '✅',
          headerStyle: 'bold',
          bodyText: 'Anti-Out is now enabled for this thread.',
          bodyStyle: 'sansSerif',
          footerText: '',
        }),
        threadID,
        messageID,
      );
    } else if (action === 'off') {
      threadStates[threadID] = false;
      saveThreadStates(threadStates);
      return api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: 'Anti-Out',
          headerSymbol: '❌',
          headerStyle: 'bold',
          bodyText: 'Anti-Out is now disabled for this thread.',
          bodyStyle: 'sansSerif',
          footerText: '',
        }),
        threadID,
        messageID,
      );
    } else {
      return api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: 'Anti-Out',
          headerSymbol: '⚠️',
          headerStyle: 'bold',
          bodyText: 'Usage: /anti-out [on|off]',
          bodyStyle: 'sansSerif',
          footerText: '',
        }),
        threadID,
        messageID,
      );
    }
  },
};