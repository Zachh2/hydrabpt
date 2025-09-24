const AuroraBetaStyler = require('@aurora/styler');

/**
 * @type {Object}
 * @property {Object} config - Command configuration
 * @property {Function} handleEvent - Handles message and message_reply events
 * @property {Function} run - Handles /setblacklist command execution
 */
const autoKickCommand = {
  config: {
    name: 'setblacklist',
    description: 'Set or remove blacklisted words for auto-warning and kick after 3 attempts (exempts admins, moderators, developers)',
    usage: '/setblacklist <word1> <word2> ... | /setblacklist remove <word>',
    role: 3,
    cooldown: 5,
    aliases: ['blacklist'],
    category: 'Moderation 🛡️',
  },
  handleEvent: async ({ api, event, db }) => {
    if (event.type !== 'message' && event.type !== 'message_reply') return;
    const threadID = event.threadID;
    const senderID = event.senderID;
    const message = event.body ? event.body.toLowerCase() : '';

    // Check user role (0: user, 1: admin, 2: moderator, 3: developer)
    const userRole = global.getUserRole ? global.getUserRole(senderID) : 0;
    if (userRole >= 1) {
      console.log(`[EVENT_DEBUG] autoKick skipped for user ${senderID} (role: ${userRole})`);
      return; // Exempt admins, moderators, developers
    }

    const blacklist = global.globalData.get(`blacklist_${threadID}`) || [];
    if (!blacklist.length) return;

    const matchedWord = blacklist.find(word => message.includes(word.toLowerCase()));
    if (!matchedWord) return;

    try {
      const attemptsKey = `attempts_${threadID}_${senderID}`;
      let attempts = global.globalData.get(attemptsKey) || 0;
      attempts += 1;

      if (attempts >= 3) {
        await api.removeUserFromGroup(senderID, threadID);
        const styledMessage = AuroraBetaStyler.styleOutput({
          headerText: 'User Removed',
          headerSymbol: '🚫',
          headerStyle: 'bold',
          bodyText: `User ${senderID} was removed after 3 warnings for using blacklisted word: ${matchedWord}`,
          bodyStyle: 'bold',
          footerText: '',
        });
        await api.sendMessage(styledMessage, threadID);
        global.globalData.delete(attemptsKey);
        if (db) {
          await db.db('threads').updateOne(
            { threadID },
            { $unset: { [`attempts.${senderID}`]: '' } }
          );
        }
      } else {
        global.globalData.set(attemptsKey, attempts);
        if (db) {
          await db.db('threads').updateOne(
            { threadID },
            { $set: { [`attempts.${senderID}`]: attempts } },
            { upsert: true }
          );
        }
        const styledMessage = AuroraBetaStyler.styleOutput({
          headerText: 'Warning',
          headerSymbol: '⚠️',
          headerStyle: 'bold',
          bodyText: `Please avoid using blacklisted word: ${matchedWord}. Warning ${attempts}/3.`,
          bodyStyle: 'bold',
          footerText: '',
        });
        await api.sendMessage(styledMessage, threadID);
      }
      console.log(`[EVENT_DEBUG] autoKick processed for user ${senderID}, word: ${matchedWord}, attempts: ${attempts}`);
    } catch (error) {
      console.error(`[EVENT_DEBUG] autoKick failed for user ${senderID}:`, error);
      const styledMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Error',
        headerSymbol: '❌',
        headerStyle: 'bold',
        bodyText: `Failed to process blacklist warning: ${error.message}`,
        bodyStyle: 'bold',
        footerText: '',
      });
      await api.sendMessage(styledMessage, threadID);
    }
  },
  run: async ({ api, event, args, db }) => {
    const { threadID, messageID } = event;
    if (!args.length) {
      const styledMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Invalid Input',
        headerSymbol: '❌',
        headerStyle: 'bold',
        bodyText: 'Usage: /setblacklist <word1> <word2> ... or /setblacklist remove <word>',
        bodyStyle: 'bold',
        footerText: '',
      });
      return api.sendMessage(styledMessage, threadID, messageID);
    }

    const subcommand = args[0].toLowerCase();
    if (subcommand === 'remove' && args.length === 2) {
      const word = args[1].toLowerCase();
      try {
        const blacklist = global.globalData.get(`blacklist_${threadID}`) || [];
        if (!blacklist.includes(word)) {
          const styledMessage = AuroraBetaStyler.styleOutput({
            headerText: 'Not Found',
            headerSymbol: '❌',
            headerStyle: 'bold',
            bodyText: `Word "${word}" is not in the blacklist.`,
            bodyStyle: 'bold',
            footerText: '',
          });
          return api.sendMessage(styledMessage, threadID, messageID);
        }
        const updatedBlacklist = blacklist.filter(w => w !== word);
        global.globalData.set(`blacklist_${threadID}`, updatedBlacklist);
        if (db) {
          await db.db('threads').updateOne(
            { threadID },
            { $set: { blacklist: updatedBlacklist } },
            { upsert: true }
          );
        }
        const styledMessage = AuroraBetaStyler.styleOutput({
          headerText: 'Blacklist Updated',
          headerSymbol: '✅',
          headerStyle: 'bold',
          bodyText: `Removed "${word}" from blacklist.`,
          bodyStyle: 'bold',
          footerText: '',
        });
        await api.sendMessage(styledMessage, threadID, messageID);
      } catch (error) {
        console.error(`[EVENT_DEBUG] autoKick remove failed:`, error);
        const styledMessage = AuroraBetaStyler.styleOutput({
          headerText: 'Error',
          headerSymbol: '❌',
          headerStyle: 'bold',
          bodyText: `Failed to remove word: ${error.message}`,
          bodyStyle: 'bold',
          footerText: '',
        });
        await api.sendMessage(styledMessage, threadID, messageID);
        await api.setMessageReaction('❌', messageID, () => {});
      }
    } else {
      const words = args.map(word => word.toLowerCase()).filter(word => word);
      if (!words.length) {
        const styledMessage = AuroraBetaStyler.styleOutput({
          headerText: 'Invalid Input',
          headerSymbol: '❌',
          headerStyle: 'bold',
          bodyText: 'Please provide words to blacklist (e.g., /setblacklist badword1 badword2).',
          bodyStyle: 'bold',
          footerText: '',
        });
        return api.sendMessage(styledMessage, threadID, messageID);
      }

      try {
        global.globalData.set(`blacklist_${threadID}`, words);
        if (db) {
          await db.db('threads').updateOne(
            { threadID },
            { $set: { blacklist: words } },
            { upsert: true }
          );
        }
        const styledMessage = AuroraBetaStyler.styleOutput({
          headerText: 'Blacklist Updated',
          headerSymbol: '✅',
          headerStyle: 'bold',
          bodyText: `Blacklisted words set: ${words.join(', ')}`,
          bodyStyle: 'bold',
          footerText: '',
        });
        await api.sendMessage(styledMessage, threadID, messageID);
      } catch (error) {
        console.error(`[EVENT_DEBUG] autoKick set failed:`, error);
        const styledMessage = AuroraBetaStyler.styleOutput({
          headerText: 'Error',
          headerSymbol: '❌',
          headerStyle: 'bold',
          bodyText: `Failed to update blacklist: ${error.message}`,
          bodyStyle: 'bold',
          footerText: '',
        });
        await api.sendMessage(styledMessage, threadID, messageID);
        await api.setMessageReaction('❌', messageID, () => {});
      }
    }
  },
};

module.exports = autoKickCommand;