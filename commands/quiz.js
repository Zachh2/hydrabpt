const axios = require('axios');

module.exports.config = {

  name: "quiz",

  hasPermission: 0,

  version: "4.0.1",

  description: "Play a quiz game and earn balance sir!",

  credits: "Aljur pogoy",

};

module.exports.run = async function ({ api, event, args, usersData, db }) {

  const { threadID, messageID, senderID } = event;

  try {

   

    const quizUrl = `https://kaiz-apis.gleeze.com/api/quiz?limit=3`;

    const quizResponse = await axios.get(quizUrl);

    const questions = quizResponse.data.questions;

    if (!questions || questions.length === 0) {

      return api.sendMessage(

        "🎯 『 QUIZ 』 🎯\n\n❌ No questions available. Try again later!",

        threadID,

        messageID

      );

    }

    let currentQuestionIndex = 0;

    let userBalance = usersData.get(senderID)?.balance || (db ? await db.db("users").findOne({ userId: senderID })?.data?.balance || 0 : 0);

    const askQuestion = (question) => {

      const { question: q, category, difficulty, choices, correct_answer } = question;

      let message = ` 『 QUIZ 』 \n\n`;

      message += ` Category: ${category}\n`;

      message += ` Difficulty: ${difficulty}\n`;

      message += `❓ Question: ${q}\n\n`;

      message += ` Choices:\n\n`;

      for (const [key, value] of Object.entries(choices)) {

        message += `${key}: ${value}\n`;

      }

      message += `\nReply with the letter (A, B, C, or D) of your answer!`;

      api.sendMessage(

        message,

        threadID,

        (err, info) => {

          if (err) {

            return api.sendMessage("❌ Error sending question.", threadID, messageID);

          }

          global.Kagenou.replies[info.messageID] = {

            callback: async (replyEvent) => {

              // Support both replyEvent.body and replyEvent.event.body

              const body = replyEvent.body || replyEvent.event?.body;

              const replyThreadID = replyEvent.threadID || replyEvent.event?.threadID;

              const replyMessageID = replyEvent.messageID || replyEvent.event?.messageID;

              if (!body || !replyThreadID || !replyMessageID) {

                return replyEvent.api.sendMessage(

                  "❌ Error: Invalid reply received.",

                  replyThreadID || threadID,

                  replyMessageID || messageID

                );

              }

              const userAnswer = body.trim().toUpperCase();

              if (!['A', 'B', 'C', 'D'].includes(userAnswer)) {

                return replyEvent.api.sendMessage(

                  "『 QUIZ 』\n\n❌ Please reply with a valid letter (A, B, C, or D)!",

                  replyThreadID,

                  replyMessageID

                );

              }

              const isCorrect = userAnswer === correct_answer;

              if (isCorrect) {

                const reward = 10;

                userBalance += reward;

                try {

                  if (db) {

                    await db.db("users").updateOne(

                      { userId: senderID },

                      { $set: { userId: senderID, data: { balance: userBalance } } },

                      { upsert: true }

                    );

                  } else {

                    usersData.set(senderID, { ...usersData.get(senderID), balance: userBalance });

                  }

                  replyEvent.api.sendMessage(

                    `『 QUIZ 』\n\n✅ Correct! +${reward} balance. Your new balance: ${userBalance}\nAnswer: ${choices[correct_answer]}`,

                    replyThreadID,

                    replyMessageID

                  );

                } catch (dbError) {

                  replyEvent.api.sendMessage("❌ Error updating balance.", replyThreadID, replyMessageID);

                }

              } else {

                replyEvent.api.sendMessage(

                  `『 QUIZ 』 \n\n❌ Wrong! The correct answer was ${choices[correct_answer]}.`,

                  replyThreadID,

                  replyMessageID

                );

              }

              currentQuestionIndex++;

              if (currentQuestionIndex < questions.length) {

                askQuestion(questions[currentQuestionIndex]);

              } else {

                replyEvent.api.sendMessage(

                  ` 『 QUIZ 』 \n\n🏁 Quiz completed! Your final balance: ${userBalance}`,

                  replyThreadID,

                  replyMessageID

                );

                delete global.Kagenou.replies[info.messageID]; // Clean up reply handler

              }

            },

            author: senderID

          };

        }

      );

    };

    askQuestion(questions[0]);

  } catch (error) {

    let errorMessage = " 『 QUIZ 』 \n\n";

    errorMessage += `❌ An error occurred while starting the quiz.\n`;

    errorMessage += `Error: ${error.message}`;

    api.sendMessage(errorMessage, threadID, messageID);

  }

};