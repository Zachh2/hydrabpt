import * as util from "util";
import axios from "axios";
import AuroraBetaStyler from "@aurora/styler";
const { LINE } = AuroraBetaStyler;

namespace ShadowBot {
  export interface Command {
    config: {
      name: string;
      description: string;
      author: string;
      role?: number;
    };
    run: (context: {
      api: any;
      event: any;
      args: string[];
    }) => Promise<void>;
  }
}

const compileCommand: ShadowBot.Command = {
  config: {
    name: "compile",
    description: "Compile a JavaScript code",
    author: "Aljur Pogoy",
    role: 3,
  },
  run: async ({ api, event, args }) => {
    const { threadID, messageID, senderID, attachments } = event;
    let code = args.join(" ").trim();
    if (event.messageReply && event.messageReply.body) {
      code = event.messageReply.body;
    }
    if (!code) {
      return api.sendMessage("Please provide JavaScript code to compile", threadID, messageID);
    }

    const logs: string[] = [];
    const customConsole = {
      log: (...args: any[]) => {
        logs.push(`[log] ${args.join(" ")}`);
      },
      error: (...args: any[]) => {
        logs.push(`[error] ${args.join(" ")}`);
      },
      warn: (...args: any[]) => {
        logs.push(`[warn] ${args.join(" ")}`);
      },
      info: (...args: any[]) => {
        logs.push(`[info] ${args.join(" ")}`);
      },
      debug: (...args: any[]) => {
        logs.push(`[debug] ${args.join(" ")}`);
      },
    };

    const attachment = async (url: string, message: string = "") => {
      try {
        const response = await axios.get(url, { responseType: "stream" });
        const result = await api.sendMessage(
          { body: message, attachment: response.data },
          threadID,
          messageID
        );
        return result;
      } catch (error: any) {
        return api.sendMessage(message || `Error sending attachment: ${error.message}`, threadID, messageID);
      }
    };

    const message = {
      reply: (text: string, callback?: (err: any, info: any) => void) =>
        api.sendMessage(text, threadID, callback, messageID),
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
      message,
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
      cidkagenou: global.db,
      // Add AuroraBetaStyler and LINE to the sandbox
      AuroraBetaStyler,
      LINE,
    };

    try {
      const result = await new Function("sandbox", `
        with (sandbox) {
          return (async () => {
            return eval(\`${code}\`);
          })();
        }
      `)(sandbox);
      let formattedResult = "";
      if (result !== undefined) {
        formattedResult =
          typeof result !== "string"
            ? util.inspect(result, { depth: 2 })
            : result;
      }
      let response = "";
      if (logs.length > 0) {
        response += `Logs:\n${logs.join("\n")}\n`;
      }
      if (formattedResult) {
        response += `Compiled Output:\n${formattedResult}\n`;
      }
      await api.sendMessage(response || "Code executed with no output.", threadID, messageID);
    } catch (error: any) {
      let response = `❌ Compilation Error: ${error.message}`;
      if (logs.length > 0) {
        response = `Logs:\n${logs.join("\n")}\n\n${response}`;
      }
      await api.sendMessage(response, threadID, messageID);
      await api.setMessageReaction("❌", messageID, () => {});
    } finally {
      api.sendMessage = originalSendMessage;
    }
  },
};

export default compileCommand;