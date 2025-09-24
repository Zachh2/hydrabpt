const axios = require("axios");
const { createCanvas, loadImage, registerFont } = require("canvas");
const fs = require("fs");
const path = require("path");
const AuroraBetaStyler = require("@aurora/styler");

module.exports = {
  config: {
    name: "fbcover",
    version: "1.0.0",
    aliases: ["fbcover"],
    cooldown: 5,
    role: 4, 
  },
  run: async function ({ api, event, args }) {
    const { threadID, messageID } = event;

    try {
      if (!args || args.length !== 7) {
        throw new Error(
          "Please provide all 7 details to generate a Facebook cover.\n\nExample:\nfbcover Mark Zuckerberg USA zuck@gmail.com n/a 4 Cyan"
        );
      }

      const [name, subname, address, email, number, uid, color] = args.map((d) => d.trim());
      if (!name || !subname || !address || !email || !number || !uid || !color) {
        throw new Error("Missing data to execute the command.");
      }

      const imagePath = path.join(__dirname, "cache", "fbcover1.jpg");
      const pathAva = path.join(__dirname, "cache", "fbcover2.png");
      const pathLine = path.join(__dirname, "cache", "fbcover3.png");
      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);
      const avtAnime = (
        await axios.get(
          encodeURI(
            `https://graph.facebook.com/${uid}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`
          ),
          { responseType: "arraybuffer" }
        )
      ).data;
      fs.writeFileSync(pathAva, Buffer.from(avtAnime));
      const background = (
        await axios.get(
          encodeURI(
            `https://1.bp.blogspot.com/-ZyXHJE2S3ew/YSdA8Guah-I/AAAAAAAAwtQ/udZEj3sXhQkwh5Qn8jwfjRwesrGoY90cwCNcBGAsYHQ/s0/bg.jpg`
          ),
          { responseType: "arraybuffer" }
        )
      ).data;
      const hieuung = (
        await axios.get(
          encodeURI(
            `https://1.bp.blogspot.com/-zl3qntcfDhY/YSdEQNehJJI/AAAAAAAAwtY/C17yMRMBjGstL_Cq6STfSYyBy-mwjkdQwCNcBGAsYHQ/s0/mask.png`
          ),
          { responseType: "arraybuffer" }
        )
      ).data;
      fs.writeFileSync(imagePath, Buffer.from(background));
      fs.writeFileSync(pathLine, Buffer.from(hieuung));
      const fontPath = path.join(__dirname, "cache", "UTMAvoBold.ttf");
      if (!fs.existsSync(fontPath)) {
        const getfont2 = (
          await axios.get(
            `https://drive.google.com/u/0/uc?id=1DuI-ou9OGEkII7n8odx-A7NIcYz0Xk9o&export=download`,
            { responseType: "arraybuffer" }
          )
        ).data;
        fs.writeFileSync(fontPath, Buffer.from(getfont2));
      }
      const baseImage = await loadImage(imagePath);
      const baseAva = await loadImage(pathAva);
      const baseLine = await loadImage(pathLine);
      const canvas = createCanvas(baseImage.width, baseImage.height);
      const ctx = canvas.getContext("2d");

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

      registerFont(fontPath, { family: "UTMAvoBold" });
      ctx.strokeStyle = "rgba(255,255,255, 0.2)";
      ctx.lineWidth = 3;
      ctx.font = "100px UTMAvoBold";
      ctx.strokeText(name.toUpperCase(), 30, 100);
      ctx.strokeText(name.toUpperCase(), 130, 200);
      ctx.textAlign = "right";
      ctx.strokeText(name.toUpperCase(), canvas.width - 30, canvas.height - 30);
      ctx.strokeText(name.toUpperCase(), canvas.width - 130, canvas.height - 130);

      ctx.fillStyle = "#ffffff";
      ctx.font = "55px UTMAvoBold";
      ctx.fillText(name.toUpperCase(), 680, 270);
      ctx.font = "40px UTMAvoBold";
      ctx.fillStyle = "#fff";
      ctx.textAlign = "right";
      ctx.fillText(subname.toUpperCase(), 680, 320);
      ctx.font = "23px UTMAvoBold";
      ctx.fillStyle = "#fff";
      ctx.textAlign = "start";
      ctx.fillText(number.toUpperCase(), 1350, 252);
      ctx.fillText(email.toUpperCase(), 1350, 332);
      ctx.fillText(address.toUpperCase(), 1350, 410);

      ctx.globalCompositeOperation = "destination-out";
      ctx.drawImage(baseLine, 0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = color.toLowerCase() === "no" ? "#ffffff" : color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";
      const drawCircleImage = (ctx, img, x, y, size) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, x, y, size, size);
        ctx.restore();
      };
      drawCircleImage(ctx, baseAva, 824, 180, 285);

      const imageBuffer = canvas.toBuffer();
      fs.writeFileSync(imagePath, imageBuffer);

      const styledMessage = AuroraBetaStyler.styleOutput({
        headerText: "FBCover",
        headerSymbol: "🎨",
        headerStyle: "bold",
        bodyText: "🎨 Your custom Facebook cover is ready!",
        bodyStyle: "sansSerif",
        footerText: "",
      });

      api.sendMessage(
        {
          body: styledMessage,
          attachment: fs.createReadStream(imagePath),
        },
        threadID,
        () => {
          fs.unlinkSync(imagePath);
          fs.unlinkSync(pathAva);
          fs.unlinkSync(pathLine);
          if (fs.existsSync(fontPath)) fs.unlinkSync(fontPath);
        },
        messageID
      );
    } catch (error) {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "FBCover",
        headerSymbol: "🎨",
        headerStyle: "bold",
        bodyText:
          error.message || "An unexpected error occurred. Please try again later.",
        bodyStyle: "sansSerif",
        footerText: "",
      });
      api.sendMessage(errorMessage, threadID, null, messageID);
      console.error("FBCover Error:", error.message || error);
    }
  },
};
