const express = require("express");
const sql = require("mssql");
require('dotenv').config();
const serverConfig = require("./config/server.js");
const userRoute = require ('./routes/user');
const tokenRoute = require ('./routes/token');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/user", userRoute)
app.use("/token", tokenRoute)

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
app.listen(3000, () => {
    console.log("Listening on port 3000...");
});