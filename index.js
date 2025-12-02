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
        const { sender, receiver, message } = data; 
        const newMessage = new Messages({sender, receiver, message})
        await newMessage.save();

        socket.broadcast.emit("receive_message", data);

    });

    // socket.broadcast.emit("receive_message", data);

    socket.on("disconnect", () => {
        console.log("User disconnected", socket.id);
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
        }).sort({createdAt: 1});
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


