import AuroraBetaStyler from '@aurora/styler';

interface UserData {
  balance: number;
  gifts: { uid: string; amount: number; date: string; accepted: boolean }[];
}

module.exports = {
  config: {
    name: "gift",
    author: "Aljur Pogoy",
    description: "Manage gifts between users!",
    usage: "/gift <give|accept|decline|list> [UID] [amount]",
    version: "1.0.0",
  },
  run: async ({ api, event, args, usersData }) => {
    const { threadID, messageID, senderID } = event;
    let user = usersData.get(senderID) || { balance: 0, gifts: [] };
    user.balance = user.balance || 0;
    user.gifts = user.gifts || [];
    usersData.set(senderID, user);

    const subcommand = args[0]?.toLowerCase();
    const targetUID = args[1];
    const amount = parseInt(args[2]);

    if (!subcommand) {
      return api.sendMessage(AuroraBetaStyler.styleOutput({
        headerText: 'Gift Menu',
        headerSymbol: '🎁',
        headerStyle: 'bold',
        bodyText: '📦 Give - /gift give <UID> <amount>\n✅ Accept - /gift accept\n❌ Decline - /gift decline\n📋 List - /gift list\n\n> Share coins with friends!',
        bodyStyle: 'sansSerif',
        footerText: '',
      }), threadID, messageID);
    }

    switch (subcommand) {
      case "give":
        if (!targetUID || isNaN(amount) || amount <= 0) {
          return api.sendMessage(AuroraBetaStyler.styleOutput({
            headerText: 'Gift Give',
            headerSymbol: '🎁',
            headerStyle: 'bold',
            bodyText: '❌ Please provide a valid UID and amount!\nUsage: /gift give <UID> <amount>\nExample: /gift give 123456789 1000',
            bodyStyle: 'sansSerif',
            footerText: '',
          }), threadID, messageID);
        }
        if (targetUID === senderID) {
          return api.sendMessage(AuroraBetaStyler.styleOutput({
            headerText: 'Gift Give',
            headerSymbol: '🎁',
            headerStyle: 'bold',
            bodyText: '❌ You cannot gift yourself!',
            bodyStyle: 'sansSerif',
            footerText: '',
          }), threadID, messageID);
        }
        if (user.balance < amount) {
          return api.sendMessage(AuroraBetaStyler.styleOutput({
            headerText: 'Gift Give',
            headerSymbol: '🎁',
            headerStyle: 'bold',
            bodyText: '❌ Insufficient balance!\nYour Balance: ' + user.balance.toLocaleString() + ' coins\nRequired: ' + amount.toLocaleString() + ' coins',
            bodyStyle: 'sansSerif',
            footerText: '',
          }), threadID, messageID);
        }

        const targetUser = usersData.get(targetUID) || { balance: 0, gifts: [] };
        targetUser.gifts = targetUser.gifts || [];
        const date = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
        targetUser.gifts.push({ uid: senderID, amount, date, accepted: false });
        usersData.set(targetUID, targetUser);

        user.balance -= amount;
        usersData.set(senderID, user);

        return api.sendMessage(AuroraBetaStyler.styleOutput({
          headerText: 'Gift Give',
          headerSymbol: '🎁',
          headerStyle: 'bold',
          bodyText: '✅ Gift of ' + amount.toLocaleString() + ' coins sent to UID ' + targetUID + '!\nAwait their acceptance.',
          bodyStyle: 'sansSerif',
          footerText: '',
        }), threadID, messageID);

      case "list":
        if (user.gifts.length === 0) {
          return api.sendMessage(AuroraBetaStyler.styleOutput({
            headerText: 'Gift List',
            headerSymbol: '📋',
            headerStyle: 'bold',
            bodyText: '❌ No gifts to display!',
            bodyStyle: 'sansSerif',
            footerText: '',
          }), threadID, messageID);
        }

        let listMessage = 'All Gifts\n';
        user.gifts.forEach((gift, index) => {
          listMessage += `${index + 1}. ${gift.amount.toLocaleString()} coins\nDate: ${gift.date}\n`;
        });
        listMessage += '\nReply with Gift accept <number> or Gift decline <number>\nExample: Gift accept 2';

        let sentMessageID: string;
        await new Promise(resolve => {
          api.sendMessage(AuroraBetaStyler.styleOutput({
            headerText: 'Gift List',
            headerSymbol: '📋',
            headerStyle: 'bold',
            bodyText: listMessage,
            bodyStyle: 'sansSerif',
            footerText: '',
          }), threadID, (err: any, info: any) => {
            sentMessageID = info?.messageID;
            resolve(info);
          }, messageID);
        });

        if (!global.Kagenou.replyListeners) global.Kagenou.replyListeners = new Map();
        global.Kagenou.replyListeners.set(sentMessageID, {
          callback: async ({ api, event }) => {
            const { threadID: replyThreadID, messageID: replyMessageID, body } = event;
            if (replyThreadID !== threadID || !body) return;

            // Parse the reply body into args
            const replyArgs = body.trim().split(/\s+/);
            if (replyArgs.length < 2 || replyArgs[0].toLowerCase() !== 'gift' || !['accept', 'decline'].includes(replyArgs[1].toLowerCase())) {
              await api.sendMessage(AuroraBetaStyler.styleOutput({
                headerText: 'Gift',
                headerSymbol: '🎁',
                headerStyle: 'bold',
                bodyText: '❌ Invalid format! Reply with Gift accept <number> or Gift decline <number>\nExample: Gift accept 2',
                bodyStyle: 'sansSerif',
                footerText: '',
              }), threadID, replyMessageID);
              return;
            }

            const action = replyArgs[1].toLowerCase();
            const giftIndex = parseInt(replyArgs[2]) - 1;
            if (isNaN(giftIndex) || giftIndex < 0 || giftIndex >= user.gifts.length || user.gifts[giftIndex].accepted) {
              await api.sendMessage(AuroraBetaStyler.styleOutput({
                headerText: 'Gift',
                headerSymbol: '🎁',
                headerStyle: 'bold',
                bodyText: '❌ Invalid gift selection or already processed!',
                bodyStyle: 'sansSerif',
                footerText: '',
              }), threadID, replyMessageID);
              return;
            }

            const gift = user.gifts[giftIndex];
            try {
              const info = await api.getUserInfo([gift.uid]);
              if (!info[gift.uid]) {
                throw new Error("User info not found");
              }
              const senderName = info[gift.uid].name;
              if (action === 'accept') {
                user.balance += gift.amount;
                user.gifts[giftIndex].accepted = true;
                usersData.set(senderID, user);
                api.sendMessage(AuroraBetaStyler.styleOutput({
                  headerText: 'Gift Accept',
                  headerSymbol: '✅',
                  headerStyle: 'bold',
                  bodyText: '✅ Accepted Gift by: ' + senderName + '\nSuccess! You received ' + gift.amount.toLocaleString() + ' coins.\nYour Balance: ' + user.balance.toLocaleString() + ' coins',
                  bodyStyle: 'sansSerif',
                  footerText: '',
                }), threadID, replyMessageID);
              } else {
                user.gifts[giftIndex].accepted = true;
                usersData.set(senderID, user);
                api.sendMessage(AuroraBetaStyler.styleOutput({
                  headerText: 'Gift Decline',
                  headerSymbol: '❌',
                  headerStyle: 'bold',
                  bodyText: '❌ Declined ' + gift.amount.toLocaleString() + ' coins from ' + senderName + '.',
                  bodyStyle: 'sansSerif',
                  footerText: '',
                }), threadID, replyMessageID);
              }
            } catch (error) {
              api.sendMessage(AuroraBetaStyler.styleOutput({
                headerText: 'Gift',
                headerSymbol: '🎁',
                headerStyle: 'bold',
                bodyText: '❌ Failed to fetch sender info!',
                bodyStyle: 'sansSerif',
                footerText: '',
              }), threadID, replyMessageID);
            }
            global.Kagenou.replyListeners.delete(sentMessageID);
          }
        });
        break;

      case "accept":
      case "decline":
        return api.sendMessage(AuroraBetaStyler.styleOutput({
          headerText: 'Gift ' + subcommand.charAt(0).toUpperCase() + subcommand.slice(1),
          headerSymbol: subcommand === 'accept' ? '✅' : '❌',
          headerStyle: 'bold',
          bodyText: '❌ Use Gift accept <number> or Gift decline <number> by replying to the gift list!',
          bodyStyle: 'sansSerif',
          footerText: '',
        }), threadID, messageID);

      default:
        return api.sendMessage(AuroraBetaStyler.styleOutput({
          headerText: 'Gift',
          headerSymbol: '🎁',
          headerStyle: 'bold',
          bodyText: '❌ Invalid subcommand! Use: give, accept, decline, or list',
          bodyStyle: 'sansSerif',
          footerText: '',
        }), threadID, messageID);
    }
  },
};