const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.resetPasswordEmail = (to, subject = "escapp", text, html) => {
    const from = `noreply@${process.env.APP_NAME}`;
    const msg = {
        to,
        from,
        subject,
        text,
        html
    };

    return sgMail.send(msg);
};

