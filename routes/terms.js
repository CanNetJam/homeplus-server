const express = require ("express");
const router = express.Router();
const sql = require("mssql");

router.get("/get-updated", async (req, res) => {
    let query = `SELECT TERMS
    FROM Hi_Plus.Settings
    WHERE ID=2`

    new sql.Request().query(query, (err, sqlres) => {
        if (err) {
            res.status(500).json(err)
            console.error("Error executing query:", err);
        } else {
            if (sqlres.recordset.length<1) {
                return res.status(200).json(false)
            } else {
                return res.status(200).json({
                    current: sqlres.recordset[0]
                })
            }
        }
    });
})

module.exports = router