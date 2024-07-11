const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const sql = require("mssql");

router.post("/tokenIsValid", async (req, res) => {
    try {
        const token = req.header("auth-token")
        if (!token) {
            return res.send("Invalid credentials.")
        }
        
        jwt.verify(token, process.env.JWT_SECRET, function(err, decode){
            if (err) {
                return res.send("Invalid credentials.")
            } else {
                if (Date.now() >= decode.exp * 1000) {
                    return res.send("Session expired. Log in again.")
                } else {
                    let query2 = `SELECT * 
                    FROM REG.UserMapping 
                    WHERE OutsystemUserId='${decode._id}'`;
            
                    new sql.Request().query(query2, (err, sqlres) => {
                        if (err) {
                            res.status(500).json(err)
                            console.error("Error executing query:", err);
                        } else {
                            if (sqlres.recordset.length<1) {
                                return res.send("User data not found.")
                            } else {
                                return res.send(true)
                            }
                        }
                    });
                }
            }
        })
    } catch {
        res.status(500)
    }
})

module.exports = router