import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';
import AuroraBetaStyler from '@aurora/styler';

module.exports = {
  config: {
    name: "owner",
    description: "Displays Owner Info.",
    role: 0,
    usage: "/info",
    category: "Utility 📄",
  },
  run: async ({ api, event }) => {
    const { threadID, messageID } = event;

    const width = 600;
    const height = 500;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, width, height);

    const profileImagePath = path.join(__dirname, '..', 'assets', 'profile.jpg');
    try {
      const profileImage = await loadImage(profileImagePath);
      ctx.save();
      ctx.beginPath();
      ctx.arc(width / 2, 150, 100, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(profileImage, width / 2 - 100, 50, 200, 200);
      ctx.restore();
    } catch (error) {
      console.error('Failed to load profile image:', error);
      ctx.beginPath();
      ctx.arc(width / 2, 150, 100, 0, Math.PI * 2);
      ctx.fillStyle = '#FF00FF';
      ctx.fill();
      ctx.closePath();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Sans';
    ctx.fillText('Owner Information', 30, 300);

    ctx.font = '22px Sans';
    ctx.fillStyle = '#00ffcc';
    ctx.fillText('Developer: Aljur Pogoy', 30, 360);

    ctx.fillStyle = '#ffcc00';
    ctx.fillText('Moderators: Kenneth Panio, Liane Cagara', 30, 410);

    ctx.fillStyle = '#ff6600';
    ctx.fillText('Admin: Aljur Pogoy', 30, 460);

    ctx.fillStyle = '#cccccc';
    ctx.font = '16px Sans';
    ctx.fillText('© 2025 OwnersV2', 30, 490);

    const filePath = path.join(__dirname, 'owner_info.png');
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filePath, buffer);

    const styledMessage = AuroraBetaStyler.styleOutput({
      headerText: 'Owner Info',
      headerSymbol: '📄',
      headerStyle: 'bold',
      bodyText: 'Here is the Owner Information:',
      bodyStyle: 'sansSerif',
      footerText: '',
    });

    api.sendMessage(
      {
        body: styledMessage,
        attachment: fs.createReadStream(filePath),
      },
      threadID,
      () => {
        fs.unlinkSync(filePath);
      },
      messageID
    );
  },
};