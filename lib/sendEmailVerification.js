const axios = require("axios");
const sql = require("mssql");
const moment = require("moment");

async function sendEmailVerification(props) {
    //custom code generator
    function makeid(length) {
        let result = ''
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        const charactersLength = characters.length
        let counter = 0
        while (counter < length) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength))
            counter += 1
        }
        return result
    }
    let code = makeid(6)

    let formattedDate = moment(Date.now() + 259200000).format('MMMM Do YYYY, hh:mm A');

    let deleteQuery = `DELETE FROM REG.Email_Verification WHERE OutsystemUserId='${props.OutsystemUserId}';`
    new sql.Request().query(deleteQuery, (err, sqlres) => {
        if (err) {
            console.error("Error executing query:", err);
        } else {
            let query = 'SELECT DATEADD(day,3,getdate()) AS Expiration'
            new sql.Request().query(query, (err, sqlres) => {
                if (err) {
                    console.error("Error executing query:", err);
                } else {
                    let query2 = `INSERT INTO REG.Email_Verification (Code, Expiration, OutsystemUserId) 
                    VALUES ('${code}', DATEADD(day,3,getdate()), '${props.OutsystemUserId}')`
                    new sql.Request().query(query2, (err, sqlres) => {
                        if (err) {
                            console.error("Error executing query:", err);
                        } 
                    })
                }
            })
        }
    })

    const htmlMessage = `
    <div style="font-family: Montserrat, sans-serif;" width="100%">
        <div style="Margin:0 auto; max-width:750px;">
            <div style="display: none;">Successfully registered a Home+ account, please verify your email to activate the account and start using it.</div>
            <div height='100px' width="100%" style="display:flex; background-color: #ffffff; justify-content:center; align-items: center;">
                <a style="Margin:0 auto; height: 90px; width:50%; object-fit:cover;" href="https://www.paproperties.com.ph/"><img style="Margin:0 auto;" src="http://drive.google.com/uc?export=view&id=1tTnSCCf662ygKCI4rSRK5M-Pi-6JJT4l" alt="Logo" title="PA Properties Logo" width="100%" height="80"/></a>
            </div>    

            <div style="overflow: hidden; height:240px; width:100%">
                <img style="height:240px; width:100%; object-fit:cover; object-position: center;" src="http://drive.google.com/uc?export=view&id=1yN0eK8qSYD4OSa5Ot3AC6mK4rUg7-Bmb" alt="PA PRoperties Housing" title="PA PRoperties Housing"></img>
            </div>
            <p style="font-size: 26px; color:#ffffff; background-color:#00595C; padding-top: 15px;padding-bottom: 15px; text-align:center"><b>Home+ Email Verification</b></p>
            <br/>
            <div style="font-size: 16px;">
                Hi ${props.firstname+" "+props.lastname},
                <br/>
                <p>
                    This email is sent to you in order to verify your email address associated to your Home+ account. This code will expire on <b>${formattedDate}</b>.
                </p>
                <br/>
                <div style="background-color:#e5e7eb; width:100%; padding-top: 30px;padding-bottom: 30px;">
                    <p style="font-size: 48px; Margin:0 auto; width:200px; text-align:center"><b>${code}</b></p>
                </div>
                <br/>
                <br/>
                <br/>
                <div style="font-size: 14px; width:100%; text-align:center;"><i>This is a system-generated email, please do not reply to this message.</i></div>
            </div>
            <br/>
            <div style="display: flex; align-items: center; gap: 10px; background-color:#00595C; color:#ffffff; padding-left: 25px;padding-right: 25px; padding-top: 15px;padding-bottom: 15px;">
                <a style="object-fit:cover;" href="https://www.paproperties.com.ph/"><img src="http://drive.google.com/uc?export=view&id=1TMWuzUXE3dS-XQL-Dl9pVd33uXC9ue3q" alt="PA Properties Logo" title="PA Properties Logo" width="75" height="75"/></a>
                <p style="padding-left: 10px; font-size: 20px; backgroud-color: red; height: 100%; text-align: center"><b>"BEHIND EVERY HOME IS A STORY"</b></p>
            </div>
            <div style="height: 20px; width: 100%; display: flex; justify-content: space-between; padding-left: 25px; padding-right: 25px;">
                <div style="width: 70%">
                    <a href="https://www.paproperties.com.ph"><u>https://www.paproperties.com.ph</u></a>
                </div>
                <div style="width: 30%; display: flex; justify-content: space-between; align-items: center; padding-right: 25px;">
                    <a style="Margin:0 auto; width:24px; object-fit:cover;" href="https://www.facebook.com/papropertiesph/"><img style="Margin:0 auto;" src="http://drive.google.com/uc?export=view&id=1iHioFICG0B4pGciY23XjSNfGXG5ZIOhM" alt="Icon" title="Icon" width="12" height="12"/></a>
                    <a style="Margin:0 auto; width:24px; object-fit:cover;" href="https://twitter.com/papropertiesph"><img style="Margin:0 auto;" src="http://drive.google.com/uc?export=view&id=1uvzFebzPNqCvTSvBjIju9LnpAMFb0ZBh" alt="Icon" title="Icon" width="12" height="12"/></a>
                    <a style="Margin:0 auto; width:24px; object-fit:cover;" href="https://instagram.com/papropertiesph"><img style="Margin:0 auto;" src="http://drive.google.com/uc?export=view&id=16gRR7YQ4lCi0J4Ead-FPCqYQGt921grU" alt="Icon" title="Icon" width="12" height="12"/></a>
                    <a style="Margin:0 auto; width:24px; object-fit:cover;" href="https://www.tiktok.com/@papropertiesph"><img style="Margin:0 auto;" src="http://drive.google.com/uc?export=view&id=1vzYsuC28tk7ZKpI-pr_5IHHUSU5seDpM" alt="Icon" title="Icon" width="12" height="12"/></a>
                    <a style="Margin:0 auto; width:24px; object-fit:cover;" href="https://www.linkedin.com/company/paproperties"><img style="Margin:0 auto;" src="http://drive.google.com/uc?export=view&id=1DAXtsdVXOSMBql_KPTihv0PXS9bXgsw_" alt="Icon" title="Icon" width="12" height="12"/></a>
                </div>
            </div>
            <div style="background-color:#00595C; color:#ffffff; padding-left: 25px;padding-right: 25px; padding-top: 15px;padding-bottom: 15px;">
                <p style="Margin:0 auto; width:100%; text-align: center;">
                    <b>Office Address:</b> Units 1-4 Ambayec Commercial Centre, #1250 Nat'l. Hi-way, Brgy. Nueva San Pedro, Laguna 4023
                </p>
            </div>
            
        </div>
        <div style="display: none;">[${Date.now()}] End of message.</div>
    </div>
`

    const data = {
        Recipient: props.email,
        Subject: "Home+ Account Verification",
        Message: htmlMessage,
        Profile: "P.A. Properties"
    }
    
    const sendeEmail = await axios.post("https://prod.paproperties.com.ph/notification/send/email", 
        JSON.stringify(data), 
        { headers: { "Content-Type": "application/json" } }
    )

    return sendeEmail.data
}

module.exports = { sendEmailVerification } 
