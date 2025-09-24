const mongoose = require("mongoose");

module.exports.config = {
 name: "mongodb",
 version: "1.1.0",
 hasPermssion: 2,
 credits: "Jonell Hutchin Magallanes",
 description: "Manage MongoDB database",
 usePrefix: true,
 commandCategory: "system",
 usages: "mongodb [find|insert|update|delete|status|count] [data]",
 cooldowns: 5,
 dependencies: {
 "mongoose": ""
 }
};

let isConnected = false;

async function connectDB() {
 if (!isConnected) {
 await mongoose.connect("mongodb+srv://Hydrabot:RobloxBot22%21@hydrabot.6qt7bn6.mongodb.net/?retryWrites=true&w=majority&appName=Hydrabot", {
 useNewUrlParser: true,
 useUnifiedTopology: true
 });
 isConnected = true;
 }
}

const testSchema = new mongoose.Schema({
 name: String,
 value: String
});

const TestModel = mongoose.model("Test", testSchema);

module.exports.run = async function ({ api, event, args }) {
 try {
 await connectDB();

 const action = args[0];
 if (!action) return api.sendMessage("⚠️ Usage: mongodb [find|insert|update|delete|status|count] [data]", event.threadID, event.messageID);

 if (action === "status") {
 const state = mongoose.connection.readyState;
 const states = ["🔴 Disconnected", "🟡 Connecting", "🟢 Connected", "🟠 Disconnecting"];
 return api.sendMessage(`📡 MongoDB Status: ${states[state] || "Unknown"}`, event.threadID, event.messageID);
 }

 if (action === "count") {
 const total = await TestModel.countDocuments();
 return api.sendMessage(`📊 Total documents: ${total}`, event.threadID, event.messageID);
 }

 if (action === "find") {
 const data = await TestModel.find({});
 return api.sendMessage("📊 DB Data:\n" + JSON.stringify(data, null, 2), event.threadID, event.messageID);
 }

 if (action === "insert") {
 const name = args[1] || "Unnamed";
 const value = args[2] || "NoValue";
 const newDoc = new TestModel({ name, value });
 await newDoc.save();
 return api.sendMessage(`✅ Inserted { name: "${name}", value: "${value}" }`, event.threadID, event.messageID);
 }

 if (action === "update") {
 const name = args[1];
 const newValue = args[2];
 if (!name || !newValue) return api.sendMessage("⚠️ Usage: mongodb update <name> <newValue>", event.threadID, event.messageID);
 const res = await TestModel.updateOne({ name }, { value: newValue });
 return api.sendMessage(res.modifiedCount > 0 ? `🔄 Updated "${name}" to "${newValue}"` : `❌ No document found with name "${name}"`, event.threadID, event.messageID);
 }

 if (action === "delete") {
 const name = args[1];
 if (!name) return api.sendMessage("⚠️ Usage: mongodb delete <name>", event.threadID, event.messageID);
 const res = await TestModel.deleteOne({ name });
 return api.sendMessage(res.deletedCount > 0 ? `🗑️ Deleted document with name "${name}"` : `❌ No document found with name "${name}"`, event.threadID, event.messageID);
 }

 return api.sendMessage("❌ Unknown action. Use find | insert | update | delete | status | count", event.threadID, event.messageID);
 } catch (err) {
 api.sendMessage("⚠️ MongoDB Error: " + err.message, event.threadID, event.messageID);
 }
};