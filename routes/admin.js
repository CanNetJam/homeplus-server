const { default: axios } = require("axios");
const express = require ("express");
const router = express.Router();
const sql = require("mssql");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");

router.post("/login", async (req, res) => {
    try {
        let data = {
            Username: req.body.email,
            Password: req.body.password,
        }
        const internalApi = await axios(
            {
                method: "post",
                url: "https://prod.paproperties.com.ph/PAAPIs/ldap/login",
                data: data,
                headers: { "Content-Type": "multipart/form-data" },
            }
        )
        
        if (internalApi.data.status===true) {
            let query = `EXEC [HI_Plus].[NSP_Get_Employee_Details] '${data.Username}'`

            new sql.Request().query(query, (err, sqlres) => {
                if (err) {
                    res.status(500).json(err)
                    console.error("Error executing query:", err);
                } else {
                    if (sqlres.recordset.length<1) {
                        res.status(200).send("Invalid login credentials.")
                    } else {
                        const token = jwt.sign(
                        { userName: data.Username }, 
                        process.env.JWT_SECRET, 
                        req.body.remember===true ? null : { expiresIn: 15 * 60 }
                        )  
                        return res.status(200).json({
                            token: token,
                            user: sqlres.recordset[0]
                        })
                    }
                }
            });
        } else {
            res.status(200).send("Invalid login credentials.")
        }
    } catch (err){
        console.log(err)
        res.status(500).send(err)
    }
})

router.get("/user-data", auth, async (req, res) => {
    try {
        let query = `EXEC [HI_Plus].[NSP_Get_Employee_Details] '${req.user.userName}'`
        new sql.Request().query(query, (err, sqlres) => {
            if (err) {
                res.status(500).json(err)
                console.error("Error executing query:", err);
            } else {
                if (sqlres.recordset.length<1) {
                    res.status(200).send("Invalid login credentials.")
                } else {
                    let getSystems = `
                        SELECT System 
                        FROM dbo.Admin_Account_Mapping  
                        WHERE GENERAL_INFO_ID='${sqlres.recordset[0].Id}'
                    `;
                    
                    new sql.Request().query(getSystems, (err, sqlres2) => {
                        if (err) {
                            console.error("Error executing query:", err);
                            res.status(200).send("Invalid login credentials.")
                        } else {
                            const userInfo = {
                                account: sqlres.recordset[0],
                                systems: []
                            }
                            for (let system of sqlres2.recordset) {
                                userInfo.systems.push(system.System)
                            }
                            
                            return res.status(200).send(userInfo)
                        }
                    })
                }
            }
        });
    } catch (err){
        console.log(err)
        res.status(500).send(err)
    }
})

module.exports = router