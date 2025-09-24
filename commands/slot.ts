import AuroraBetaStyler from '@aurora/styler';

interface SlotStats {
  games: number;
  won: number;
  lost: number;
  jackpots: number;
}

module.exports = {
  config: {
    name: "slot",
    author: "Aljur Pogoy",
    description: "Slot game with 90% win rate, jackpots, and stats tracking",
    category: "Game",
    version: "2.0",
    cooldown: 6,
  },
  async run({ api, event, usersData }: { api: any; event: any; usersData: Map<string, any> }) {
    const { threadID, messageID, senderID, body } = event;

    try {
      let user = usersData.get(senderID) || { balance: 0, bank: 0, slotStats: { games: 0, won: 0, lost: 0, jackpots: 0 } };
      user.balance = user.balance || 0;
      user.bank = user.bank || 0;
      user.slotStats = user.slotStats || { games: 0, won: 0, lost: 0, jackpots: 0 };
      usersData.set(senderID, user);

      const args = body.split(" ").slice(1);
      let bet = 0;

      // 🎯 Dynamic bet handling
      if (!args[0]) {
        return api.sendMessage("❌ Usage: /slot <amount | allin | half | 10%>", threadID, messageID);
      } else if (args[0].toLowerCase() === "allin") {
        bet = user.balance;
      } else if (args[0].toLowerCase() === "half") {
        bet = Math.floor(user.balance / 2);
      } else if (args[0].endsWith("%")) {
        const percent = parseInt(args[0]);
        bet = Math.floor(user.balance * (percent / 100));
      } else {
        bet = parseInt(args[0]);
      }

      if (isNaN(bet) || bet <= 0) {
        return api.sendMessage("❌ Invalid bet amount!", threadID, messageID);
      }
      if (user.balance < bet) {
        return api.sendMessage(`❌ Insufficient balance! You only have ${user.balance} coins.`, threadID, messageID);
      }

      user.balance -= bet;
      user.slotStats.games++;

      // 🎨 Themes
      const themes = {
        colors: ["💛", "💚", "💙", "❤️", "🧡", "💜"],
        fruits: ["🍎", "🍇", "🍓", "🍒", "🍊", "🍍", "🥭", "🍑", "🥝", "🍋", "🍉"],
        food: ["🍔", "🍕", "🌮", "🍣", "🍟", "🥓", "🥐", "🧀", "🍗", "🥩"]
      };
      const themeNames = Object.keys(themes);
      const chosenTheme = themeNames[Math.floor(Math.random() * themeNames.length)];
      const symbols = themes[chosenTheme];

      let slot1, slot2, slot3;
      let winnings = 0;
      let jackpot = false;

      // 🎰 90% win / 10% lose
      const isWinningCombo = Math.random() < 0.9;

      if (isWinningCombo) {
        // 💎 Jackpot 1% chance
        if (Math.random() < 0.01) {
          slot1 = slot2 = slot3 = "💎";
          winnings = bet * 100;
          user.balance += winnings;
          jackpot = true;
          user.slotStats.jackpots++;
        } else {
          // Force a win with matching or near-matching symbols
          const winType = Math.random();
          if (winType < 0.3) {
            // Triple
            const s = symbols[Math.floor(Math.random() * symbols.length)];
            slot1 = slot2 = slot3 = s;
            winnings = bet * 3;
          } else {
            // Pair
            const s = symbols[Math.floor(Math.random() * symbols.length)];
            slot1 = slot2 = s;
            slot3 = symbols[Math.floor(Math.random() * symbols.length)];
            winnings = bet * 2;
          }
          user.balance += winnings;
          user.slotStats.won += winnings;
        }
      } else {
        // ❌ Lose round
        slot1 = symbols[Math.floor(Math.random() * symbols.length)];
        slot2 = symbols[Math.floor(Math.random() * symbols.length)];
        slot3 = symbols[Math.floor(Math.random() * symbols.length)];
        winnings = -bet;
        user.slotStats.lost += bet;
      }

      usersData.set(senderID, user);

      const bodyText = jackpot
        ? `🎉 JACKPOT! You won ${winnings} coins! 🎉`
        : winnings > 0
        ? `✅ You won ${winnings} coins!`
        : `❌ You lost ${Math.abs(winnings)} coins.`;

      const message = AuroraBetaStyler.styleOutput({
        headerText: `Slot Machine 🎰`,
        headerStyle: 'bold',
        bodyText: `${bodyText}\nSpin: [ ${slot1} | ${slot2} | ${slot3} ]\nBalance: ${user.balance} coins`,
        bodyStyle: 'sansSerif',
        footerText: ` • Games Played: ${user.slotStats.games}`,
      });

      api.sendMessage(message, threadID, messageID);
    } catch (error) {
      console.error("『 🌙 』 Error in slot command:", error);
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Slot Machine',
        headerStyle: 'bold',
        bodyText: '❌ An error occurred while playing the slot machine.',
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      api.sendMessage(errorMessage, threadID, messageID);
    }
  },
};