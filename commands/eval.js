const util = require("util");

const axios = require("axios");

module.exports = {

  name: "eval",

  description: "Execute codes quickly (Admin only). Usage: [reply or text]",

  author: "Aljur",

  role: 3,

  cooldown: 0,

  async run({ api, event, args }) {

    const { threadID, messageID, senderID, attachments } = event;

    let code = args.join(" ").trim();

    if (event.messageReply && event.messageReply.body) {

      code = event.messageReply.body;

    }

    if (!code) {

      return api.sendMessage(

        "Please provide code to execute or reply to a message with code.\nExample: #eval 1 + 2\nOr reply to a message with code.",

        threadID,

        messageID

      );

    }

    const logs = [];

    const customConsole = {

      log: (...args) => logs.push(`[log] ${args.join(" ")}`),

      error: (...args) => logs.push(`[error] ${args.join(" ")}`),

      warn: (...args) => logs.push(`[warn] ${args.join(" ")}`),

      info: (...args) => logs.push(`[info] ${args.join(" ")}`),

      debug: (...args) => logs.push(`[debug] ${args.join(" ")}`),

    };

    // Helper function to send attachments

    const attachment = async (url, message = "") => {

      try {

        const response = await axios.get(url, { responseType: "stream" });

        logs.push(`[attachment] Fetched attachment from ${url}`);

        const result = await api.sendMessage(

          { body: message, attachment: response.data },

          threadID,

          messageID

        );

        logs.push(`[attachment] Sent message: "${message}" with attachment from ${url}`);

        return result;

      } catch (error) {

        logs.push(`[error] Failed to send attachment from ${url}: ${error.message}`);

        return api.sendMessage(message || `Error sending attachment: ${error.message}`, threadID, messageID);

      }

    };

    const originalSendMessage = api.sendMessage;

    const sandbox = {

      api,

      event,

      args,

      threadID,

      messageID,

      senderID,

      attachments: attachments || [],

      console: customConsole,

      util,

      axios,

      attachment,

      require,

      process,

      setTimeout,

      setInterval,

      setImmediate,

      clearTimeout,

      clearInterval,

      clearImmediate,

    };

    try {

      console.log("[EVAL] Evaluating code:", code);

      const result = await new Function("sandbox", `

        with (sandbox) {

          return (async () => {

            ${code}

          })();

        }

      `)(sandbox);

      let formattedResult = "";

      if (result !== undefined) {

        formattedResult = typeof result !== "string" ? util.inspect(result, { depth: 2 }) : result;

      }

      let response = "";

      if (logs.length > 0) {

        response += `Logs:\n${logs.join("\n")}\n`;

      }

      if (formattedResult) {

        response += `Result:\n${formattedResult}\n`;

      }

      console.log("[EVAL] Sending response:", response);

      await api.sendMessage(response || "Command executed with no output or logs.", threadID, messageID);

    } catch (error) {

      console.log("[EVAL] Error during evaluation:", error.message);

      let response = `❌ Error: ${error.message}`;

      if (logs.length > 0) {

        response = `Logs:\n${logs.join("\n")}\n\n${response}`;

      }

      await api.sendMessage(response, threadID, messageID);

      await api.setMessageReaction("❌", messageID, (err) => {

        if (err) console.log("[EVAL] Failed to react:", err);

      });

    } finally {

      api.sendMessage = originalSendMessage;

    }

  },

};