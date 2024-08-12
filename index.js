const express = require("express");
const sql = require("mssql");
require('dotenv').config();
const cors = require('cors');
const fse = require("fs-extra");
const path = require("path")
fse.ensureDirSync(path.join("public", "uploads"));

const serverConfig = require("./config/server.js");
const userRoute = require ('./routes/user');
const tokenRoute = require ('./routes/token');
const paymentRoute = require ('./routes/payment');
const docsRoute = require ('./routes/documents');
const constructionRoute = require ('./routes/construction');
const moveinRoute = require ('./routes/movein');
const termsRoute = require ('./routes/terms');
const chatRoute = require ('./routes/chat');
const adminRoute = require ('./routes/admin');
const adminChatRoute = require ('./routes/adminchat.js');

const app = express();
app.use('/files', express.static(path.join(__dirname, 'public/uploads')));
app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/user", userRoute)
app.use("/token", tokenRoute)
app.use("/payment", paymentRoute)
app.use("/document", docsRoute)
app.use("/construction", constructionRoute)
app.use("/movein", moveinRoute)
app.use("/terms", termsRoute)
app.use("/chat", chatRoute)
app.use("/admin", adminRoute)
app.use("/adminchat", adminChatRoute)

// Connect to SQL Server
sql.connect(serverConfig, err => {
    if (err) {
        throw err;
    }
    console.log("Connection Successful!");
});

app.get('/', async (req, res) => {
    return res.json("Server loaded.");
})

// Start the server on port 3000
const PORT = 3000
const server = app.listen(PORT, 
    console.log(`Node server started at port ${PORT}`)
)

const io = require("socket.io")(server, {
    cors: {
        //origin: `http://localhost:5173`
        origin: `http://spdits075:5173`
    }
})
  
let users = []

const addUser = (userId, socketId) => {
    !users.some((user) => user.userId.user === userId.user && user.userId.system === userId.system) &&
    users.push({ userId, socketId })
}

const removeUser = (socketId) => {
    users = users.filter((user) => user.socketId !== socketId)
}

const getUser = (userId) => {
    return users.find((user) => user.userId.user === userId.Member && user.userId.system === userId.System)
}

io.on("connection", (socket)=> {
    //console.log("A user has been connected.")

    socket.on("addUser", userId => {
        addUser(userId, socket.id)
        io.emit("getUsers", users)
    })

    socket.on("disconnect", () => {
        //console.log("A user has been disconnected!");
        removeUser(socket.id);
        io.emit("getUsers", users)
    })

    socket.on("sendMessage", ({ senderId, receiverId, text, type, conversationId }) => {
        const user = getUser(receiverId)
        if (user) {
            io.to(user.socketId).emit("getMessage", {
                Sender: senderId,
                Message: text,
                Type: type,
                CreatedAt: new Date(Date.now()).toISOString(),
                conversationId,
                System: user.system
            })
        } else {
            //console.log("The user is not online right now")
        }
    })
})