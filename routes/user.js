const express = require ("express");
const router = express.Router();
const sql = require("mssql");
const crypto = require('crypto');
const auth = require("../middleware/auth");
const jwt = require("jsonwebtoken");
const sendEmail  = require("../lib/sendEmailVerification");
const forgotPass = require("../lib/forgotPassEmail");

router.get("/user-data", auth, async (req, res) => {
    let query = `SELECT * 
    FROM REG.UserMapping 
    WHERE OutsystemUserId='${req.user._id}'`;

    new sql.Request().query(query, (err, sqlres) => {
        if (err) {
            res.status(500).json(err)
            console.error("Error executing query:", err);
        } else {
            if (sqlres.recordset.length<1) {
                return res.json(false)
            } else {
                let query2 = `SELECT Res.Cin, Res.CustomerCode, Res.System
                FROM [BUYERS_PORTAL].[RES].[Reservation] AS Res
                Full JOIN [BUYERS_PORTAL].[REG].[UserMapping] AS Reg
                ON Res.CustomerCode = Reg.CustomerCode 
                AND Res.System= Reg.System
                WHERE Res.CustomerCode='${sqlres.recordset[0].CustomerCode}'
                AND Res.System='${sqlres.recordset[0].System}'
                GROUP BY Res.CIN, Res.CustomerCode, Res.System`

                new sql.Request().query(query2, (err, sqlres2) => {
                    if (err) {
                        res.status(500).json(err)
                        console.error("Error executing query:", err);
                    } else {
                        async function checkCancel() {
                            const queryResults = await Promise.all(

                                sqlres2.recordset.map(async (record) => {
                                    let query3 = `EXEC [HI_Plus].[Check_Cancelled_Account] '${record.Cin}', '${record.System}', ${process.env.NODE_ENV? 0 : 1}`;
                                    
                                    return new Promise((resolve, reject) => 
                                        new sql.Request().query(query3, async (err, sqlres3) => {
                                            if (err) {
                                                console.error("Error executing query:", err);
                                                return reject(err)
                                            }
                                            else 
                                                if (sqlres3.recordset[0].IsCancelled===0) {
                                                    return resolve()
                                                } else {
                                                    let query4 = `SELECT *
                                                    FROM Res.Reservation 
                                                    WHERE CIN='${record.Cin}'
                                                    AND System='${record.System}'`

                                                    new sql.Request().query(query4, (err, sqlres4) => {
                                                        if (err) {
                                                            res.status(500).json(err)
                                                            console.error("Error executing query:", err);
                                                        } else {
                                                            return resolve(sqlres4.recordset[0])
                                                        }
                                                    })
                                                }
                                        })
                                    )
                                })
                            )
                            const userInfo = {
                                account: sqlres.recordset[0],
                                property: queryResults
                            }
                            
                            return res.status(200).send(userInfo)
                        }
                        checkCancel()
                    }
                })
                
            }
        }
    });
})

router.get("/lastdata", async (req, res) => {
    let query = `EXEC [BUYERS_PORTAL].[HI_Plus].[Get_Interest_Rate] '${req.query.data.unitCode}', '${req.query.data.customerCode}', '${req.query.data.system}', ${process.env.NODE_ENV? 0 : 1}`;

    new sql.Request().query(query, (err, sqlres) => {
        if (err) {
            res.status(500).json(err)
            console.error("Error executing query:", err);
        } else {
            if (sqlres.recordset.length<1) {
                return res.json(false)
            } else {
                let query2 = `EXEC [BUYERS_PORTAL].[HI_Plus].[Get_Loan_Term] '${req.query.data.unitCode}', '${req.query.data.customerCode}', '${req.query.data.system}', ${process.env.NODE_ENV? 0 : 1}`

                new sql.Request().query(query2, (err, sqlres2) => {
                    if (err) {
                        res.status(500).json(err)
                        console.error("Error executing query:", err);
                    } else {
                        res.status(200).json({
                            rate: sqlres.recordset[0]?.AnnualRate,
                            term: sqlres2.recordset[0]?.Term
                        })
                    }
                })
                
            }
        }
    });
})

router.post("/login", async (req, res) => {
    try {
        let query = `SELECT * 
        FROM REG.UserMapping 
        WHERE REG.UserMapping.UserName='${req.body.email.replace(/['"]+/g, '')}'`;

        new sql.Request().query(query, (err, sqlres) => {
            if (err) {
                res.status(500).json(err)
                console.error("Error executing query:", err);
            } else {
                if (sqlres.recordset.length>0) {//check email existence
                    if (sqlres.recordset[0].IsChanged===true) {//change password flag
                        let query2 = `SELECT * 
                        FROM REG.UserMapping 
                        INNER JOIN dbo.OSUSR_H9C_USERS2 
                        ON UserMapping.OutsystemUserId = dbo.OSUSR_H9C_USERS2.ID
                        WHERE REG.UserMapping.UserName='${req.body.email.replace(/['"]+/g, '')}' 
                        AND dbo.OSUSR_H9C_USERS2.PASSWORD='${req.body}'`;

                        new sql.Request().query(query2, (err, sqlres2) => {
                            if (err) {
                                res.status(500).json(err)
                                console.error("Error executing query:", err);
                            } else {
                                
                                if (sqlres2.recordset.length<1) {
                                    res.status(200).send(false); 
                                } else {
                                    const token = jwt.sign(
                                        { _id: sqlres2.recordset[0].OutsystemUserId }, 
                                        process.env.JWT_SECRET, 
                                        { expiresIn: 15 * 60 })
                                    res.status(200).json({
                                        token: token,
                                        user: sqlres2.recordset[0]
                                    }); 
                                }
                            }
                        });
                    } else {//normal login
                        let hashPass = crypto.pbkdf2Sync(req.body.pass, 'aes-192-cbc', 1000, 32, `sha512`).toString(`hex`);

                        let query2 = `SELECT * 
                        FROM REG.UserMapping 
                        INNER JOIN dbo.OSUSR_H9C_USERS2 
                        ON UserMapping.OutsystemUserId = dbo.OSUSR_H9C_USERS2.ID
                        WHERE REG.UserMapping.UserName='${req.body.email.replace(/['"]+/g, '')}' 
                        AND dbo.OSUSR_H9C_USERS2.PASSWORD='${hashPass}'`;

                        new sql.Request().query(query2, (err, sqlres2) => {
                            if (err) {
                                res.status(500).json(err)
                                console.error("Error executing query:", err);
                            } else {
                                if (sqlres2.recordset.length<1) {
                                    res.status(200).send(false); 
                                } else {
                                    const token = jwt.sign(
                                        { _id: sqlres2.recordset[0].OutsystemUserId }, 
                                        process.env.JWT_SECRET, 
                                        { expiresIn: 15 * 60 })                                
                                    res.status(200).json({
                                        token: token,
                                        user: sqlres2.recordset[0]
                                    }); 
                                } 
                            }
                        });
                    }
                } else {
                    res.status(200).send(false); 
                }
            }
        });
    }catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

router.post("/register-verify", async (req, res) => {
    try {
        let fname = req.body.firstname.toUpperCase().replace(/['"]+/g, '');
        let lname = req.body.lastname.toUpperCase().replace(/['"]+/g, '');

        //check if CIN exists
        let query = `EXEC [HI_Plus].[Check_CIN] '${req.body.cin}', '${lname}', '${fname}', ${process.env.NODE_ENV? 0 : 1}`;
        
        new sql.Request().query(query, async (err, sqlres) => {
            if (err) {
                res.status(500).json(err)
                console.error("Error executing query:", err);
            } else {
                if (sqlres.recordset[0].HasCin>0) {
                    //check if Account is cancelled
                    let query2 = `EXEC [HI_Plus].[Check_Cancelled_Account] '${req.body.cin.replace(/['"]+/g, '')}', '${sqlres.recordset[0].System}', ${process.env.NODE_ENV? 0 : 1}`;
                    
                    new sql.Request().query(query2, async (err, sqlres2) => {
                        if (err) {
                            res.status(500).json(err)
                            console.error("Error executing query:", err);
                        } else {
                            if (sqlres2.recordset[0].IsCancelled===0) {
                                res.status(200).send("House registration cancelled.");
                            } else {

                                let query3 = `SELECT *
                                FROM [BUYERS_PORTAL].[RES].[Reservation] AS Res
                                FULL JOIN [BUYERS_PORTAL].[REG].[UserMapping] AS Reg
                                ON Res.CustomerCode = Reg.CustomerCode AND Res.SYSTEM = Reg.SYSTEM
                                WHERE Reg.BuyersName='${fname + ' ' + req.body.middlename.replace(/['"]+/g, '') + ' ' + lname}'`;

                                new sql.Request().query(query3, async (err, sqlres3) => {
                                    if (err) {
                                        res.status(500).json(err)
                                        console.error("Error executing query:", err);
                                    } else {
                                        if (sqlres3.recordset.length>0) {

                                            if (sqlres3.recordset[0].IsCreated===true) {
                                                if (sqlres3.recordset[0].ISACTIVE===true) {

                                                    let checkAccount = `SELECT * FROM dbo.OSUSR_H9C_USERS2 WHERE USERNAME='${sqlres3.recordset[0].UserName}'`
                                                    new sql.Request().query(checkAccount, async (err, sqlres4) => {
                                                        if (err) {
                                                            res.status(500).json(err)
                                                            console.error("Error executing query:", err);
                                                        } else {
                                                            if(sqlres4.recordset.length<1){
                                                                res.status(200).send(true);
                                                            } else {
                                                                res.status(200).send("User is already registered.");
                                                            }
                                                        }
                                                    })

                                                } else {
                                                    res.status(200).send("Verify your account.");
                                                }
                                                
                                            } else {
                                                res.status(200).send(true);
                                            }
                                        } else {
                                            res.status(200).send(true);
                                        }
                                    }
                                })
                            }
                        }
                    })
                } else {
                    res.status(200).send("The CIN does not exist.");
                }
            }
        })
    } catch (err) {
        console.log(err)
        res.status(500).json(err);
    }
})

router.get("/username-verify", async (req, res) => {
    let query = `SELECT * 
    FROM REG.UserMapping 
    WHERE UserName='${req.query.username.replace(/['"]+/g, '')}'`;

    new sql.Request().query(query, (err, sqlres) => {
        if (err) {
            res.status(500).json(err)
            console.error("Error executing query:", err);
        } else {
            if (sqlres.recordset.length<1) {
                return res.json(false)
            } else {
                return res.json(true)
            }
        }
    });
})

router.post("/register", async (req, res) => {
    try {
        const userInput = {
            firstname: req.body.firstname.trim().toUpperCase().replace(/['"]+/g, ''),
            middlename: req.body.middlename.trim().toUpperCase().replace(/['"]+/g, ''),
            lastname: req.body.lastname.trim().toUpperCase().replace(/['"]+/g, ''),
            password: req.body.pass.trim(),
            email: req.body.email.trim().replace(/['"]+/g, ''),
            phone: req.body.phone.trim().replace(/['"]+/g, ''),
            username: req.body.userName.trim().replace(/['"]+/g, ''),
        }
        
        let hashPass = crypto.pbkdf2Sync(userInput.password, 'aes-192-cbc', 1000, 32, `sha512`).toString(`hex`);
        let query = `INSERT INTO dbo.OSUSR_H9C_USERS2 (NAME, PASSWORD, UserName, EMAIL, MOBILEPHONE, CREATION_DATE)
            VALUES ('${userInput.firstname}', '${hashPass}', '${userInput.username}', '${userInput.email}', '${userInput.phone}', GETDATE());`
        //Insert userdata on Outsystems table
        new sql.Request().query(query, (err, sqlres1) => {
            if (err) {
                res.status(500).json(err)
                console.error("Error executing query:", err);
            } else {
                let query2 = `SELECT ID FROM dbo.OSUSR_H9C_USERS2 WHERE USERNAME='${userInput.username}';`
                //Query the ID of the inserted user data
                new sql.Request().query(query2, (err, sqlres2) => {
                    if (err) {
                        res.status(500).json(err)
                        console.error("Error executing query:", err);
                    } else {
                        
                        let searchOnUserMapping = `SELECT * 
                        FROM REG.UserMapping
                        WHERE BuyersName='${userInput.firstname + ' ' + userInput.middlename + ' ' + userInput.lastname}';
                        `
                        new sql.Request().query(searchOnUserMapping, (err, sqlres3) => {
                            if (err) {
                                res.status(500).json(err)
                                console.error("Error executing query:", err);
                            } else {
                                if (sqlres3.recordset.length<1) {
 
                                    let getCustomerCode = `SELECT CustomerCode, SYSTEM 
                                    FROM Res.Reservation 
                                    WHERE BuyersName='${userInput.lastname + ", " +userInput.firstname + ' ' + userInput.middlename}';`

                                    new sql.Request().query(getCustomerCode, (err, sqlres4) => {
                                        if (err) {
                                            res.status(500).json(err)
                                            console.error("Error executing query:", err);
                                        } else {

                                            if (sqlres4.recordset.length>0) {
                                                let query3 = `
                                                    INSERT INTO REG.UserMapping 
                                                    (
                                                        isCreated, 
                                                        BuyersName, 
                                                        Birthdate, 
                                                        UserName, 
                                                        EMAIL, 
                                                        MOBILE, 
                                                        OutsystemUserId, 
                                                        CustomerCode,
                                                        System
                                                    )
                                                    VALUES (
                                                        1, 
                                                        '${userInput.firstname + ' ' + userInput.middlename + ' ' + userInput.lastname}', 
                                                        GETDATE(),
                                                        '${userInput.username}', 
                                                        '${userInput.email}', 
                                                        '${userInput.phone}', 
                                                        ${sqlres2.recordset[0].ID}, 
                                                        '${sqlres4.recordset[0].CustomerCode}',
                                                        '${sqlres4.recordset[0].SYSTEM}'
                                                    )
                                                `
                                                
                                                new sql.Request().query(query3, async (err, sqlres5) => {
                                                    if (err) {
                                                        res.status(500).json(err)
                                                        console.error("Error executing query:", err);
                                                    } else {
                                                        const emailResponse = await sendEmail.sendEmailVerification({
                                                            OutsystemUserId: sqlres2.recordset[0].ID,
                                                            email: userInput.email,
                                                            firstname: userInput.firstname,
                                                            lastname: userInput.lastname
                                                        })
                                                        if (emailResponse.status===true) {
                                                            res.status(200).send({
                                                                status: true,
                                                                OutsystemUserId: sqlres2.recordset[0].ID
                                                            })
                                                        } else {
                                                            res.status(500).json(emailResponse.data.errorMessage)
                                                        }
                                                    }
                                                });
                                            } else {
                                    
                                                let query5 = `
                                                    Update [BUYERS_PORTAL].[REG].[UserMapping]
                                                    SET UserName='${userInput.username}', 
                                                        EMAIL='${userInput.email}', 
                                                        MOBILE='${userInput.phone}', 
                                                    WHERE OutsystemUserId=${sqlres2.recordset[0].ID}
                                                `
                                                new sql.Request().query(query5, async (err, sqlres5) => {
                                                    if (err) {
                                                        res.status(500).json(err)
                                                        console.error("Error executing query:", err);
                                                    } else {

                                                        const emailResponse = await sendEmail.sendEmailVerification({
                                                            OutsystemUserId: sqlres2.recordset[0].ID,
                                                            email: userInput.email,
                                                            firstname: userInput.firstname,
                                                            lastname: userInput.lastname
                                                        })
                                                        if (emailResponse.status===true) {
                                                            res.status(200).send({
                                                                status: true,
                                                                OutsystemUserId: sqlres2.recordset[0].ID
                                                            })
                                                        } else {
                                                            res.status(500).json(emailResponse.data.errorMessage)
                                                        }
                                                    }
                                                })
                                            }
                                        }
                                    });

                                } else {

                                    let query3 = `UPDATE REG.UserMapping
                                        SET isCreated = 1, UserName = '${userInput.username}', EMAIL = '${userInput.email}', MOBILE = '${userInput.phone}', OutsystemUserId=${sqlres2.recordset[0].ID}
                                        WHERE BuyersName='${userInput.firstname + ' ' + userInput.middlename + ' ' + userInput.lastname}';`
                                    //Update to UserMapping
                                    new sql.Request().query(query3, async (err, sqlres3) => {
                                        if (err) {
                                            res.status(500).json(err)
                                            console.error("Error executing query:", err);
                                        } else {
                                            const emailResponse = await sendEmail.sendEmailVerification({
                                                OutsystemUserId: sqlres2.recordset[0].ID,
                                                email: userInput.email,
                                                firstname: userInput.firstname,
                                                lastname: userInput.lastname
                                            })
                                            if (emailResponse.status===true) {
                                                res.status(200).send({
                                                    status: true,
                                                    OutsystemUserId: sqlres2.recordset[0].ID
                                                })
                                            } else {
                                                res.status(500).json(emailResponse.data.errorMessage)
                                            }
                                        }
                                    });
                                }
                            }
                        })
                    }
                });
            }
        });
    }catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

router.post("/email-verify", async (req, res) => {
    try {
        let query = `SELECT * 
        FROM REG.Email_Verification
        WHERE Code COLLATE SQL_Latin1_General_CP1_CS_AS LIKE '${req.body.code}%'
        AND OutsystemUserId='${req.body.OutsystemUserId}'
        AND (Expiration > GETDATE());`
        //query verification code
        new sql.Request().query(query, (err, sqlres) => {
            if (err) {
                res.status(500).json(err)
                console.error("Error executing query:", err);
            } else {
                if (sqlres.recordset.length<1) {
                    return res.json(false)
                } else {
                    //delete veirifcation code after verify
                    let query = `DELETE FROM REG.Email_Verification
                    WHERE Code COLLATE SQL_Latin1_General_CP1_CS_AS LIKE '${req.body.code}%'
                    AND OutsystemUserId='${req.body.OutsystemUserId}'
                    AND (Expiration > GETDATE());`
                    new sql.Request().query(query, (err, sqlres2) => {
                        if (err) {
                            res.status(500).json(err)
                            console.error("Error executing query:", err);
                        } 
                    })

                    //update usermapping to isactive
                    let query2 = `UPDATE REG.UserMapping 
                    SET ISACTIVE=1 
                    WHERE OutsystemUserId='${req.body.OutsystemUserId}';`
                    new sql.Request().query(query2, (err, sqlres2) => {
                        if (err) {
                            res.status(500).json(err)
                            console.error("Error executing query:", err);
                        } else {
                            return res.json(true)
                        }
                    })
                }
            }
        });
    } catch (err) {
        console.log(err)
    }
})

router.post("/resend-email-code", async (req, res) => {
    try {
        const userInput = {
            firstname: req.body.firstname.trim(),
            middlename: req.body.middlename.trim(),
            lastname: req.body.lastname.trim(),
            email: req.body.email.trim(),
            phone: req.body.phone.trim(),
            username: req.body.userName.trim(),
        }

        let query2 = `SELECT ID FROM dbo.OSUSR_H9C_USERS2 WHERE USERNAME='${userInput.username}';`
        //Query the ID of the inserted user data
        new sql.Request().query(query2, async (err, sqlres2) => {
            if (err) {
                res.status(500).json(err)
                console.error("Error executing query:", err);
            } else {
                const emailResponse = await sendEmail.sendEmailVerification({
                    OutsystemUserId: sqlres2.recordset[0].ID,
                    email: userInput.email,
                    firstname: userInput.firstname,
                    lastname: userInput.lastname
                })
                if (emailResponse.status===true) {
                    res.status(200).send({
                        status: true,
                        OutsystemUserId: sqlres2.recordset[0].ID
                    })
                } else {
                    res.status(500).json(emailResponse.data.errorMessage)
                }
            }
        });
    }catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

router.post("/forgot-password", async (req, res) => {
    try {
        const userInput = {
            username: req.body.username.trim(),
        }

        let query2 = `SELECT Email FROM dbo.OSUSR_H9C_USERS2 WHERE USERNAME='${userInput.username}';`
        //Query the ID of the inserted user data
        new sql.Request().query(query2, async (err, sqlres) => {
            if (!err) {
                if (sqlres.recordset.length>0) {
                    const emailResponse = await forgotPass.forgotPassEmail({
                        email: sqlres.recordset[0].Email,
                        username: userInput.username,
                    })
                    if (emailResponse.status===true) {
                        res.status(200).send("Password updated.")
                    } else {
                        res.status(500).json(emailResponse.data.errorMessage)
                    }
                } else {
                    res.status(200).send("No account found.")
                }

            } else {
                res.status(500).json(err)
                console.error("Error executing query:", err);
            }
        });
    }catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

router.post("/change-password", async (req, res) => {
    try {
        let hashCurrPass = crypto.pbkdf2Sync(req.body.currPass, 'aes-192-cbc', 1000, 32, `sha512`).toString(`hex`);
        let checkCurrPassQuery = `SELECT *
        FROM dbo.OSUSR_H9C_USERS2
        WHERE PASSWORD='${hashCurrPass}'
        AND UserName='${req.body.userName}'`

        new sql.Request().query(checkCurrPassQuery, (err, sqlres) => {
            if (err) {
                console.error("Error executing query:", err);
            } else {
                if (sqlres.recordset.length>0) {
                    let hashPass = crypto.pbkdf2Sync(req.body.newPass, 'aes-192-cbc', 1000, 32, `sha512`).toString(`hex`);
                    let newPassQuery = `UPDATE dbo.OSUSR_H9C_USERS2
                    SET PASSWORD='${hashPass}'
                    WHERE UserName='${req.body.userName}';`
            
                    new sql.Request().query(newPassQuery, (err, sqlres) => {
                        if (err) {
                            console.error("Error executing query:", err);
                        } else {
                            res.status(200).send(true)
                        }
                    })
                } else {
                    res.status(200).send("Invalid credentials.")
                }
            }
        })

    } catch (err) {
        console.log(err)
        res.status(500).json(err);
    }
})

module.exports = router