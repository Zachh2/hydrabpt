import AuroraBetaStyler from '@aurora/styler';


const linkwarnCommand: ShadowBot.Command = {
  config: {
    name: 'linkwarn',
    description: 'Warns users when they send URLs.',
    usage: 'Automatic (send a URL)',
    nonPrefix: false,
    role: 0,
  },
  handleEvent: async ({ api, event }) => {
    if (event.type !== 'message' || event.senderID === api.getCurrentUserID()) return;
    const { body, threadID, messageID, senderID } = event;
    const urlRegex = /https?:\/\/[^\s]+/;
    if (urlRegex.test(body || '')) {
      const userInfo = await api.getUserInfo([senderID]);
      const userName = userInfo[senderID]?.name || 'User';
      await api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: 'Link Warning',
          headerSymbol: '🔗',
          headerStyle: 'bold',
          bodyText: `${userName}, please be cautious when sharing links!`,
          bodyStyle: 'sansSerif',
          footerText: '',
        }),
        threadID,
        messageID,
      );
    }
  },
};

export default linkwarnCommand;