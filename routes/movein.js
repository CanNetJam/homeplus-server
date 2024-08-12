const express = require ("express");
const router = express.Router();
const sql = require("mssql");

router.get("/progress/:account", async (req, res) => {
    let query = `SELECT *
    FROM Mov.Movein
    WHERE AccountNo='${req.params.account}'`

    new sql.Request().query(query, (err, sqlres) => {
        if (err) {
            res.status(500).json(err)
            console.error("Error executing query:", err);
        } else {
            if (sqlres.recordset.length<1) {
                return res.status(200).json(false)
            } else {
                let cleanList = []
                let prev = ""
                for (let i=0; i<sqlres.recordset.length; i++){
                    if(prev!==sqlres.recordset[i].OccupancyStatus) {
                        cleanList.push(sqlres.recordset[i])
                        prev=sqlres.recordset[i].OccupancyStatus
                    }
                }

                return res.status(200).json(data)
            }
        }
    });
})

module.exports = router