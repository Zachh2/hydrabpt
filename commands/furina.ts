import axios from 'axios';
import AuroraBetaStyler from '@aurora/styler';


const furinaCommand: ShadowBot.Command = {
  config: {
    name: 'furina',
    description: 'Interact with the Furina API for conversational responses.',
    usage: 'furina <query>',
    nonPrefix: false,
  },
  run: async ({ api, event, args }) => {
    const { threadID, messageID, senderID } = event;
    const query = args.join(' ').trim();

    if (!query) {
      return api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: 'Furina',
          headerSymbol: '⚠️',
          headerStyle: 'bold',
          bodyText: 'Please provide a query (e.g., /furina Hello!).',
          bodyStyle: 'sansSerif',
          footerText: '',
        }),
        threadID,
        messageID,
      );
    }

    try {
      const { data } = await axios.get('https://rapido.zetsu.xyz/api/furina', {
        params: { ask: query, uid: senderID },
      });
      const response = data.response || 'No response from Furina API.';
      const message = AuroraBetaStyler.styleOutput({
        headerText: 'Furina',
        headerSymbol: '🤖',
        headerStyle: 'bold',
        bodyText: `${response}`,
        bodyStyle: 'sansSerif',
        footerText: 'Reply to this message to continue',
      });

      let sentMessageID: string;
      await new Promise((resolve, reject) => {
        api.sendMessage(message, threadID, (err: any, messageInfo: any) => {
          if (err) reject(err);
          sentMessageID = messageInfo.messageID;
          resolve(messageInfo);
        }, messageID);
      });

      if (!global.Kagenou.replyListeners) {
        global.Kagenou.replyListeners = new Map();
      }

      const handleReply = async (ctx: { api: any; event: any }) => {
        const { api, event } = ctx;
        const { threadID, messageID } = event;
        const userReply = event.body?.trim() || '';

        try {
          const { data: followUpData } = await axios.get('https://rapido.zetsu.xyz/api/furina', {
            params: { ask: userReply, uid: senderID },
          });
          const newResponse = followUpData.response || 'No response from Furina API.';
          const newMessage = AuroraBetaStyler.styleOutput({
            headerText: 'Furina',
            headerSymbol: '🤖',
            headerStyle: 'bold',
            bodyText: `${newResponse}`,
            bodyStyle: 'sansSerif',
            footerText: 'Reply to this message to continue',
          });

          let newSentMessageID: string;
          await new Promise((resolve, reject) => {
            api.sendMessage(newMessage, threadID, (err: any, newMessageInfo: any) => {
              if (err) reject(err);
              newSentMessageID = newMessageInfo.messageID;
              resolve(newMessageInfo);
            }, messageID);
          });

          global.Kagenou.replyListeners.set(newSentMessageID, { callback: handleReply });
        } catch (error) {
          api.sendMessage(
            AuroraBetaStyler.styleOutput({
              headerText: 'Furina Error',
              headerSymbol: '❌',
              headerStyle: 'bold',
              bodyText: 'Failed to process your reply.',
              bodyStyle: 'sansSerif',
              footerText: '',
            }),
            threadID,
            messageID,
          );
        }
      };

      global.Kagenou.replyListeners.set(sentMessageID, { callback: handleReply });
    } catch (error) {
      api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: 'Furina Error',
          headerSymbol: '❌',
          headerStyle: 'bold',
          bodyText: 'Failed to contact the Furina API.',
          bodyStyle: 'sansSerif',
          footerText: '',
        }),
        threadID,
        messageID,
      );
    }
  },
};

export default furinaCommand;