import axios from 'axios';
import fs from 'fs';
import AuroraBetaStyler from '@aurora/styler';

const wantedCommand: ShadowBot.Command = {
  config: {
    name: "wanted",
    role: 0,
    author: "Aljur pogoy",
    description: "Generate a Wanted poster meme.",
    cooldown: 5,
    usage: "wanted | wanted reply | wanted @mention | wanted <uid>",
  },
  run: async ({ api, event, args }) => {
    const { threadID, messageID } = event;
    let targetID = event.senderID;

    if (args.length > 0) {
      if (args[0].startsWith('@')) {
        targetID = Object.keys(event.mentions)[0] || targetID;
      } else if (args[0].match(/^\d+$/)) {
        targetID = args[0].trim();
      } else if (args[0] === "reply" && event.messageReply) {
        targetID = event.messageReply.senderID;
      }
    }

    api.getUserInfo(targetID, (err: any, result: { [key: string]: { name: string } }) => {
      if (err) {
        return api.sendMessage(AuroraBetaStyler.styleOutput({
          headerText: 'Wanted',
          headerSymbol: '⚠️',
          headerStyle: 'bold',
          bodyText: `Failed to retrieve user info: ${err.message}`,
          bodyStyle: 'sansSerif',
          footerText: '',
        }), threadID, messageID);
      }

      const userName = result[targetID]?.name || "User";
      const outputPath = __dirname + `/cache/wanted_${threadID}_${messageID}.png`;

      axios({
        method: 'get',
        url: `https://api-canvass.vercel.app/wanted?userid=${targetID}`,
        responseType: 'stream',
      })
        .then(response => {
          const writer = fs.createWriteStream(outputPath);
          response.data.pipe(writer);

          writer.on("finish", () => {
            api.sendMessage({
              body: AuroraBetaStyler.styleOutput({
                headerText: 'Wanted',
                headerSymbol: '⚠️',
                headerStyle: 'bold',
                bodyText: `${userName} is wanted! Dead or Alive!`,
                bodyStyle: 'sansSerif',
                footerText: '',
              }),
              attachment: fs.createReadStream(outputPath),
            }, threadID, () => {
              fs.unlinkSync(outputPath);
            }, messageID);
          });

          writer.on("error", (err: Error) => {
            api.sendMessage(AuroraBetaStyler.styleOutput({
              headerText: 'Wanted',
              headerSymbol: '⚠️',
              headerStyle: 'bold',
              bodyText: `Error while saving image: ${err.message}`,
              bodyStyle: 'sansSerif',
              footerText: '',
            }), threadID, messageID);
          });
        })
        .catch((error: Error) => {
          api.sendMessage(AuroraBetaStyler.styleOutput({
            headerText: 'Wanted',
            headerSymbol: '⚠️',
            headerStyle: 'bold',
            bodyText: `Failed to generate image: ${error.message}`,
            bodyStyle: 'sansSerif',
            footerText: '',
          }), threadID, messageID);
        });
    });
  },
};

export default wantedCommand;