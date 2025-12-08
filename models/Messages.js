const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    sender: {type: String, required: true},
    receiver: {type: String, required: true},
    message: {type: String, required: true},


    messageId: { type: String, unique: true},
    status: {
        type: String, 
        enum: ['sent', 'delivered', 'read'],
        default: 'sent'
    }
},
{timestamps: true}
);

module.exports = mongoose.model("Messages", messageSchema);
