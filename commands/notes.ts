import AuroraBetaStyler from '@aurora/styler';

interface UserData {
  // Add any user data types if needed, e.g., from your global.ts
}

interface NoteData {
  id?: string;
  text?: string;
  created_time?: number;
}

interface NoteStatus {
  status?: string;
  [key: string]: any;
}

type NotesCallback = (error: Error | null, data?: NoteData | NoteStatus | { deleted?: NoteStatus; created?: NoteStatus }) => void;

module.exports = {
  config: {
    name: "notes",
    author: "Aljur Pogoy",
    description: "Manage Facebook Messenger Notes (create, delete, recreate, check)",
    usage: "/notes <create|delete|recreate|check> [text/noteID/oldNoteID newText]",
    version: "1.0.0",
    aliases: ["note"],
  },
  run: async ({ api, event, args }) => {
    const { threadID, messageID, senderID } = event;
    const styledMessage = (header: string, body: string, symbol: string) =>
      AuroraBetaStyler.styleOutput({
        headerText: header,
        headerSymbol: symbol,
        headerStyle: "bold",
        bodyText: body,
        bodyStyle: "sansSerif",
        footerText: "",
      });

    const subcommand = args[0]?.toLowerCase();
    const text = args.slice(1).join(" ").trim();
    const noteID = args[1];
    const newText = args.slice(2).join(" ").trim();

    if (!subcommand) {
      return api.sendMessage(styledMessage("Notes Menu", "📝 Create - /notes create <text>\n🗑️ Delete - /notes delete <noteID>\n🔄 Recreate - /notes recreate <oldNoteID> <newText>\n🔍 Check - /notes check\n\n> Manage your Messenger notes!", "📝"), threadID, messageID);
    }

    // Helper function to handle API responses
    const handleResponse = (err: Error | null, data: any, successMsg: string, errorMsg: string) => {
      if (err) {
        return api.sendMessage(styledMessage("Notes", `${errorMsg}: ${err.message}`, "📝"), threadID, messageID);
      }
      api.sendMessage(styledMessage("Notes", successMsg, "📝"), threadID, messageID);
    };

    // Get actor_id from senderID, with fallback to api.getUserInfo
    const getActorID = async (): Promise<string> => {
      if (senderID) return senderID;
      try {
        const userInfo = await api.getUserInfo([event.senderID.toString()]);
        return userInfo[event.senderID.toString()]?.id || senderID || "unknown";
      } catch (err) {
        throw new Error("Failed to fetch user ID: " + (err as Error).message);
      }
    };

    switch (subcommand) {
      case "create":
        if (!text) {
          return api.sendMessage(styledMessage("Notes Create", "❌ Please provide text for the note!\nUsage: /notes create <text>", "📝"), threadID, messageID);
        }
        const actorID = await getActorID();
        createNote(text, actorID, api, (err, data) => handleResponse(err, data, "✅ Note created successfully!", "❌ Failed to create note"));
        break;

      case "delete":
        if (!noteID) {
          return api.sendMessage(styledMessage("Notes Delete", "❌ Please provide a noteID!\nUsage: /notes delete <noteID>", "🗑️"), threadID, messageID);
        }
        const delActorID = await getActorID();
        deleteNote(noteID, delActorID, api, (err, data) => handleResponse(err, data, "✅ Note deleted successfully!", "❌ Failed to delete note"));
        break;

      case "recreate":
        if (!noteID || !newText) {
          return api.sendMessage(styledMessage("Notes Recreate", "❌ Please provide oldNoteID and newText!\nUsage: /notes recreate <oldNoteID> <newText>", "🔄"), threadID, messageID);
        }
        const recActorID = await getActorID();
        recreateNote(noteID, newText, recActorID, api, (err, data) => handleResponse(err, data, "✅ Note recreated successfully!", "❌ Failed to recreate note"));
        break;

      case "check":
        checkNote(api, (err, data) => {
          if (err) {
            return api.sendMessage(styledMessage("Notes Check", `❌ Failed to check note: ${err.message}`, "🔍"), threadID, messageID);
          }
          const noteData = data as NoteData;
          const noteText = noteData.text || "No active note";
          api.sendMessage(styledMessage("Notes Check", `📝 Current Note: ${noteText}`, "🔍"), threadID, messageID);
        });
        break;

      default:
        return api.sendMessage(styledMessage("Notes", "❌ Invalid subcommand! Use: create, delete, recreate, or check", "📝"), threadID, messageID);
    }
  },
};

// Graph API Functions
function createNote(text: string, actorID: string, api: any, callback: NotesCallback): void {
  const variables = {
    input: {
      client_mutation_id: Math.round(Math.random() * 10).toString(),
      actor_id: actorID,
      description: text,
      duration: 86400, // 24 hours in seconds
      note_type: "TEXT_NOTE",
      privacy: "FRIENDS",
      session_id: (global as any).utils.getGUID(),
    },
  };
  const form = {
    fb_api_caller_class: "RelayModern",
    fb_api_req_friendly_name: "MWInboxTrayNoteCreationDialogCreationStepContentMutation",
    variables: JSON.stringify(variables),
    doc_id: "24060573783603122",
  };

  api
    .post("https://www.facebook.com/api/graphql/", (global as any).ctx.jar, form) // Assuming ctx.jar is globally available
    .then((global as any).utils.parseAndCheckLogin((global as any).ctx, api))
    .then((resData: any) => {
      if (resData && resData.errors) throw resData.errors[0];
      const status = resData?.data?.xfb_rich_status_create?.status;
      if (!status) throw new Error("Could not find note status in the server response.");
      callback(null, { status });
    })
    .catch((err: Error) => {
      (global as any).utils.error("notes.createNote", err);
      callback(err);
    });
}

function deleteNote(noteID: string, actorID: string, api: any, callback: NotesCallback): void {
  const variables = {
    input: {
      client_mutation_id: Math.round(Math.random() * 10).toString(),
      actor_id: actorID,
      rich_status_id: noteID,
    },
  };
  const form = {
    fb_api_caller_class: "RelayModern",
    fb_api_req_friendly_name: "useMWInboxTrayDeleteNoteMutation",
    variables: JSON.stringify(variables),
    doc_id: "9532619970198958",
  };

  api
    .post("https://www.facebook.com/api/graphql/", (global as any).ctx.jar, form)
    .then((global as any).utils.parseAndCheckLogin((global as any).ctx, api))
    .then((resData: any) => {
      if (resData && resData.errors) throw resData.errors[0];
      const deletedStatus = resData?.data?.xfb_rich_status_delete;
      if (!deletedStatus) throw new Error("Could not find deletion status in the server response.");
      callback(null, deletedStatus);
    })
    .catch((err: Error) => {
      (global as any).utils.error("notes.deleteNote", err);
      callback(err);
    });
}

function recreateNote(oldNoteID: string, newText: string, actorID: string, api: any, callback: NotesCallback): void {
  deleteNote(oldNoteID, actorID, api, (err, deleted) => {
    if (err) {
      return callback(err);
    }
    createNote(newText, actorID, api, (err, created) => {
      if (err) {
        return callback(err);
      }
      callback(null, { deleted, created });
    });
  });
}

function checkNote(api: any, callback: NotesCallback): void {
  const form = {
    fb_api_caller_class: "RelayModern",
    fb_api_req_friendly_name: "MWInboxTrayNoteCreationDialogQuery",
    variables: JSON.stringify({ scale: 2 }),
    doc_id: "30899655739648624",
  };

  api
    .post("https://www.facebook.com/api/graphql/", (global as any).ctx.jar, form)
    .then((global as any).utils.parseAndCheckLogin((global as any).ctx, api))
    .then((resData: any) => {
      if (resData && resData.errors) throw resData.errors[0];
      const currentNote = resData?.data?.viewer?.actor?.msgr_user_rich_status;
      callback(null, currentNote);
    })
    .catch((err: Error) => {
      (global as any).utils.error("notes.checkNote", err);
      callback(err);
    });
}