const mongoose = require("mongoose");

mongoose.connect("mongodb+srv://Hydrabot:RobloxBot22%21@hydrabot.6qt7bn6.mongodb.net/?retryWrites=true&w=majority&appName=Hydrabot", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Connected to MongoDB!"))
.catch(err => console.error("❌ Connection Error:", err));