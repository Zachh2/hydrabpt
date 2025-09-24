import AuroraBetaStyler from '@aurora/styler';
import { LINE } from '@aurora/styler';

function sleep(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

const filteruserCommand: ShadowBot.Command = {
  config: {
    name: 'filteruser',
    description: 'Filter group members by number of messages or locked account',
    usage: '/filteruser [<number of messages> | die]',
    aliases: [],
    category: 'box chat',
    role: 1,
    author: 'NTKhang | Aljur pogoy ',
    nonPrefix: false,
  },
  run: async ({ api, event, args }) => {
    const { threadID, messageID } = event;
    if (!threadID || !messageID) {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Filteruser Error',
        headerSymbol: '❌',
        headerStyle: 'bold',
        bodyText: 'Missing threadID or messageID in event',
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      return api.sendMessage(errorMessage, threadID, messageID);
    }
    const botID = api.getCurrentUserID();
    const threadInfo = await api.getThreadInfo(threadID);
    if (!threadInfo.adminIDs.some((id: any) => id.id === botID)) {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Filteruser Error',
        headerSymbol: '⚠️',
        headerStyle: 'bold',
        bodyText: 'Please add the bot as a group admin to use this command',
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      return api.sendMessage(errorMessage, threadID, messageID);
    }
    if (!isNaN(Number(args[0]))) {
      const minimum = Number(args[0]);
      const promptMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Filteruser Confirm',
        headerSymbol: '⚠️',
        headerStyle: 'bold',
        bodyText: `Are you sure you want to delete group members with less than ${minimum} messages?\nReact to this message to confirm`,
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      const messageInfo = await new Promise((resolve, reject) => {
        api.sendMessage(promptMessage, threadID, (err: any, info: any) => {
          if (err) return reject(err);
          resolve(info);
        }, messageID);
      }) as { messageID: string };
      const normalizedMessageID = messageInfo.messageID.trim().replace(/\s+/g, '');
      global.reactionData.set(normalizedMessageID, {
        messageID: normalizedMessageID,
        threadID,
        authorID: event.senderID,
        callback: async ({ api, event, reaction, threadID, messageID, senderID }: { api: any; event: any; reaction: string; threadID: string; messageID: string; senderID: string }) => {
          const botID = api.getCurrentUserID();
          const threadInfo = await api.getThreadInfo(threadID);
          const members = threadInfo.userInfo.map((user: any) => ({
            userID: user.id,
            name: user.name,
            count: user.messageCount || 0,
            inGroup: user.type === 'User',
          }));
          const membersCountLess = members.filter(
            (member: any) =>
              member.count < minimum &&
              member.inGroup &&
              member.userID !== botID &&
              !threadInfo.adminIDs.some((id: any) => id.id === member.userID),
          );
          const errors: string[] = [];
          const success: string[] = [];
          for (const member of membersCountLess) {
            try {
              await api.removeUserFromGroup(member.userID, threadID);
              success.push(member.userID);
            } catch (e) {
              errors.push(member.name || `User ${member.userID}`);
            }
            await sleep(700);
          }
          let msg = '';
          if (success.length > 0) {
            msg += `✅ Successfully removed ${success.length} members with less than ${minimum} messages\n`;
          }
          if (errors.length > 0) {
            msg += `❌ An error occurred and could not kick ${errors.length} members:\n${errors.join('\n')}\n`;
          }
          if (msg === '') {
            msg += `✅ There are no members with less than ${minimum} messages`;
          }
          await api.sendMessage(
            AuroraBetaStyler.styleOutput({
              headerText: 'Filteruser Result',
              headerSymbol: '✅',
              headerStyle: 'bold',
              bodyText: msg.trim(),
              bodyStyle: 'sansSerif',
              footerText: '',
            }),
            threadID,
            messageID,
          );
          global.reactionData.delete(normalizedMessageID);
        },
      });
    } else if (args[0]?.toLowerCase() === 'die') {
      const membersBlocked = threadInfo.userInfo.filter((user: any) => user.type !== 'User');
      const errors: string[] = [];
      const success: string[] = [];
      for (const user of membersBlocked) {
        if (!threadInfo.adminIDs.some((id: any) => id.id === user.id)) {
          try {
            await api.removeUserFromGroup(user.id, threadID);
            success.push(user.id);
          } catch (e) {
            errors.push(user.name || `User ${user.id}`);
          }
          await sleep(700);
        }
      }
      let msg = '';
      if (success.length > 0) {
        msg += `✅ Successfully removed ${success.length} members unavailable account\n`;
      }
      if (errors.length > 0) {
        msg += `❌ An error occurred and could not kick ${errors.length} members:\n${errors.join('\n')}\n`;
      }
      if (msg === '') {
        msg += '✅ There are no members who are locked acc';
      }
      await api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: 'Filteruser Result',
          headerSymbol: '✅',
          headerStyle: 'bold',
          bodyText: msg.trim(),
          bodyStyle: 'sansSerif',
          footerText: '',
        }),
        threadID,
        messageID,
      );
    } else {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Filteruser Error',
        headerSymbol: '❌',
        headerStyle: 'bold',
        bodyText: `Invalid usage. Use: ${filteruserCommand.config.usage}`,
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      await api.sendMessage(errorMessage, threadID, messageID);
    }
  },
  onReaction: async ({ api, event, reaction }) => {
    console.log('[DEBUG] onReaction triggered:', reaction, 'for MessageID:', event.messageID);
    const { threadID, messageID, senderID } = event;
    const normalizedMessageID = messageID.trim().replace(/\s+/g, '');
    const reactionData = global.reactionData.get(normalizedMessageID);
    if (reactionData && reactionData.authorID === senderID && reactionData.callback) {
      await reactionData.callback({ api, event, reaction, threadID, messageID, senderID });
    }
  },
};

export default filteruserCommand;