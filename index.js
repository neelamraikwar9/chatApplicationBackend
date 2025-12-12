const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth");
const { Server } = require("socket.io");
const Messages = require("./models/Messages");
const ChatUserss = require("./models/User");

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    // origin: "http://localhost:3000",
    origin: "*",

  },
});

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Mongodb connected."))
  .catch((error) => console.log(error));

app.use("/auth", authRoutes);


//socket io logic

io.on("connection", (socket) => {
  console.log("User connected", socket.id);

   socket.on("user_Room", (username) => {
    socket.join(username); // join room = username
    console.log(`${username} joined room ${username}`);
  });


  socket.on("send_message", async (data) => {
    console.log(data.receiver, "dataReciverrrrr");

    const messageId = `msg_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    const newMessage = new Messages({
      ...data, // sender, receiver, message (from existing fields)
      messageId,
      status: "sent",
    });
    const saved = await newMessage.save();

    console.log(data.receiver, "dataReciver");

      // Send to the receiver’s room
    // io.to(data.receiver).emit("receive_message", saved.toObject());
    socket.to(data.receiver).emit("receive_message", saved.toObject());
    
    


    //reciver confirms deliver; 
    socket.to(data.receiver).emit("message_delivered", {messageId: saved.messageId});


    // Optionally send back to sender
    socket.emit("receive_message", saved.toObject());
    
  });

  //     //Typing Indicator — Show “User is typing…” in real-time
  //   socket.on("typing", (data) => {
  //   console.log('Server: Broadcasting typing', data);
  //   socket.to(data.receiver).emit('typing', data);
  // });

  //   socket.on("stop_typing", (data) => {
  //   socket.to(data.receiver).emit('stop_typing', data);
  // });

  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
  });

  //4. Read Receipt Handler

  //Mark as delivered;
  socket.on("message_delivered", async (data) => {
    // updating single message in db; 

    await Messages.updateOne(
      {messageId: data.messageId},
      {status: "delivered"}  // Gray double tick ✓✓
    );
       // Notify sender only
    socket.to(data.sender).emit("message_delivered", {
    messageId: data.messageId
    }
    )
  })


  // Mark as Read;
  socket.on("message_read", async (data) => {
    console.log( data, "dataa");

   const result = await Messages.updateMany(
      { messageId: { $in: data.messageIds}, status: { $ne: "read" } },
      { status: "read" }
    );
    
      console.log("Updated", result.modifiedCount, "messages");

        if(result.modifiedCount > 0){
    socket.to(data.sender).emit("message_read", { messageIds: data.messageIds });
        }
  }); 
 

});

app.get("/messages", async (req, res) => {
  const { sender, receiver } = req.query;
  try {
    const messages = await Messages.find({
      $or: [
        { sender, receiver },
        { sender: receiver, receiver: sender },
      ],
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Error fetching messages." });
  }
});

app.get("/users", async (req, res) => {
  const { currentUser } = req.query;
  try {
    const users = await ChatUserss.find({ username: { $ne: currentUser } });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users." });
  }
});

// const PORT = process.env.PORT || 5001;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

