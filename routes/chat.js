const express = require ("express");
const router = express.Router();
const sql = require("mssql");
const { formidable } = require("formidable");
const auth = require("../middleware/auth");

router.post("/create-conversation", async (req, res) => {
    let createConversation = `INSERT INTO Chat.Conversations (System, Status, CreatedAt, UpdatedAt, Viewed, Assigned, UnitCode)
    OUTPUT Inserted.ID
    VALUES ('${req.body.system}', 'Open', GETDATE(), GETDATE(), 0, 0, '${req.body.customerCode}')`

    new sql.Request().query(createConversation, (err, sqlres) => {
        if (err) {
            res.status(500).json(err)
            console.error("Error executing query:", err);
        } else {

            let addMembers = `INSERT INTO Chat.Members (ConversationID, Member, Type, CreatedAt, UpdatedAt)
            VALUES ('${sqlres.recordset[0].ID}', '${req.body.customerCode}', '${req.body.type}', GETDATE(), GETDATE())`
        
            new sql.Request().query(addMembers, (err, sqlres2) => {
                if (err) {
                    res.status(500).json(err)
                    console.error("Error executing query:", err);
                } else {
                
                    let initialMessage = `INSERT INTO Chat.Messages (ConversationID, Sender, Message, CreatedAt, UpdatedAt, Type)
                    OUTPUT Inserted.ID
                    VALUES ('${sqlres.recordset[0].ID}', '${req.body.customerCode}', '${req.body.detail.replace(/['"]+/g, '')}', GETDATE(), GETDATE(), 'text')`
                
                    new sql.Request().query(initialMessage, (err, sqlres3) => {
                        if (err) {
                            res.status(500).json(err)
                            console.error("Error executing query:", err);
                        } else {

                            let updateConversation = `UPDATE Chat.Conversations 
                            SET LastMessage='${sqlres3.recordset[0].ID}'
                            WHERE ID='${sqlres.recordset[0].ID}'`
                        
                            new sql.Request().query(updateConversation, (err, sqlres4) => {
                                if (err) {
                                    res.status(500).json(err)
                                    console.error("Error executing query:", err);
                                } else {
                                    res.status(200).json(true)
                                }
                            })
                        }
                    })
                }
            })
        }
    });
})

router.get("/conversations", async (req, res) => {
    let condition = req.query?.properties?.join()

    let getConversations = `
        SELECT Convo.ID, Convo.SYSTEM, Convo.Status, Convo.UpdatedAt, Convo.Viewed, Mes.Message, Mes.Sender, Mes.Type, Mes.CreatedAt
        FROM [BUYERS_PORTAL].[CHAT].[Conversations] AS Convo
        INNER JOIN [BUYERS_PORTAL].[CHAT].[Members] AS Mem
        ON Convo.ID = Mem.ConversationID
        INNER JOIN [BUYERS_PORTAL].[CHAT].[Messages] AS Mes
        ON Convo.LastMessage = Mes.ID
        WHERE Mem.Member IN (${condition})
        AND Mem.Type='HomeOwner'
        ORDER BY Convo.UpdatedAt DESC
        OFFSET ${req.query.page} ROWS FETCH NEXT 10 ROWS ONLY
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
})

router.post("/close-conversation", async (req, res) => {
    let closeConvo = `
        UPDATE Chat.Conversations
        SET Status='Close', UpdatedAt=GETDATE()
        WHERE ID=${req.body.id}
    `
    new sql.Request().query(closeConvo, (err, sqlres) => {
        if (err) {
            res.status(500).json(err)
            console.error("Error executing query:", err);
        } else {
            res.status(200).json(true)
        }
    });
});

router.get("/get-messages", async (req, res) => {
    let getMesssages = `
        SELECT Mes.Sender, Mes.Message, Mes.CreatedAt, Mes.Type, Convo.System
        FROM [BUYERS_PORTAL].[CHAT].[Messages] AS Mes 
        INNER JOIN [BUYERS_PORTAL].[CHAT].[Conversations] AS Convo
        ON Convo.ID = Mes.ConversationID
        WHERE Convo.ID=${req.query.id}
        ORDER BY Mes.CreatedAt DESC
        OFFSET ${req.query.page} ROWS FETCH NEXT 20 ROWS ONLY
    `
    new sql.Request().query(getMesssages, (err, sqlres) => {
        if (err) {
            res.status(500).json(err)
            console.error("Error executing query:", err);
        } else {
            if (sqlres.recordset.length<1) {
                return res.status(200).json(false)
            } else {
                return res.status(200).json(sqlres.recordset.reverse())
            }
        }
    });
})

router.post("/send-message", async (req, res) => {
    const form = formidable({ 
        uploadDir: __dirname + '/../public/uploads', 
        keepExtensions: true
    });
    const [fields, files] = await form.parse(req);
    //console.log(fields)
    const uploadedFile = files.uploadedFile;

    let sendMessage = `
    INSERT INTO Chat.Messages (ConversationID, Sender, Message, CreatedAt, UpdatedAt, Type)
    OUTPUT Inserted.ID
    VALUES ('${fields.id[0]}', '${fields.sender[0]}', '${fields.type[0]==='text' ? fields.message[0].replace(/['"]+/g, '') : uploadedFile[0].newFilename}', GETDATE(), GETDATE(), '${fields.type[0]}')`

    new sql.Request().query(sendMessage, (err, sqlres) => {
        if (err) {
            res.status(500).json(err)
            console.error("Error executing query:", err);
        } else {

            let updateConversation = `
                UPDATE Chat.Conversations
                SET UpdatedAt=GETDATE(), LastMessage=${sqlres.recordset[0].ID}
                WHERE ID=${fields.id[0]}
            `
            new sql.Request().query(updateConversation, (err, sqlres2) => {
                if (err) {
                    res.status(500).json(err)
                    console.error("Error executing query:", err);
                } else {
                    if (fields.type[0]==='text') {
                        res.status(200).json(true)
                    } else {
                        res.status(200).json(uploadedFile[0].newFilename)
                    }
                }
            })
        }
    });
});

router.get("/members/:id", async (req, res) => {
    let getMembers = `
        SELECT Mem.Member, Mem.Type, Convo.System
        FROM [BUYERS_PORTAL].[CHAT].[Members] AS Mem 
        INNER JOIN [BUYERS_PORTAL].[CHAT].[Conversations] AS Convo
        ON Convo.ID = Mem.ConversationID
        WHERE Convo.ID=${req.params.id}
    `
    new sql.Request().query(getMembers, (err, sqlres) => {
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

router.get("/conversation/:id", async (req, res) => {
    let getConvo = `
        SELECT *
        FROM [BUYERS_PORTAL].[CHAT].[Conversations]
        WHERE ID=${req.params.id}
    `
    new sql.Request().query(getConvo, (err, sqlres) => {
        if (err) {
            res.status(500).json(err)
            console.error("Error executing query:", err);
        } else {
            if (sqlres.recordset.length<1) {
                return res.status(200).json(false)
            } else {
                return res.status(200).json(sqlres.recordset[0])
            }
        }
    });
})

module.exports = router