const axios = require("axios");

module.exports = {

  name: "sillydevafkbot",

  description: "Make a POST request to the SillyDev AFK Bot API with a cookie",

  usage: "#sillydevafkbot <cookie>",

  async run({ api, event, args }) {

    const { threadID, messageID } = event;

    // Check if a cookie was provided

    if (args.length === 0) {

      const message = `==========\n✦ SillyDev AFK Bot ✦\n==========\nPlease provide a cookie!\nUsage: #sillydevafkbot <cookie>\n==========`;

      return api.sendMessage(message, threadID, messageID);

    }

    const cookie = args.join(" "); // Join all args as the cookie

    try {

      // Make the POST request to the API

      const response = await axios.post(

        "https://haji-mix.up.railway.app/api/sillydevafkbot",

        { cookie },

        {

          headers: {

            "Content-Type": "application/json",

          },

        }

      );

      // Format the API response with the old design

      const result = response.data;

      const message = `==========\n✦ SillyDev AFK Bot ✦\n==========\nResponse:\n${JSON.stringify(result, null, 2)}\n==========`;

      return api.sendMessage(message, threadID, messageID);

    } catch (error) {

      // Handle errors with the old design

      let errorMessage = `==========\n✦ SillyDev AFK Bot ✦\n==========\nError: Failed to contact the API!\n`;

      if (error.response) {

        errorMessage += `Status: ${error.response.status}\nDetails: ${JSON.stringify(error.response.data, null, 2)}\n`;

      } else {

        errorMessage += `Details: ${error.message}\n`;

      }

      errorMessage += `==========`;

      return api.sendMessage(errorMessage, threadID, messageID);

    }

  },

};