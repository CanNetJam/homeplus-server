const express = require ("express");
const router = express.Router();
const sql = require("mssql");

router.get("/:account/:system", async (req, res) => {
    let query = `SELECT *
    FROM doc.Documents
    WHERE AccountNo='${req.params.account}'
    AND SYSTEM='${req.params.system}'`

    new sql.Request().query(query, (err, sqlres) => {
        if (err) {
            res.status(500).json(err)
            console.error("Error executing query:", err);
        } else {
            if (sqlres.recordset.length<1) {
                return res.status(200).json(false)
            } else {

                let query2 = `SELECT *, DATEADD(month, 1, ReservationDate)
                AS Deadline
                FROM RES.Reservation
                WHERE AccountNo='${req.params.account}'
                AND SYSTEM='${req.params.system}'`

                new sql.Request().query(query2, (err, sqlres2) => {
                    if (err) {
                        res.status(500).json(err)
                        console.error("Error executing query:", err);
                    } else {
                        let completed=0
                        for (let i=0; i<sqlres.recordset.length; i++) {
                            if (sqlres.recordset[i].Submitted==="Submitted") {
                                completed++
                            }
                        }

                        return res.status(200).json({
                            reservation: sqlres2.recordset[0].ReservationDate,
                            deadline: sqlres2.recordset[0].Deadline,
                            docs: sqlres.recordset,
                            completed: completed
                        })
                    }
                })
            }
        }
    });
})

module.exports = router