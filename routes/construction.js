const express = require ("express");
const router = express.Router();
const sql = require("mssql");

router.get("/progress/:account", async (req, res) => {
    let query = `SELECT *
    FROM Con.Construction
    WHERE UnitCode='${req.params.account}'`

    new sql.Request().query(query, (err, sqlres) => {
        if (err) {
            res.status(500).json(err)
            console.error("Error executing query:", err);
        } else {
            if (sqlres.recordset.length<1) {
                return res.status(200).json(false)
            } else {
                return res.status(200).json({
                    current: sqlres.recordset[0].TotalPercentage
                })
            }
        }
    });
})

module.exports = router