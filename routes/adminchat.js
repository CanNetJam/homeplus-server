const express = require ("express");
const router = express.Router();
const sql = require("mssql");
const auth = require("../middleware/auth");

router.get("/conversations", auth, async (req, res) => {
    try {
        let condition = req.query?.system?.join()

        let getConversations = `
            SELECT DISTINCT Convo.ID, Convo.SYSTEM, Convo.Status, Convo.UpdatedAt, Convo.Viewed, Convo.Assigned, Convo.UnitCode, Mes.Message, Mes.Sender, Mes.Type, Res.BuyersName, Mes.CreatedAt
            FROM [BUYERS_PORTAL].[CHAT].[Conversations] AS Convo
            INNER JOIN [BUYERS_PORTAL].[CHAT].[Members] AS Mem
            ON Convo.ID = Mem.ConversationID
            INNER JOIN [BUYERS_PORTAL].[CHAT].[Messages] AS Mes
            ON Convo.LastMessage = Mes.ID
            FULL JOIN [BUYERS_PORTAL].[RES].[Reservation] AS Res
            ON Convo.UnitCode = Res.UnitCode 
            WHERE (Convo.Assigned=0 AND Convo.System IN (${condition}))
            OR Mem.Member='${req.query?.id}'
            ORDER BY Convo.Status DESC, Convo.UpdatedAt DESC
        `
        new sql.Request().query(getConversations, (err, sqlres) => {
            if (err) {
                res.status(500).json(err)
                console.error("Error executing query:", err);
            } else {
                if (sqlres.recordset.length<1) {
                    return res.status(200).json(false)
                } else {
                    return res.status(200).json(sqlres.recordset)
                }
            }
        });
    } catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

router.get("/get-messages", async (req, res) => {
    let getMesssages = `
        SELECT Mes.Sender, Mes.Message, Mes.CreatedAt
        FROM [BUYERS_PORTAL].[CHAT].[Messages] AS Mes 
        INNER JOIN [BUYERS_PORTAL].[CHAT].[Conversations] AS Convo
        ON Convo.ID = Mes.ConversationID
        WHERE Convo.ID=${req.query.id}
        ORDER BY Mes.CreatedAt ASC
    `

    new sql.Request().query(getMesssages, (err, sqlres) => {
        if (err) {
            res.status(500).json(err)
            console.error("Error executing query:", err);
        } else {
            if (sqlres.recordset.length<1) {
                return res.status(200).json(false)
            } else {
                return res.status(200).json(sqlres.recordset)
            }
        }
    });
})

router.post("/assign-conversation", async (req, res) => {
    let updateConversation = `
        UPDATE Chat.Conversations 
        SET Assigned=1, UpdatedAt=GETDATE()
        WHERE ID='${req.body.conversationId}'
    `
    new sql.Request().query(updateConversation, (err, sqlres) => {
        if (err) {
            res.status(500).json(err)
            console.error("Error executing query:", err);
        } else {
            let addMember = `
                INSERT INTO Chat.Members (ConversationID, Member, Type, CreatedAt, UpdatedAt)
                VALUES ('${req.body.conversationId}', '${req.body.userId}', 'Admin', GETDATE(), GETDATE())
            `
            new sql.Request().query(addMember, (err, sqlres2) => {
                if (err) {
                    res.status(500).json(err)
                    console.error("Error executing query:", err);
                } else {
                    res.status(200).json(true)
                }
            })
        }
    });
})

router.get("/department-members/:system/:userid", async (req, res) => {
    let getMembers = `
        SELECT *
        FROM [BUYERS_PORTAL].[dbo].[Admin_Account_Mapping]
        WHERE SYSTEM='${req.params.system}'
        AND General_Info_Id!='${req.params.userid}'
    `
    new sql.Request().query(getMembers, (err, sqlres) => {
        if (err) {
            res.status(500).json(err)
            console.error("Error executing query:", err);
        } else {
            if (sqlres.recordset.length<1) {
                return res.status(200).json(false)
            } else {

                async function checkName() {
                    const queryResults = await Promise.all(
                        sqlres.recordset.map(async (record) => {
                            let getDetails = `SELECT * FROM HI_Plus.FN_Get_Employee_Info(${record.GENERAL_INFO_ID})`;
                            
                            return new Promise((resolve, reject) => 
                                new sql.Request().query(getDetails, async (err, sqlres2) => {
                                    if (err) {
                                        console.error("Error executing query:", err);
                                        return reject(err)
                                    }
                                    else {
                                        return resolve(sqlres2.recordset[0]) 
                                    }
                                })
                            )
                        })
                    )
                    return res.status(200).send(queryResults)
                }
                checkName()
            }
        }
    });
})

router.post("/reassign-conversation", async (req, res) => {
    let updateMember = `
        UPDATE [BUYERS_PORTAL].[CHAT].[Members]
        SET Member='${req.body.userId}', UpdatedAt=GETDATE()
        WHERE ConversationId='${req.body.conversationId}'
        AND Type='Admin'
    `
    new sql.Request().query(updateMember, (err, sqlres) => {
        if (err) {
            res.status(500).json(err)
            console.error("Error executing query:", err);
        } else {
            let updateConversation = `
                UPDATE Chat.Conversations 
                SET UpdatedAt=GETDATE()
                WHERE ID='${req.body.conversationId}'
            `
            new sql.Request().query(updateConversation, (err, sqlres2) => {
                if (err) {
                    res.status(500).json(err)
                    console.error("Error executing query:", err);
                } else {
                    res.status(200).json(true)
                }
            })
        }
    });
})
module.exports = router