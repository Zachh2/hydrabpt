const nodemailer = require("nodemailer");

module.exports = {

  name: "feedback",

  description: "Send feedback via email.",

  usage: "/feedback | <your Gmail> | <message>",

  author: "Aljur Pogoy",

  version: "3.0.0",

  async run({ api, event }) {

    const { threadID, body, messageID } = event;

    const parts = body.split("|").map(part => part.trim());

    if (parts.length < 3) {

      return api.sendMessage(

        "⚠ 𝗨𝘀𝗮𝗴𝗲: /feedback | <your Gmail> | <your message>",

        threadID,

        messageID

      );

    }

    const userEmail = parts[1];

    const messageContent = parts.slice(2).join(" ");

    const transporter = nodemailer.createTransport({

      service: "gmail",

      auth: {

        user: "korisawaokkotsu@gmail.com", // Bot Gmail here

        pass: "sszu ndnx whpd ddly"        // App password here

      }

    });

    const mailOptions = {

      from: userEmail,

      to: "korisawaumuzaki@gmail.com",

      subject: `Feedback from ${userEmail}`,

      text: messageContent

    };

    try {

      await transporter.sendMail(mailOptions);

      api.sendMessage(

        "✅ 𝗬𝗼𝘂𝗿 𝗳𝗲𝗲𝗱𝗯𝗮𝗰𝗸 𝗵𝗮𝘀 𝗯𝗲𝗲𝗻 𝘀𝗲𝗻𝘁 𝘀𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆!",

        threadID,

        messageID

      );

    } catch (error) {

      console.error("Feedback email error:", error);

      api.sendMessage(

        "❌ 𝗙𝗮𝗶𝗹𝗲𝗱 𝘁𝗼 𝘀𝗲𝗻𝗱 𝗳𝗲𝗲𝗱𝗯𝗮𝗰𝗸. 𝗣𝗹𝗲𝗮𝘀𝗲 𝘁𝗿𝘆 𝗮𝗴𝗮𝗶𝗻 𝗹𝗮𝘁𝗲𝗿.",

        threadID,

        messageID

      );

    }

  }

};