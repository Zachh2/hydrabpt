import AuroraBetaStyler from '@aurora/styler';
import { LINE } from '@aurora/styler';
import * as stream from 'stream';

const moment = require("moment-timezone");
const fs = require("fs-extra");
const axios = require("axios");
const cheerio = require("cheerio");
const Canvas = require("canvas");
const https = require("https");
const agent = new https.Agent({
  rejectUnauthorized: false
});


function sleep(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

function getLines(ctx: any, text: string, maxWidth: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = words[0];
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(`${currentLine} ${word}`).width;
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

function centerImage(ctx: any, img: any, x: number, y: number, sizeX: number, sizeY: number) {
  ctx.drawImage(img, x - sizeX / 2, y - sizeY / 2, sizeX, sizeY);
}

function checkDate(date: string) {
  const [day0, month0, year0] = (date || "").split('/');
  const day = (day0 || "").length === 1 ? "0" + day0 : day0;
  const month = (month0 || "").length === 1 ? "0" + month0 : month0;
  const year = year0 || "";
  const newDateFormat = year + "/" + month + "/" + day;
  return moment(newDateFormat, 'YYYY/MM/DD', true).isValid() ? newDateFormat : false;
}

const moonImages = [
  'https://i.ibb.co/9shyYH1/moon-0.png',
  'https://i.ibb.co/vBXLL37/moon-1.png',
  'https://i.ibb.co/0QCKK9D/moon-2.png',
  'https://i.ibb.co/Dp62X2j/moon-3.png',
  'https://i.ibb.co/xFKCtfd/moon-4.png',
  'https://i.ibb.co/m4L533L/moon-5.png',
  'https://i.ibb.co/VmshdMN/moon-6.png',
  'https://i.ibb.co/4N7R2B2/moon-7.png',
  'https://i.ibb.co/C2k4YB8/moon-8.png',
  'https://i.ibb.co/F62wHxP/moon-9.png',
  'https://i.ibb.co/Gv6R1mk/moon-10.png',
  'https://i.ibb.co/0ZYY7Kk/moon-11.png',
  'https://i.ibb.co/KqXC5F5/moon-12.png',
  'https://i.ibb.co/BGtLpRJ/moon-13.png',
  'https://i.ibb.co/jDn7pPx/moon-14.png',
  'https://i.ibb.co/kykn60t/moon-15.png',
  'https://i.ibb.co/qD4LFLs/moon-16.png',
  'https://i.ibb.co/qJm9gcQ/moon-17.png',
  'https://i.ibb.co/yYFYZx9/moon-18.png',
  'https://i.ibb.co/8bc7vpZ/moon-19.png',
  'https://i.ibb.co/jHG7DKs/moon-20.png',
  'https://i.ibb.co/5WD18Rn/moon-21.png',
  'https://i.ibb.co/3Y06yHM/moon-22.png',
  'https://i.ibb.co/4T8Zdfy/moon-23.png',
  'https://i.ibb.co/n1CJyP4/moon-24.png',
  'https://i.ibb.co/zFwJRqz/moon-25.png',
  'https://i.ibb.co/gVBmMCW/moon-26.png',
  'https://i.ibb.co/hRY89Hn/moon-27.png',
  'https://i.ibb.co/7C13s7Z/moon-28.png',
  'https://i.ibb.co/2hDTwB4/moon-29.png',
  'https://i.ibb.co/Rgj9vpj/moon-30.png',
  'https://i.ibb.co/s5z0w9R/moon-31.png'
];

const moonCommand: ShadowBot.Command = {
  config: {
    name: "moon",
    author: "Aljur Pogoy",
    role: 0,
    description: "Generate a moon phase image for a specific date (DD/MM/YYYY)",
    usage: "{pn} <day/month/year>\n{pn} <day/month/year> <caption>",
    category: "image",
    nonPrefix: false,
  },
  run: async ({ api, event, args }) => {
    const { threadID, messageID } = event;
    if (!threadID || !messageID) {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Moon Error',
        headerSymbol: '❌',
        headerStyle: 'bold',
        bodyText: 'Missing threadID or messageID in event',
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      return api.sendMessage(errorMessage, threadID, messageID);
    }

    const date = checkDate(args[0]);
    if (!date) {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Moon Error',
        headerSymbol: '⚠️',
        headerStyle: 'bold',
        bodyText: 'Please enter a valid date in DD/MM/YYYY format',
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      return api.sendMessage(errorMessage, threadID, messageID);
    }

    const linkCrawl = `https://lunaf.com/lunar-calendar/${date}`;
    let html;
    try {
      html = await axios.get(linkCrawl, { httpsAgent: agent });
    } catch (err) {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Moon Error',
        headerSymbol: '❌',
        headerStyle: 'bold',
        bodyText: `An error occurred while fetching the moon image for ${args[0]}`,
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      return api.sendMessage(errorMessage, threadID, messageID);
    }

    const $ = cheerio.load(html.data);
    const href = $("figure img").attr("data-ezsrcset");
    let number: string | undefined;
    if (href && href.match(/phase-(\d+)\.png/)) {
      number = href.match(/phase-(\d+)\.png/)![1];
    } else {
      console.error(`[DEBUG] No valid phase number found in href: ${href}`);
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Moon Error',
        headerSymbol: '⚠️',
        headerStyle: 'bold',
        bodyText: `Could not determine moon phase for ${args[0]}. Please try a different date.`,
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      return api.sendMessage(errorMessage, threadID, messageID);
    }

    const imgSrc = moonImages[Number(number)];
    const { data: imgSrcBuffer } = await axios.get(imgSrc, {
      responseType: "arraybuffer"
    });

    const msg = `- Moon phase on ${args[0]}`
      + `\n- ${$($('h3').get()[0]).text()}`
      + `\n- ${$("#phimg > small").text()}`
      + `\n- ${linkCrawl}`
      + `\n- https://lunaf.com/img/moon/h-phase-${number}.png`;

    if (args[1]) {
      const canvas = Canvas.createCanvas(1080, 2400);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, 1080, 2400);

      const moon = await Canvas.loadImage(imgSrcBuffer);
      centerImage(ctx, moon, 1080 / 2, 2400 / 2, 970, 970);

      ctx.font = "60px \"Kanit SemiBold\"";
      const wrapText = getLines(ctx, args.slice(1).join(" "), 594);
      ctx.textAlign = "center";
      ctx.fillStyle = "white";

      const yStartText = 2095;
      let heightText = yStartText - wrapText.length / 2 * 75;
      for (const text of wrapText) {
        ctx.fillText(text, 750, heightText);
        heightText += 75;
      }

      const pathSave = __dirname + "/tmp/moonImage.png";
      fs.writeFileSync(pathSave, canvas.toBuffer());
      await api.sendMessage({
        body: msg,
        attachment: fs.createReadStream(pathSave)
      }, threadID, messageID, () => fs.unlinkSync(pathSave));
    } else {
      const readableStream = new stream.Readable();
      readableStream.push(imgSrcBuffer);
      readableStream.push(null);
      await api.sendMessage({
        body: msg,
        attachment: readableStream
      }, threadID, messageID);
    }
  },
};

export default moonCommand;