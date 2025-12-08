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
        origin: "http://localhost:3000",
    },
});


app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("Mongodb connected."))
.catch((error) => console.log(error));

app.use("/auth", authRoutes);

//socket io logic

io.on("connection", (socket) => {
    console.log("User connected", socket.id);

    socket.on("send_message", async(data) => {
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        // const { sender, receiver, message } = data; 
        // const newMessage = new Messages({ sender, receiver, message });

        const newMessage = new Messages({
        ...data,   // sender, receiver, message (from existing fields)
         messageId,
         status: 'sent',
    });
        const saved = await newMessage.save();

        //   send full saved message (with _id, createdAt, etc.)
        // socket.broadcast.emit("receive_message", saved);

                 // send to receiver
        socket.to(data.receiver).emit("receive_message", saved.toObject());

           // send back to sender too (so sender gets messageId + status)
  socket.emit("receive_message", saved.toObject());

        //  // send to receiver
        // socket.to(data.receiver).emit("receive_message", saved.toObject());

     



//         // Emit to receiver's socket room
//   socket.to(data.receiver).emit('message', newMessage.toObject());


// Confirm to sender
  socket.emit('message_delivered', { messageId });
  
    });

    //Typing Indicator — Show “User is typing…” in real-time

  socket.on("typing", (data) => {
  console.log('Server: Broadcasting typing', data);
  socket.to(data.receiver).emit('typing', data);   
});

  socket.on("stop_typing", (data) => {
  socket.to(data.receiver).emit('stop_typing', data); 
});


    socket.on("disconnect", () => {
        console.log("User disconnected", socket.id);
    });


//status tracking for Read Receipt; 
// socket.on('message', async(data) => {
//     const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

//     const newMessage = new Messages({
//         ...data,   // sender, receiver, message (from existing fields)
//          messageId,
//          status: 'sent',
//     });

//       await newMessage.save();
  
//   // Emit to receiver's socket room
// //   socket.to(data.receiver).emit('message', newMessage.toObject());


//   // Confirm to sender
//   socket.emit('message_delivered', { messageId });
// });



//4. Backend Read Receipt Handler

//Mark as Read; 
socket.on('message_read', async (data) => {
    await Messages.updateMany(
        { messageId: { $in: data.messageIds }, status: { $ne: 'read' } },
        { status: 'read' }
    );

    socket.to(data.sender).emit('message_read', { messageIds: data.messageIds });
});

});


app.get("/messages", async(req, res) => {
    const {sender, receiver} = req.query; 
    try {
        const messages = await Messages.find({
            $or: [
                { sender, receiver }, 
                { sender: receiver, receiver: sender},
            ]
        })
        .sort({createdAt: 1});
        res.json(messages);
    } catch (error) {
        res.status(500).json({message: "Error fetching messages."})
    }
});


app.get("/users", async(req, res) => {
    const { currentUser } = req.query; 
    try{
        const users = await ChatUserss.find({username: {$ne: currentUser}});
        res.json(users);
    } catch(error){
        res.status(500).json({message: "Error fetching users."})

    }
})

// const PORT = process.env.PORT || 5001; 
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const PORT = process.env.PORT || 5001; 
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));


