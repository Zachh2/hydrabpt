import AuroraBetaStyler from '@aurora/styler';


const warningTracker = new Map<string, { count: number; reasons: string[] }>();

const warnCommand: ShadowBot.Command = {
  config: {
    name: 'warn',
    description: 'Warn a user for rule-breaking, kicks after 3 warnings',
    usage: '/warn <@user> [reason] (or reply to a message)',
    aliases: ['warnuser'],
    category: 'admin',
    role: 3, // Admin role required
    author: 'Aljur Pogoy',
    nonPrefix: false,
  },
  async run({ api, event }) {
    const { threadID, messageID, senderID, body, messageReply, mentions } = event;
    console.log('Warn run:', { threadID, messageID, senderID, body, messageReply, mentions }); // Debug

    let targetID: string | undefined;
    let reason = 'No reason provided';

    // Check if targeting via reply or mention
    if (messageReply && messageReply.senderID) {
      targetID = messageReply.senderID;
      reason = body.split(' ').slice(1).join(' ').trim() || reason;
    } else if (mentions && Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
      reason = body.split(' ').slice(2).join(' ').trim() || reason;
    } else {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Warn Error',
        headerSymbol: '❌',
        headerStyle: 'bold',
        bodyText: 'Please mention a user or reply to their message.\nExample: /warn @user Spamming',
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      console.log('Warn error: No target user specified');
      return api.sendMessage(errorMessage, threadID, messageID);
    }

    if (targetID === api.getCurrentUserID()) {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Warn Error',
        headerSymbol: '❌',
        headerStyle: 'bold',
        bodyText: 'Cannot warn the bot!',
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      console.log('Warn error: Attempted to warn bot');
      return api.sendMessage(errorMessage, threadID, messageID);
    }

    try {
      const userInfo = await new Promise((resolve, reject) => {
        api.getUserInfo([targetID], (err: any, info: any) => {
          if (err) return reject(err);
          resolve(info);
        });
      });
      const userName = userInfo[targetID]?.name || 'Unknown User';

      const key = `${threadID}:${targetID}`;
      const userWarnings = warningTracker.get(key) || { count: 0, reasons: [] };
      userWarnings.count += 1;
      userWarnings.reasons.push(reason);
      warningTracker.set(key, userWarnings);

      console.log(`Warned ${userName} (${targetID}) in ${threadID}: ${userWarnings.count}/3, Reason: ${reason}`);

      if (userWarnings.count >= 3) {
        await new Promise((resolve, reject) => {
          api.removeUserFromGroup(targetID, threadID, (err: any) => {
            if (err) return reject(err);
            console.log(`Kicked ${userName} (${targetID}) from ${threadID} after 3 warnings`);
            resolve(undefined); // Fix: Explicitly resolve with undefined for Promise<void>
          });
        });
        warningTracker.delete(key);
        const kickMessage = AuroraBetaStyler.styleOutput({
          headerText: 'User Kicked',
          headerSymbol: '🚨',
          headerStyle: 'bold',
          bodyText: `${userName} was kicked after 3 warnings: ${userWarnings.reasons.join(', ')}.`,
          bodyStyle: 'sansSerif',
          footerText: '',
        });
        await api.sendMessage(kickMessage, threadID, messageID);
      } else {
        const warningMessage = AuroraBetaStyler.styleOutput({
          headerText: 'User Warned',
          headerSymbol: '⚠️',
          headerStyle: 'bold',
          bodyText: `${userName}, you’ve been warned (${userWarnings.count}/3) for: ${reason}.`,
          bodyStyle: 'sansSerif',
          footerText: '',
        });
        await api.sendMessage(warningMessage, threadID, messageID);
      }
    } catch (error) {
      console.error('Warn error:', error.stack || error.message);
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Warn Error',
        headerSymbol: '❌',
        headerStyle: 'bold',
        bodyText: `Failed to warn user: ${error.message || 'Unknown error'}`,
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      await api.sendMessage(errorMessage, threadID, messageID);
    }
  },
};

export default warnCommand;