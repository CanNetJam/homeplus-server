const express = require ("express");
const router = express.Router();
const sql = require("mssql");
const moment = require("moment");

router.get("/property-previos-payment/:account/:system", async (req, res) => {
    let query = `EXEC [HI_Plus].[Get_Payment_History] '${req.params.account}', '${req.params.system}', ${process.env.NODE_ENV? 0 : 1}`;
    
    new sql.Request().query(query, (err, sqlres) => {
        if (err) {
            res.status(500).json(err)
            console.error("Error executing query:", err);
        } else {
            if (sqlres.recordset.length<1) {
                return res.status(200).json(false)
            } else {         
                let latest
                function getCurrentPayment (){
                    for (let i=0; i<sqlres.recordset.length; i++) {
                        if (sqlres.recordset[i].cleared===1) {
                            return latest=i-1
                        }
                    }
                }
                getCurrentPayment()
                let balance = 0
                function getBalance (){
                    for (let i=0; i<sqlres.recordset.length; i++) {
                        balance+=sqlres.recordset[i].Balance
                    }
                }
                getBalance()
                
                return res.status(200).json({
                    balance: balance,
                    current: latest!==undefined ? latest : sqlres.recordset.length-1,
                    payments: sqlres.recordset
                })
            }
        }
    });
})

router.get("/property-previous-reciept/:account/:system/:recieptDate", async (req, res) => {
    //let query = `EXEC [HI_Plus].[Get_Payment_Reciept_History] '${req.params.account}', '${req.params.system}', ${process.env.NODE_ENV? 0 : 1}`;

    let query = `EXEC [SOA_PRINTING].[CR].[NSP_Get_Buyers_Collection_Receipt] '${req.params.system}', '${req.params.account}', '${req.params.recieptDate}', ${process.env.NODE_ENV? 0 : 1}`
    
    new sql.Request().query(query, (err, sqlres) => {
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

router.get("/statement-of-account/:account/:system/:cin", async (req, res) => {

    let query = `EXEC [SOA_PRINTING].[SOA].[NSP_Get_Buyers_Info] '${req.params.system}', '${req.params.cin}', 0, ${process.env.NODE_ENV? 0 : 1}`

    new sql.Request().query(query, (err, sqlres) => {
        if (err) {
            res.status(500).json(err)
            console.error("Error executing queryhaha:", err);
        } else {
            if (sqlres.recordset.length<1) {
                return res.status(200).json(false)
            } else {
                
                let query2 = `EXEC [SOA_PRINTING].[SOA].[NSP_Get_Buyers_Baseline] '${req.params.system}', '${sqlres.recordset[0].CTSCRN_NO}', '${moment(sqlres.recordset[0].APPLICABLE_MONTH).format('YYYY-M-D')}', ${process.env.NODE_ENV? 0 : 1}`
    
                new sql.Request().query(query2, (err, sqlres2) => {
                    if (err) {
                        res.status(500).json(err)
                        console.error("Error executing query:", err);
                    } else {
                        let merged = {...sqlres.recordset[0], ...sqlres2.recordset[0]}
                        return res.status(200).json(merged)
                    }
                })
            }
        }
    });
})


module.exports = router