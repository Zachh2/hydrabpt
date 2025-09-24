const fs = require("fs-extra");
const path = require("path");
const { format, UNIRedux } = require("cassidy-styler");

module.exports = {
  name: "games",
  author: "Aljur Pogoy",
  version: "3.2.2",
  description: "Play games to earn coins. Usage: #games <page> or #games <game> <bet> [choice] with ~40% win chance",
  async run({ api, event, args, db, usersData }) {
    const { threadID, messageID, senderID } = event;

    try {
      // Load or initialize user data
      let userData = usersData.get(senderID) || {};
      if (db) {
        const userDoc = await db.db("users").findOne({ userId: senderID });
        userData = userDoc?.data || {};
      }
      if (!userData.balance || !userData.hasOwnProperty("gameAttempts")) {
        userData = {
          balance: userData.balance || 0,
          bank: userData.bank || 0,
          gameAttempts: userData.gameAttempts || 6,
          lastGameReset: userData.lastGameReset || 0
        };
        usersData.set(senderID, userData);
        if (db) {
          await db.db("users").updateOne(
            { userId: senderID },
            { $set: { userId: senderID, data: userData } },
            { upsert: true }
          );
        }
      }

      // Check attempts and cooldown (5-minute reset)
      const now = Date.now();
      const cooldown = 5 * 60 * 1000;
      if (userData.gameAttempts <= 0) {
        const timeElapsed = now - userData.lastGameReset;
        if (timeElapsed < cooldown) {
          const timeLeft = Math.ceil((cooldown - timeElapsed) / 1000);
          const msg = format({
            title: "Games",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            contentFont: "fancy_italic",
            emojis: "🎮",
            content: `❌ No attempts left (0/6)! Wait ${Math.floor(timeLeft / 60)}m ${timeLeft % 60}s.\n> Thanks for using Chatbot`
          });
          return api.sendMessage(msg, threadID, messageID);
        }
        userData.gameAttempts = 6;
        userData.lastGameReset = now;
      }

      // Pagination setup
      const page = parseInt(args[0]) || 1;
      const gamesPerPage = 10;
      const allGames = [
        "slot", "archery", "rps", "dice", "coinflip",
        "roulette", "blackjack", "guessnumber", "tictactoe", "hangman",
        "memory", "trivia", "highlow", "rockpaperscissors", "slots",
        "numberguess", "cardmatch", "minesweeper", "connectfour", "wordscramble",
        "mathchallenge", "anagram", "colorpick", "truefalse", "picturepuzzle"
      ];
      const totalPages = Math.ceil(allGames.length / gamesPerPage);
      const start = (page - 1) * gamesPerPage;
      const end = start + gamesPerPage;
      const gamesToShow = allGames.slice(start, end);

      // Display menu if no game or invalid page
      if (!args[1] || (isNaN(page) && !allGames.includes(args[0].toLowerCase()))) {
        const menu = format({
          title: "Games Menu",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "fancy_italic",
          emojis: "🎮",
          content: `🎮 Games List:\n${gamesToShow.map(game => {
            const details = {
              slot: "🎰 Slot: #games slot <bet>",
              archery: "🏹 Archery: #games archery <bet>",
              rps: "✊ RPS: #games rps <bet> <rock/paper/scissors>",
              dice: "🎲 Dice: #games dice <bet>",
              coinflip: "🪙 Coinflip: #games coinflip <bet> <heads/tails>",
              roulette: "🎡 Roulette: #games roulette <bet> <red/black/green>",
              blackjack: "🃏 Blackjack: #games blackjack <bet>",
              guessnumber: "🔢 Guess: #games guessnumber <bet> <1-10>",
              tictactoe: "🎴 Tic-Tac-Toe: #games tictactoe <bet> <1-9>",
              hangman: "😶 Hangman: #games hangman <bet> <word>",
              memory: "🧠 Memory: #games memory <bet>",
              trivia: "❓ Trivia: #games trivia <bet> <answer>",
              highlow: "📈 High/Low: #games highlow <bet> <high/low>",
              rockpaperscissors: "✋ R-P-S: #games rockpaperscissors <bet> <rock/paper/scissors>",
              slots: "💎 Slots: #games slots <bet>",
              numberguess: "🎯 Num Guess: #games numberguess <bet> <1-100>",
              cardmatch: "🂠 Card Match: #games cardmatch <bet>",
              minesweeper: "💣 Minesweeper: #games minesweeper <bet> <1-5>",
              connectfour: "🔴 Connect 4: #games connectfour <bet> <1-7>",
              wordscramble: "🧩 Word Scramble: #games wordscramble <bet> <word>",
              mathchallenge: "➕ Math: #games mathchallenge <bet>",
              anagram: "🔤 Anagram: #games anagram <bet> <word>",
              colorpick: "🎨 Color Pick: #games colorpick <bet> <red/blue/green>",
              truefalse: "✅ True/False: #games truefalse <bet> <true/false>",
              picturepuzzle: "🖼️ Pic Puzzle: #games picturepuzzle <bet> <answer>"
            };
            return details[game] || "";
          }).join("\n")}\n\nAttempts: ${userData.gameAttempts}/6\nPage ${page} of ${totalPages}\n> Use #games <page> to navigate\n> Thanks for using Chatbot`
        });
        return api.sendMessage(menu, threadID, messageID);
      }

      // Process game play
      const game = args[0].toLowerCase();
      if (!allGames.includes(game)) {
        const errMsg = format({
          title: "Games",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "fancy_italic",
          emojis: "🎮",
          content: `❌ Invalid game! Check #games.\nAttempts: ${userData.gameAttempts}/6\n> Thanks for using Chatbot`
        });
        return api.sendMessage(errMsg, threadID, messageID);
      }

      const bet = parseInt(args[1]);
      if (!args[1] || isNaN(bet) || bet <= 0) {
        const errMsg = format({
          title: "Games",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "fancy_italic",
          emojis: "🎮",
          content: `❌ Enter a valid bet (e.g., #games ${game} 1000).\nAttempts: ${userData.gameAttempts}/6\n> Thanks for using Chatbot`
        });
        return api.sendMessage(errMsg, threadID, messageID);
      }

      if (userData.balance < bet) {
        const errMsg = format({
          title: "Games",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "fancy_italic",
          emojis: "🎮",
          content: `💰 Balance too low! You have ${userData.balance} coins.\nAttempts: ${userData.gameAttempts}/6\n> Thanks for using Chatbot`
        });
        return api.sendMessage(errMsg, threadID, messageID);
      }

      // Deduct attempt and bet
      userData.gameAttempts -= 1;
      userData.balance -= bet;
      if (userData.gameAttempts <= 0) userData.lastGameReset = now;
      usersData.set(senderID, userData);
      if (db) {
        await db.db("users").updateOne(
          { userId: senderID },
          { $set: { userId: senderID, data: userData } },
          { upsert: true }
        );
      }

      // Game logic
      let result = "";
      let winnings = 0;

      if (game === "slot") {
        const symbols = ["🍒", "🍋", "🍊"];
        const [r1, r2, r3] = [symbols[Math.floor(Math.random() * 3)], symbols[Math.floor(Math.random() * 3)], symbols[Math.floor(Math.random() * 3)]];
        result = format({
          title: "Slot",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "fancy_italic",
          emojis: "🎰",
          content: `🎰 Results: ${r1} ${r2} ${r3}\n`
        });
        if (Math.random() < 0.4 || (r1 === r2 && r2 === r3)) {
          winnings = bet * 2;
          userData.balance += winnings;
          result += `🎉 Win! +${winnings} coins\nNew balance: ${userData.balance}`;
        } else {
          result += `💔 Lose! New balance: ${userData.balance}`;
        }
      } else if (game === "archery") {
        const score = Math.floor(Math.random() * 10) + 1;
        result = format({
          title: "Archery",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "fancy_italic",
          emojis: "🏹",
          content: `🎯 Score: ${score}/10\n`
        });
        if (score >= 5) {
          winnings = Math.floor(bet * 1.5);
          userData.balance += winnings;
          result += `🎉 Win! +${winnings} coins\nNew balance: ${userData.balance}`;
        } else {
          result += `💔 Lose! New balance: ${userData.balance}`;
        }
      } else if (game === "rps") {
        const choice = args[2] ? args[2].toLowerCase() : "";
        if (!["rock", "paper", "scissors"].includes(choice)) {
          userData.balance += bet;
          userData.gameAttempts += 1;
          const errMsg = format({
            title: "RPS",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            contentFont: "fancy_italic",
            emojis: "✊",
            content: `❌ Choose rock, paper, or scissors (e.g., #games rps 1000 rock).\nAttempts: ${userData.gameAttempts}/6\n> Thanks for using Chatbot`
          });
          await db.db("users").updateOne(
            { userId: senderID },
            { $set: { userId: senderID, data: userData } },
            { upsert: true }
          );
          return api.sendMessage(errMsg, threadID, messageID);
        }
        const botChoice = ["rock", "paper", "scissors"][Math.floor(Math.random() * 3)];
        const emojis = { rock: "✊", paper: "✋", scissors: "✂️" };
        result = format({
          title: "RPS",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "fancy_italic",
          emojis: "✊",
          content: `You: ${emojis[choice]} vs Bot: ${emojis[botChoice]}\n`
        });
        const wins = { rock: "scissors", paper: "rock", scissors: "paper" };
        if (choice === botChoice) {
          userData.balance += bet;
          result += `🤝 Tie! Balance: ${userData.balance}`;
        } else if (wins[choice] === botChoice) {
          winnings = bet * 2;
          userData.balance += winnings;
          result += `🎉 Win! +${winnings} coins\nNew balance: ${userData.balance}`;
        } else {
          result += `💔 Lose! New balance: ${userData.balance}`;
        }
      } else if (game === "dice") {
        const roll = Math.floor(Math.random() * 6) + 1;
        result = format({
          title: "Dice",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "fancy_italic",
          emojis: "🎲",
          content: `🎲 Roll: ${roll}/6\n`
        });
        if (roll >= 4) {
          winnings = Math.floor(bet * 1.5);
          userData.balance += winnings;
          result += `🎉 Win! +${winnings} coins\nNew balance: ${userData.balance}`;
        } else {
          result += `💔 Lose! New balance: ${userData.balance}`;
        }
      } else if (game === "coinflip") {
        const choice = args[2] ? args[2].toLowerCase() : "";
        if (!["heads", "tails"].includes(choice)) {
          userData.balance += bet;
          userData.gameAttempts += 1;
          const errMsg = format({
            title: "Coinflip",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            contentFont: "fancy_italic",
            emojis: "🪙",
            content: `❌ Choose heads or tails (e.g., #games coinflip 1000 heads).\nAttempts: ${userData.gameAttempts}/6\n> Thanks for using Chatbot`
          });
          await db.db("users").updateOne(
            { userId: senderID },
            { $set: { userId: senderID, data: userData } },
            { upsert: true }
          );
          return api.sendMessage(errMsg, threadID, messageID);
        }
        const resultCoin = Math.random() < 0.5 ? "heads" : "tails";
        result = format({
          title: "Coinflip",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "fancy_italic",
          emojis: "🪙",
          content: `🪙 Result: ${resultCoin}\nYour choice: ${choice}\n`
        });
        if (choice === resultCoin) {
          winnings = bet * 2;
          userData.balance += winnings;
          result += `🎉 Win! +${winnings} coins\nNew balance: ${userData.balance}`;
        } else {
          result += `💔 Lose! New balance: ${userData.balance}`;
        }
      } else if (game === "roulette") {
        const choice = args[2] ? args[2].toLowerCase() : "";
        if (!["red", "black", "green"].includes(choice)) {
          userData.balance += bet;
          userData.gameAttempts += 1;
          const errMsg = format({
            title: "Roulette",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            contentFont: "fancy_italic",
            emojis: "🎡",
            content: `❌ Choose red, black, or green (e.g., #games roulette 1000 red).\nAttempts: ${userData.gameAttempts}/6\n> Thanks for using Chatbot`
          });
          await db.db("users").updateOne(
            { userId: senderID },
            { $set: { userId: senderID, data: userData } },
            { upsert: true }
          );
          return api.sendMessage(errMsg, threadID, messageID);
        }
        const resultSpin = Math.random() < 0.02 ? "green" : Math.random() < 0.5 ? "red" : "black";
        result = format({
          title: "Roulette",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "fancy_italic",
          emojis: "🎡",
          content: `🎡 Result: ${resultSpin}\nYour choice: ${choice}\n`
        });
        if (choice === resultSpin) {
          winnings = resultSpin === "green" ? bet * 10 : bet * 2;
          userData.balance += winnings;
          result += `🎉 Win! +${winnings} coins\nNew balance: ${userData.balance}`;
        } else {
          result += `💔 Lose! New balance: ${userData.balance}`;
        }
      } else if (game === "blackjack") {
        const [p1, p2, b1, b2] = [Math.floor(Math.random() * 10) + 2, Math.floor(Math.random() * 10) + 2, Math.floor(Math.random() * 10) + 2, Math.floor(Math.random() * 10) + 2];
        const playerTotal = p1 + p2;
        const botTotal = b1 + b2;
        result = format({
          title: "Blackjack",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "fancy_italic",
          emojis: "🃏",
          content: `🃏 You: ${playerTotal} (Cards: ${p1}, ${p2})\nBot: ${botTotal}\n`
        });
        if (playerTotal <= 21 && (playerTotal > botTotal || botTotal > 21)) {
          winnings = bet * 2;
          userData.balance += winnings;
          result += `🎉 Win! +${winnings} coins\nNew balance: ${userData.balance}`;
        } else {
          result += `💔 Lose! New balance: ${userData.balance}`;
        }
} else if (game === "guessnumber") {
        const guess = parseInt(args[2]);
        if (!args[2] || isNaN(guess) || guess < 1 || guess > 10) {
          userData.balance += bet;
          userData.gameAttempts += 1;
          const errMsg = format({
            title: "Guess Number",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            contentFont: "fancy_italic",
            emojis: "🔢",
            content: `❌ Guess 1-10 (e.g., #games guessnumber 1000 5).\nAttempts: ${userData.gameAttempts}/6\n> Thanks for using Chatbot`
          });
          await db.db("users").updateOne(
            { userId: senderID },
            { $set: { userId: senderID, data: userData } },
            { upsert: true }
          );
          return api.sendMessage(errMsg, threadID, messageID);
        }
        const number = Math.floor(Math.random() * 10) + 1;
        result = format({
          title: "Guess Number",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "fancy_italic",
          emojis: "🔢",
          content: `🔢 Number: ${number}\nYour guess: ${guess}\n`
        });
        if (guess === number) {
          winnings = bet * 3;
          userData.balance += winnings;
          result += `🎉 Win! +${winnings} coins\nNew balance: ${userData.balance}`;
        } else {
          result += `💔 Lose! New balance: ${userData.balance}`;
        }
      } else if (game === "tictactoe") {
        const pick = parseInt(args[2]);
        if (!args[2] || isNaN(pick) || pick < 1 || pick > 9) {
          userData.balance += bet;
          userData.gameAttempts += 1;
          const errMsg = format({
            title: "Tic-Tac-Toe",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            contentFont: "fancy_italic",
            emojis: "🎴",
            content: `❌ Pick 1-9 (e.g., #games tictactoe 1000 5).\nAttempts: ${userData.gameAttempts}/6\n> Thanks for using Chatbot`
          });
          await db.db("users").updateOne(
            { userId: senderID },
            { $set: { userId: senderID, data: userData } },
            { upsert: true }
          );
          return api.sendMessage(errMsg, threadID, messageID);
        }
        const botPick = Math.floor(Math.random() * 9) + 1;
        result = format({
          title: "Tic-Tac-Toe",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "fancy_italic",
          emojis: "🎴",
          content: `🎴 You: ${pick}\nBot: ${botPick}\n`
        });
        if (pick !== botPick) {
          winnings = bet * 2;
          userData.balance += winnings;
          result += `🎉 Win! +${winnings} coins\nNew balance: ${userData.balance}`;
        } else {
          result += `💔 Lose! New balance: ${userData.balance}`;
        }
      } else if (game === "hangman") {
        const guess = args[2] ? args[2].toLowerCase() : "";
        if (!guess) {
          userData.balance += bet;
          userData.gameAttempts += 1;
          const errMsg = format({
            title: "Hangman",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            contentFont: "fancy_italic",
            emojis: "😶",
            content: `❌ Guess a 4-letter animal (e.g., #games hangman 1000 lion).\nAttempts: ${userData.gameAttempts}/6\n> Thanks for using Chatbot`
          });
          await db.db("users").updateOne(
            { userId: senderID },
            { $set: { userId: senderID, data: userData } },
            { upsert: true }
          );
          return api.sendMessage(errMsg, threadID, messageID);
        }
        const answer = "lion";
        result = format({
          title: "Hangman",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "fancy_italic",
          emojis: "😶",
          content: `😶 Answer: ${answer}\nYour guess: ${guess}\n`
        });
        if (guess === answer) {
          winnings = bet * 3;
          userData.balance += winnings;
          result += `🎉 Win! +${winnings} coins\nNew balance: ${userData.balance}`;
        } else {
          result += `💔 Lose! New balance: ${userData.balance}`;
        }
      } else if (game === "memory") {
        const seq = [Math.floor(Math.random() * 10), Math.floor(Math.random() * 10), Math.floor(Math.random() * 10)].join("");
        result = format({
          title: "Memory",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "fancy_italic",
          emojis: "🧠",
          content: `🧠 Memorize: ${seq}\n(Interactive not supported yet)\n`
        });
        result += `💔 Lose! New balance: ${userData.balance}`;
      } else if (game === "trivia") {
        const answer = "jupiter";
        const guess = args[2] ? args[2].toLowerCase() : "";
        if (!guess) {
          userData.balance += bet;
          userData.gameAttempts += 1;
          const errMsg = format({
            title: "Trivia",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            contentFont: "fancy_italic",
            emojis: "❓",
            content: `❓ Largest planet? (e.g., #games trivia 1000 jupiter)\nAttempts: ${userData.gameAttempts}/6\n> Thanks for using Chatbot`
          });
          await db.db("users").updateOne(
            { userId: senderID },
            { $set: { userId: senderID, data: userData } },
            { upsert: true }
          );
          return api.sendMessage(errMsg, threadID, messageID);
        }
        result = format({
          title: "Trivia",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "fancy_italic",
          emojis: "❓",
          content: `❓ Answer: ${answer}\nYour guess: ${guess}\n`
        });
        if (guess === answer) {
          winnings = bet * 3;
          userData.balance += winnings;
          result += `🎉 Win! +${winnings} coins\nNew balance: ${userData.balance}`;
        } else {
          result += `💔 Lose! New balance: ${userData.balance}`;
        }
      } else if (game === "highlow") {
        const choice = args[2] ? args[2].toLowerCase() : "";
        if (!["high", "low"].includes(choice)) {
          userData.balance += bet;
          userData.gameAttempts += 1;
          const errMsg = format({
            title: "High/Low",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            contentFont: "fancy_italic",
            emojis: "📈",
            content: `❌ Choose high or low (e.g., #games highlow 1000 high).\nAttempts: ${userData.gameAttempts}/6\n> Thanks for using Chatbot`
          });
          await db.db("users").updateOne(
            { userId: senderID },
            { $set: { userId: senderID, data: userData } },
            { upsert: true }
          );
          return api.sendMessage(errMsg, threadID, messageID);
        }
        const number = Math.floor(Math.random() * 10) + 1;
        result = format({
          title: "High/Low",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "fancy_italic",
          emojis: "📈",
          content: `📈 Number: ${number}\nYour choice: ${choice}\n`
        });
        if ((choice === "high" && number > 5) || (choice === "low" && number <= 5)) {
          winnings = bet * 2;
          userData.balance += winnings;
          result += `🎉 Win! +${winnings} coins\nNew balance: ${userData.balance}`;
        } else {
          result += `💔 Lose! New balance: ${userData.balance}`;
        }
      } else if (game === "rockpaperscissors") {
        const choice = args[2] ? args[2].toLowerCase() : "";
        if (!["rock", "paper", "scissors"].includes(choice)) {
          userData.balance += bet;
          userData.gameAttempts += 1;
          const errMsg = format({
            title: "Rock-Paper-Scissors",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            contentFont: "fancy_italic",
            emojis: "✋",
            content: `❌ Choose rock, paper, or scissors (e.g., #games rockpaperscissors 1000 rock).\nAttempts: ${userData.gameAttempts}/6\n> Thanks for using Chatbot`
          });
          await db.db("users").updateOne(
            { userId: senderID },
            { $set: { userId: senderID, data: userData } },
            { upsert: true }
          );
          return api.sendMessage(errMsg, threadID, messageID);
        }
        const botChoice = ["rock", "paper", "scissors"][Math.floor(Math.random() * 3)];
        const emojis = { rock: "✊", paper: "✋", scissors: "✂️" };
        result = format({
          title: "Rock-Paper-Scissors",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "fancy_italic",
          emojis: "✋",
          content: `✋ You: ${emojis[choice]} vs Bot: ${emojis[botChoice]}\n`
        });
        const wins = { rock: "scissors", paper: "rock", scissors: "paper" };
        if (choice === botChoice) {
          userData.balance += bet;
          result += `🤝 Tie! Balance: ${userData.balance}`;
        } else if (wins[choice] === botChoice) {
          winnings = bet * 2;
          userData.balance += winnings;
          result += `🎉 Win! +${winnings} coins\nNew balance: ${userData.balance}`;
        } else {
          result += `💔 Lose! New balance: ${userData.balance}`;
        }
      } else if (game === "slots") {
        const symbols = ["💎", "💰", "🍀"];
        const [r1, r2, r3] = [symbols[Math.floor(Math.random() * 3)], symbols[Math.floor(Math.random() * 3)], symbols[Math.floor(Math.random() * 3)]];
        result = format({
          title: "Slots",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "fancy_italic",
          emojis: "💎",
          content: `💎 Results: ${r1} ${r2} ${r3}\n`
        });
        if (r1 === r2 && r2 === r3) {
          winnings = bet * 5;
          userData.balance += winnings;
          result += `🎉 Win! +${winnings} coins\nNew balance: ${userData.balance}`;
        } else {
          result += `💔 Lose! New balance: ${userData.balance}`;
        }
      } else if (game === "numberguess") {
        const guess = parseInt(args[2]);
        if (!args[2] || isNaN(guess) || guess < 1 || guess > 100) {
          userData.balance += bet;
          userData.gameAttempts += 1;
          const errMsg = format({
            title: "Number Guess",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            contentFont: "fancy_italic",
            emojis: "🎯",
            content: `❌ Guess 1-100 (e.g., #games numberguess 1000 42).\nAttempts: ${userData.gameAttempts}/6\n> Thanks for using Chatbot`
          });
          await db.db("users").updateOne(
            { userId: senderID },
            { $set: { userId: senderID, data: userData } },
            { upsert: true }
          );
          return api.sendMessage(errMsg, threadID, messageID);
        }
        const number = Math.floor(Math.random() * 100) + 1;
        result = format({
          title: "Number Guess",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "fancy_italic",
          emojis: "🎯",
          content: `🎯 Number: ${number}\nYour guess: ${guess}\n`
        });
        if (guess === number) {
          winnings = bet * 10;
          userData.balance += winnings;
          result += `🎉 Win! +${winnings} coins\nNew balance: ${userData.balance}`;
        } else {
          result += `💔 Lose! New balance: ${userData.balance}`;
        }
      } else if (game === "cardmatch") {
        const [c1, c2] = ["🂠", "🂡", "🂢"].sort(() => Math.random() - 0.5);
        result = format({
          title: "Card Match",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "fancy_italic",
          emojis: "🂠",
          content: `🂠 Results: ${c1} ${c2}\n`
        });
        if (c1 === c2) {
          winnings = bet * 3;
          userData.balance += winnings;
          result += `🎉 Win! +${winnings} coins\nNew balance: ${userData.balance}`;
        } else {
          result += `💔 Lose! New balance: ${userData.balance}`;
        }
      } else if (game === "minesweeper") {
        const pick = parseInt(args[2]);
        if (!args[2] || isNaN(pick) || pick < 1 || pick > 5) {
          userData.balance += bet;
          userData.gameAttempts += 1;
          const errMsg = format({
            title: "Minesweeper",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            contentFont: "fancy_italic",
            emojis: "💣",
            content: `❌ Pick 1-5 (e.g., #games minesweeper 1000 3).\nAttempts: ${userData.gameAttempts}/6\n> Thanks for using Chatbot`
          });
          await db.db("users").updateOne(
            { userId: senderID },
            { $set: { userId: senderID, data: userData } },
            { upsert: true }
          );
          return api.sendMessage(errMsg, threadID, messageID);
        }
        const mine = Math.floor(Math.random() * 5) + 1;
        result = format({
          title: "Minesweeper",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "fancy_italic",
          emojis: "💣",
          content: `💣 Mine at: ${mine}\nYour pick: ${pick}\n`
        });
        if (pick !== mine) {
          winnings = bet * 2;
          userData.balance += winnings;
          result += `🎉 Win! +${winnings} coins\nNew balance: ${userData.balance}`;
        } else {
          result += `💔 Lose! New balance: ${userData.balance}`;
        }
      } else if (game === "connectfour") {
        const pick = parseInt(args[2]);
        if (!args[2] || isNaN(pick) || pick < 1 || pick > 7) {
          userData.balance += bet;
          userData.gameAttempts += 1;
          const errMsg = format({
            title: "Connect Four",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            contentFont: "fancy_italic",
            emojis: "🔴",
            content: `❌ Pick 1-7 (e.g., #games connectfour 1000 4).\nAttempts: ${userData.gameAttempts}/6\n> Thanks for using Chatbot`
          });
          await db.db("users").updateOne(
            { userId: senderID },
            { $set: { userId: senderID, data: userData } },
            { upsert: true }
          );
          return api.sendMessage(errMsg, threadID, messageID);
        }
        const botPick = Math.floor(Math.random() * 7) + 1;
        result = format({
          title: "Connect Four",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "fancy_italic",
          emojis: "🔴",
          content: `🔴 You: ${pick}\nBot: ${botPick}\n`
        });
        if (pick !== botPick) {
          winnings = bet * 2;
          userData.balance += winnings;
          result += `🎉 Win! +${winnings} coins\nNew balance: ${userData.balance}`;
        } else {
          result += `💔 Lose! New balance: ${userData.balance}`;
        }
      } else if (game === "wordscramble") {
        const guess = args[2] ? args[2].toLowerCase() : "";
        if (!guess) {
          userData.balance += bet;
          userData.gameAttempts += 1;
          const errMsg = format({
            title: "Word Scramble",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            contentFont: "fancy_italic",
            emojis: "🧩",
            content: `❌ Unscramble 'pleap' (fruit) (e.g., #games wordscramble 1000 apple).\nAttempts: ${userData.gameAttempts}/6\n> Thanks for using Chatbot`
          });
          await db.db("users").updateOne(
            { userId: senderID },
            { $set: { userId: senderID, data: userData } },
            { upsert: true }
          );
          return api.sendMessage(errMsg, threadID, messageID);
        }
        const answer = "apple";
        result = format({
          title: "Word Scramble",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "fancy_italic",
          emojis: "🧩",
          content: `🧩 Answer: ${answer}\nYour guess: ${guess}\n`
        });
        if (guess === answer) {
          winnings = bet * 3;
          userData.balance += winnings;
          result += `🎉 Win! +${winnings} coins\nNew balance: ${userData.balance}`;
        } else {
          result += `💔 Lose! New balance: ${userData.balance}`;
        }
} else if (game === "mathchallenge") {
        const [n1, n2] = [Math.floor(Math.random() * 10) + 1, Math.floor(Math.random() * 10) + 1];
        result = format({
          title: "Math Challenge",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "fancy_italic",
          emojis: "➕",
          content: `➕ ${n1} + ${n2} = ?\n(Interactive not supported yet)\n`
        });
        result += `💔 Lose! New balance: ${userData.balance}`;
      } else if (game === "anagram") {
        const guess = args[2] ? args[2].toLowerCase() : "";
        if (!guess) {
          userData.balance += bet;
          userData.gameAttempts += 1;
          const errMsg = format({
            title: "Anagram",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            contentFont: "fancy_italic",
            emojis: "🔤",
            content: `❌ Unscramble 'silent' (hear) (e.g., #games anagram 1000 listen).\nAttempts: ${userData.gameAttempts}/6\n> Thanks for using Chatbot`
          });
          await db.db("users").updateOne(
            { userId: senderID },
            { $set: { userId: senderID, data: userData } },
            { upsert: true }
          );
          return api.sendMessage(errMsg, threadID, messageID);
        }
        const answer = "listen";
        result = format({
          title: "Anagram",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "fancy_italic",
          emojis: "🔤",
          content: `🔤 Answer: ${answer}\nYour guess: ${guess}\n`
        });
        if (guess === answer) {
          winnings = bet * 3;
          userData.balance += winnings;
          result += `🎉 Win! +${winnings} coins\nNew balance: ${userData.balance}`;
        } else {
          result += `💔 Lose! New balance: ${userData.balance}`;
        }
      } else if (game === "colorpick") {
        const choice = args[2] ? args[2].toLowerCase() : "";
        if (!["red", "blue", "green"].includes(choice)) {
          userData.balance += bet;
          userData.gameAttempts += 1;
          const errMsg = format({
            title: "Color Pick",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            contentFont: "fancy_italic",
            emojis: "🎨",
            content: `❌ Choose red, blue, or green (e.g., #games colorpick 1000 red).\nAttempts: ${userData.gameAttempts}/6\n> Thanks for using Chatbot`
          });
          await db.db("users").updateOne(
            { userId: senderID },
            { $set: { userId: senderID, data: userData } },
            { upsert: true }
          );
          return api.sendMessage(errMsg, threadID, messageID);
        }
        const resultColor = ["red", "blue", "green"][Math.floor(Math.random() * 3)];
        result = format({
          title: "Color Pick",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "fancy_italic",
          emojis: "🎨",
          content: `🎨 Result: ${resultColor}\nYour choice: ${choice}\n`
        });
        if (choice === resultColor) {
          winnings = bet * 2;
          userData.balance += winnings;
          result += `🎉 Win! +${winnings} coins\nNew balance: ${userData.balance}`;
        } else {
          result += `💔 Lose! New balance: ${userData.balance}`;
        }
      } else if (game === "truefalse") {
        const choice = args[2] ? args[2].toLowerCase() : "";
        if (!["true", "false"].includes(choice)) {
          userData.balance += bet;
          userData.gameAttempts += 1;
          const errMsg = format({
            title: "True/False",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            contentFont: "fancy_italic",
            emojis: "✅",
            content: `❌ Choose true or false (e.g., #games truefalse 1000 true).\nAttempts: ${userData.gameAttempts}/6\n> Thanks for using Chatbot`
          });
          await db.db("users").updateOne(
            { userId: senderID },
            { $set: { userId: senderID, data: userData } },
            { upsert: true }
          );
          return api.sendMessage(errMsg, threadID, messageID);
        }
        const answer = Math.random() < 0.5 ? "true" : "false";
        result = format({
          title: "True/False",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "fancy_italic",
          emojis: "✅",
          content: `✅ Is 1+1=2? Answer: ${answer}\nYour choice: ${choice}\n`
        });
        if (choice === answer) {
          winnings = bet * 2;
          userData.balance += winnings;
          result += `🎉 Win! +${winnings} coins\nNew balance: ${userData.balance}`;
        } else {
          result += `💔 Lose! New balance: ${userData.balance}`;
        }
      } else if (game === "picturepuzzle") {
        const guess = args[2] ? args[2].toLowerCase() : "";
        if (!guess) {
          userData.balance += bet;
          userData.gameAttempts += 1;
          const errMsg = format({
            title: "Picture Puzzle",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            contentFont: "fancy_italic",
            emojis: "🖼️",
            content: `❌ Puzzle: 🐶+🏠=? (e.g., #games picturepuzzle 1000 doghouse)\nAttempts: ${userData.gameAttempts}/6\n> Thanks for using Chatbot`
          });
          await db.db("users").updateOne(
            { userId: senderID },
            { $set: { userId: senderID, data: userData } },
            { upsert: true }
          );
          return api.sendMessage(errMsg, threadID, messageID);
        }
        const answer = "doghouse";
        result = format({
          title: "Picture Puzzle",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "fancy_italic",
          emojis: "🖼️",
          content: `🖼️ Puzzle: 🐶+🏠\nAnswer: ${answer}\nYour guess: ${guess}\n`
        });
        if (guess === answer) {
          winnings = bet * 3;
          userData.balance += winnings;
          result += `🎉 Win! +${winnings} coins\nNew balance: ${userData.balance}`;
        } else {
          result += `💔 Lose! New balance: ${userData.balance}`;
        }
      }

      // Add attempts info
      result += userData.gameAttempts > 0
        ? `\n\nAttempts: ${userData.gameAttempts}/6`
        : `\n\n❌ No attempts left! Wait 5 minutes.`;
      result += `\n> Thanks for using Chatbot`;

      // Save and send
      usersData.set(senderID, userData);
      if (db) {
        await db.db("users").updateOne(
          { userId: senderID },
          { $set: { userId: senderID, data: userData } },
          { upsert: true }
        );
      }
      await api.sendMessage(result, threadID, messageID);

    } catch (error) {
      const errMsg = format({
        title: "Games",
        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
        titleFont: "double_struck",
        contentFont: "fancy_italic",
        emojis: "🎮",
        content: `┏━━━━━━━┓\n┃ Error: ${error.message}\n┗━━━━━━━┛\n> Thanks for using Chatbot`
      });
      api.sendMessage(errMsg, threadID, messageID);
    }
  },
};
