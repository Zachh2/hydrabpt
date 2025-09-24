const axios = require("axios");

const models = {

  aidetectorv1: "https://kaiz-apis.gleeze.com/api/aidetector?q=",

  aidetectorv2: "https://kaiz-apis.gleeze.com/api/aidetector-v2?q=",

  bertai: "https://kaiz-apis.gleeze.com/api/bert-ai?q=",

  blackbox: "https://kaiz-apis.gleeze.com/api/blackbox?ask=",

  chippai: "https://kaiz-apis.gleeze.com/api/chipp-ai?ask=",

  codestralv1: "https://kaiz-apis.gleeze.com/api/codestral-latest?q=",

  codestralv2: "https://kaiz-apis.gleeze.com/api/codestral-mamba?q=",

  deepseekv1: "https://kaiz-apis.gleeze.com/api/deepseek-r1?ask=",

  deepseekv2: "https://kaiz-apis.gleeze.com/api/deepseek-v3?ask=",

  geminivision: "https://kaiz-apis.gleeze.com/api/gemini-vision?q=",

  copilot: "https://kaiz-apis.gleeze.com/api/github-copilot?ask=",

  gpt3: "https://kaiz-apis.gleeze.com/api/gpt-3.5?q=",

  gpt4: "https://kaiz-apis.gleeze.com/api/gpt-4o?ask=",

  gpt4o: "https://kaiz-apis.gleeze.com/api/gpt-4o-pro?ask=",

  gpt4mini: "https://kaiz-apis.gleeze.com/api/gpt4o-mini?ask=",

  ministrallarge: "https://kaiz-apis.gleeze.com/api/mistral-large?q=",

  ministalsmall: "https://kaiz-apis.gleeze.com/api/mistral-small?q=",

  mixtral8xb: "https://kaiz-apis.gleeze.com/api/mixtral-8x22b?q=",

  mixtral8xS: "https://kaiz-apis.gleeze.com/api/mixtral-8x7b?q=",

  pixtral2b: "https://kaiz-apis.gleeze.com/api/pixtral-12b?q=",

  qwen2xc: "https://kaiz-apis.gleeze.com/api/qwen2.5-72b?ask=",

};

module.exports = {

  name: "model",

  category: "AI",

  execute: async (api, event, args, commands, prefix, admins, appState, sendMessage) => {

    const { threadID, senderID } = event;

    // Debugging: Log available models

    console.log("📌 Available models:", Object.keys(models));

    // If no model is provided, show list

    if (!args[1]) {

      const modelList = Object.keys(models).join("\n");

      sendMessage(api, {

        threadID,

        message: `**Available AI Models:**\n\n${modelList}\n\n💡 **Usage:** /model <model_name> <prompt>`,

      });

      return;

    }

    // Ensure model name is correctly read

    const model = args[1].trim().toLowerCase(); // Trim and normalize case

    console.log(`🔍 User requested model: ${model}`);

    // Check if the model exists

    if (!models.hasOwnProperty(model)) {

      sendMessage(api, {

        threadID,

        message: `❌ Invalid AI model!\nUse /model to see available models.`,

      });

      return;

    }

    // Ensure prompt exists

    if (args.length < 3) {

      sendMessage(api, {

        threadID,

        message: `❌ Please provide a prompt!\nUsage: /model ${model} <your question>`,

      });

      return;

    }

    const prompt = args.slice(2).join(" "); // Extract only the prompt

    try {

      const url = `${models[model]}${encodeURIComponent(prompt)}&uid=${senderID}`;

      console.log(`🌐 Fetching API: ${url}`);

      const response = await axios.get(url);

      console.log(`✅ API Response for ${model}:`, response.data); 

      const reply =

        response.data.response ||  

        response.data.reply ||

        response.data.result ||

        response.data.message ||

        response.data.text ||

        "⚠️ No valid response received.";

      sendMessage(api, {

        threadID,

        message: `🤖 ${model.toUpperCase()} AI Response:\n${reply}`,

      });

    } catch (error) {

      console.error("❌ API Error:", error);

      sendMessage(api, {

        threadID,

        message: `❌ **Error fetching response!**\n${error.message}`,

      });

    }

  },

};