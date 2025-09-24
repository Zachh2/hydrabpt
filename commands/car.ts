import AuroraBetaStyler from '@aurora/styler';

module.exports = {
  config: {
    name: "car",
    author: "Aljur Pogoy",
    description: "Manage and race cars with subcommands: buy, sell, wash, race, duel, list",
    aliases: ["cars"],
  },
  async run({ api, event, args, usersData }: { api: any; event: any; args: string[]; usersData: Map<string, ShadowBot.UserData> }) {
    const { threadID, messageID, senderID } = event;
    try {
      let user = usersData.get(senderID) || { balance: 0, bank: 0, lastWork: 0, car: null, carCondition: 100 };
      user.balance = user.balance || 0;
      user.bank = user.bank || 0;
      user.lastWork = user.lastWork || 0;
      user.car = user.car || null;
      user.carCondition = user.carCondition || 100;
      usersData.set(senderID, user);

      const subcommand = args[0]?.toLowerCase();
      const model = args.slice(1).join(" ").trim();

      const availableCars = [
        { model: "Mazda MX-5 Miata", price: 3000 },
        { model: "Subaru BRZ", price: 3100 },
        { model: "Toyota GR86", price: 3100 },
        { model: "Ford Mustang EcoBoost", price: 3200 },
        { model: "Chevrolet Camaro LT1", price: 3400 },
        { model: "Hyundai N Vision 74", price: 4000 },
        { model: "Nissan Z", price: 4200 },
        { model: "Ford Mustang GT", price: 4400 },
        { model: "Toyota GR Supra", price: 4600 },
        { model: "BMW M240i Coupe", price: 5000 },
        { model: "Audi S5 Coupe", price: 5700 },
        { model: "Chevrolet Corvette Stingray", price: 6800 },
        { model: "Porsche 718 Cayman", price: 7000 },
        { model: "Lexus RC F", price: 7200 },
        { model: "BMW M4", price: 7800 },
        { model: "Audi RS5", price: 8000 },
        { model: "Jaguar F-Type R", price: 9500 },
        { model: "Nissan GT-R Premium", price: 12200 },
        { model: "Porsche 911 Turbo", price: 19000 },
        { model: "Audi R8 V10", price: 16000 },
        { model: "McLaren Artura", price: 23700 },
        { model: "Aston Martin Vantage", price: 15000 },
        { model: "Ferrari Roma", price: 24000 },
        { model: "Lamborghini Huracán Tecnica", price: 25000 },
        { model: "Ferrari SF90 Stradale", price: 52400 },
        { model: "McLaren 750S", price: 33000 },
        { model: "Lamborghini Revuelto", price: 60800 },
        { model: "Bugatti Chiron", price: 300000 },
        { model: "Koenigsegg Jesko", price: 350000 },
        { model: "Pagani Utopia", price: 250000 },
      ];

      switch (subcommand) {
        case "buy":
          if (user.car) {
            const errorMessage = AuroraBetaStyler.styleOutput({
              headerText: 'Car',
              headerStyle: 'bold',
              bodyText: '❌ You already own a car! Sell it first.',
              bodyStyle: 'sansSerif',
              footerText: '',
            });
            return api.sendMessage(errorMessage, threadID, messageID);
          }
          if (!model) {
            const errorMessage = AuroraBetaStyler.styleOutput({
              headerText: 'Car',
              headerStyle: 'bold',
              bodyText: '❌ Please specify a car model to buy! Use /car list to see options.',
              bodyStyle: 'sansSerif',
              footerText: '',
            });
            return api.sendMessage(errorMessage, threadID, messageID);
          }

          const selectedCar = availableCars.find(car => car.model.toLowerCase() === model.toLowerCase());
          if (!selectedCar) {
            const errorMessage = AuroraBetaStyler.styleOutput({
              headerText: 'Car',
              headerStyle: 'bold',
              bodyText: `❌ Car model "${model}" not found! Use /car list to see available cars.`,
              bodyStyle: 'sansSerif',
              footerText: '',
            });
            return api.sendMessage(errorMessage, threadID, messageID);
          }

          if (user.balance < selectedCar.price) {
            const errorMessage = AuroraBetaStyler.styleOutput({
              headerText: 'Car',
              headerStyle: 'bold',
              bodyText: `❌ Insufficient balance! You need ${selectedCar.price} coins to buy a ${selectedCar.model}. Current: ${user.balance} coins`,
              bodyStyle: 'sansSerif',
              footerText: '',
            });
            return api.sendMessage(errorMessage, threadID, messageID);
          }

          user.balance -= selectedCar.price;
          user.car = { model: selectedCar.model, value: selectedCar.price };
          user.carCondition = 100;
          usersData.set(senderID, user);
          const buyMessage = AuroraBetaStyler.styleOutput({
            headerText: 'Car',
            headerStyle: 'bold',
            bodyText: `✅ Bought a ${user.car.model} for ${selectedCar.price} coins!\nCondition: ${user.carCondition}%\nBalance: ${user.balance} coins`,
            bodyStyle: 'sansSerif',
            footerText: '',
          });
          api.sendMessage(buyMessage, threadID, messageID);
          break;

        case "sell":
          if (!user.car) {
            const errorMessage = AuroraBetaStyler.styleOutput({
              headerText: 'Car',
              headerStyle: 'bold',
              bodyText: '❌ You don’t own a car to sell!',
              bodyStyle: 'sansSerif',
              footerText: '',
            });
            return api.sendMessage(errorMessage, threadID, messageID);
          }
          const sellValue = Math.floor(user.car.value * (user.carCondition / 100));
          user.balance += sellValue;
          const soldModel = user.car.model;
          user.car = null;
          user.carCondition = 100;
          usersData.set(senderID, user);
          const sellMessage = AuroraBetaStyler.styleOutput({
            headerText: 'Car',
            headerStyle: 'bold',
            bodyText: `✅ Sold your ${soldModel} for ${sellValue} coins!\nBalance: ${user.balance} coins`,
            bodyStyle: 'sansSerif',
            footerText: '',
          });
          api.sendMessage(sellMessage, threadID, messageID);
          break;

        case "wash":
          if (!user.car) {
            const errorMessage = AuroraBetaStyler.styleOutput({
              headerText: 'Car',
              headerStyle: 'bold',
              bodyText: '❌ You don’t own a car to wash!',
              bodyStyle: 'sansSerif',
              footerText: '',
            });
            return api.sendMessage(errorMessage, threadID, messageID);
          }
          const washCost = 20;
          if (user.balance < washCost) {
            const errorMessage = AuroraBetaStyler.styleOutput({
              headerText: 'Car',
              headerStyle: 'bold',
              bodyText: `❌ Insufficient balance! Washing costs ${washCost} coins. Current: ${user.balance} coins`,
              bodyStyle: 'sansSerif',
              footerText: '',
            });
            return api.sendMessage(errorMessage, threadID, messageID);
          }
          user.balance -= washCost;
          user.carCondition = Math.min(100, user.carCondition + 20);
          usersData.set(senderID, user);
          const washMessage = AuroraBetaStyler.styleOutput({
            headerText: 'Car',
            headerStyle: 'bold',
            bodyText: `✅ Washed your ${user.car.model}! Condition increased to ${user.carCondition}%\nBalance: ${user.balance} coins`,
            bodyStyle: 'sansSerif',
            footerText: '',
          });
          api.sendMessage(washMessage, threadID, messageID);
          break;

        case "race":
          if (!user.car) {
            const errorMessage = AuroraBetaStyler.styleOutput({
              headerText: 'Car',
              headerStyle: 'bold',
              bodyText: '❌ You don’t own a car to race!',
              bodyStyle: 'sansSerif',
              footerText: '',
            });
            return api.sendMessage(errorMessage, threadID, messageID);
          }
          const raceCost = 30;
          if (user.balance < raceCost) {
            const errorMessage = AuroraBetaStyler.styleOutput({
              headerText: 'Car',
              headerStyle: 'bold',
              bodyText: `❌ Insufficient balance! Racing costs ${raceCost} coins. Current: ${user.balance} coins`,
              bodyStyle: 'sansSerif',
              footerText: '',
            });
            return api.sendMessage(errorMessage, threadID, messageID);
          }
          user.balance -= raceCost;
          const raceWinChance = Math.random();
          let earnings = 0;
          if (raceWinChance > 0.3) {
            earnings = Math.floor(raceCost * 2 * (user.carCondition / 100));
            user.balance += earnings;
          }
          user.carCondition = Math.max(0, user.carCondition - 10);
          usersData.set(senderID, user);
          const raceMessage = AuroraBetaStyler.styleOutput({
            headerText: 'Car',
            headerStyle: 'bold',
            bodyText: `🏎️ Raced your ${user.car.model}!\n${earnings > 0 ? `🎉 Won ${earnings} coins!` : '😔 Lost the race.'}\nCondition: ${user.carCondition}%\nBalance: ${user.balance} coins`,
            bodyStyle: 'sansSerif',
            footerText: '',
          });
          api.sendMessage(raceMessage, threadID, messageID);
          break;

        case "duel":
          if (!user.car) {
            const errorMessage = AuroraBetaStyler.styleOutput({
              headerText: 'Car',
              headerStyle: 'bold',
              bodyText: '❌ You don’t own a car to duel!',
              bodyStyle: 'sansSerif',
              footerText: '',
            });
            return api.sendMessage(errorMessage, threadID, messageID);
          }
          const duelCost = 50;
          if (user.balance < duelCost) {
            const errorMessage = AuroraBetaStyler.styleOutput({
              headerText: 'Car',
              headerStyle: 'bold',
              bodyText: `❌ Insufficient balance! Dueling costs ${duelCost} coins. Current: ${user.balance} coins`,
              bodyStyle: 'sansSerif',
              footerText: '',
            });
            return api.sendMessage(errorMessage, threadID, messageID);
          }
          user.balance -= duelCost;
          const duelWinChance = Math.random();
          let duelEarnings = 0;
          if (duelWinChance > 0.4) {
            duelEarnings = Math.floor(duelCost * 3 * (user.carCondition / 100));
            user.balance += duelEarnings;
          }
          user.carCondition = Math.max(0, user.carCondition - 15);
          usersData.set(senderID, user);
          const duelMessage = AuroraBetaStyler.styleOutput({
            headerText: 'Car',
            headerStyle: 'bold',
            bodyText: `💥 Duled with your ${user.car.model}!\n${duelEarnings > 0 ? `🎉 Won ${duelEarnings} coins!` : '😔 Lost the duel.'}\nCondition: ${user.carCondition}%\nBalance: ${user.balance} coins`,
            bodyStyle: 'sansSerif',
            footerText: '',
          });
          api.sendMessage(duelMessage, threadID, messageID);
          break;

        case "list":
          let carList = "📋 Available Cars:\n";
          availableCars.forEach(car => {
            carList += `- ${car.model} | ${car.price} coins\n`;
          });
          const listMessage = AuroraBetaStyler.styleOutput({
            headerText: 'Car',
            headerStyle: 'bold',
            bodyText: carList,
            bodyStyle: 'sansSerif',
            footerText: '',
          });
          api.sendMessage(listMessage, threadID, messageID);
          break;

        default:
          const helpMessage = AuroraBetaStyler.styleOutput({
            headerText: 'Car',
            headerStyle: 'bold',
            bodyText: '📋 Available subcommands:\n- /car buy <model>: Buy a car (e.g., /car buy Mazda MX-5 Miata)\n- /car sell: Sell your car\n- /car wash: Wash your car (20 coins, +20% condition)\n- /car race: Race for coins (30 coins entry)\n- /car duel: Duel another car (50 coins entry)\n- /car list: Show available cars',
            bodyStyle: 'sansSerif',
            footerText: '',
          });
          api.sendMessage(helpMessage, threadID, messageID);
      }
    } catch (error) {
      console.error("『 🌙 』 Error in car command:", error);
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: 'Car',
        headerStyle: 'bold',
        bodyText: '❌ An error occurred while managing your car.',
        bodyStyle: 'sansSerif',
        footerText: '',
      });
      api.sendMessage(errorMessage, threadID, messageID);
    }
  },
};