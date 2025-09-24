import AuroraBetaStyler from '@aurora/styler';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const spotifyCommand: ShadowBot.Command = {
  config: {
    name: 'spotify',
    description: 'Search and download Spotify track',
    usage: 'spotify [song name]',
    aliases: [],
    category: 'music',
    role: 0,
    author: 'Aljur Pogoy',
    nonPrefix: true,
    cooldown: 100,
  },
  run: async ({ api, event, args }) => {
    const { threadID, messageID, senderID } = event;
    if (!threadID || !messageID) {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Spotify Error',
        headerSymbol: '❌',
        headerStyle: 'bold',
        bodyText: 'Missing threadID or messageID in event',
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      return api.sendMessage(errorMessage, threadID, messageID);
    }
    if (!args[0]) {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Spotify Error',
        headerSymbol: '❌',
        headerStyle: 'bold',
        bodyText: 'Please provide a search keyword.\nUsage: spotify [song name]',
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      return api.sendMessage(errorMessage, threadID, messageID);
    }
    const keyword = encodeURIComponent(args.join(' '));
    const waitMessage = AuroraBetaStyler.styleOutput({
      headerText: 'Spotify Searching',
      headerSymbol: '🎵',
      headerStyle: 'bold',
      bodyText: 'Tracking song, please wait...',
      bodyStyle: 'sansSerif',
      footerText: '',
    });
    await api.sendMessage(waitMessage, threadID, messageID);
    try {
      const searchURL = `https://kaiz-apis.gleeze.com/api/spotify-search?q=${keyword}&apikey=8aa2f0a0-cbb9-40b8-a7d8-bba320cb9b10`;
      const searchRes = await axios.get(searchURL);
      const track = searchRes.data[0];
      if (!track || !track.trackUrl) {
        const errorMessage = AuroraBetaStyler.styleOutput({
          headerText: 'Spotify Error',
          headerSymbol: '❌',
          headerStyle: 'bold',
          bodyText: 'No Spotify track found.',
          bodyStyle: 'sansSerif',
          footerText: '',
        });
        return api.sendMessage(errorMessage, threadID, messageID);
      }
      const downloadURL = `https://kaiz-apis.gleeze.com/api/spotify-down?url=${encodeURIComponent(track.trackUrl)}&apikey=8aa2f0a0-cbb9-40b8-a7d8-bba320cb9b10`;
      const dlRes = await axios.get(downloadURL);
      const { title, url, artist, thumbnail } = dlRes.data;
      const imgPath = path.join(__dirname, 'cache', `thumb_${senderID}.jpg`);
      const audioPath = path.join(__dirname, 'cache', `audio_${senderID}.mp3`);
      await fs.promises.mkdir(path.dirname(imgPath), { recursive: true });
      const [imgRes, audioRes] = await Promise.all([
        axios.get(thumbnail, { responseType: 'arraybuffer' }),
        axios.get(url, { responseType: 'arraybuffer' }),
      ]);
      await Promise.all([
        fs.promises.writeFile(imgPath, imgRes.data),
        fs.promises.writeFile(audioPath, audioRes.data),
      ]);
      await api.sendMessage(
        {
          body: AuroraBetaStyler.styleOutput({
            headerText: 'Spotify Track Info',
            headerSymbol: '🎵',
            headerStyle: 'bold',
            bodyText: `Title: ${title}\nArtist: ${artist}`,
            bodyStyle: 'sansSerif',
            footerText: '',
          }),
          attachment: fs.createReadStream(imgPath),
        },
        threadID,
        async () => {
          await api.sendMessage(
            {
              body: AuroraBetaStyler.styleOutput({
                headerText: 'Spotify Track Audio',
                headerSymbol: '🎧',
                headerStyle: 'bold',
                bodyText: 'Here’s your Spotify track!',
                bodyStyle: 'sansSerif',
                footerText: '',
              }),
              attachment: fs.createReadStream(audioPath),
            },
            threadID,
            () => {
              Promise.all([
                fs.promises.unlink(imgPath),
                fs.promises.unlink(audioPath),
              ]).catch(console.error);
            },
            messageID,
          );
        },
        messageID,
      );
    } catch (error) {
      console.error('Spotify command error:', error.stack || error.message);
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Spotify Error',
        headerSymbol: '❌',
        headerStyle: 'bold',
        bodyText: 'An error occurred while processing your request.',
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      await api.sendMessage(errorMessage, threadID, messageID);
    }
  },
};

export default spotifyCommand;