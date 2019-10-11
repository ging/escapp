// const dotenv = require("dotenv");
// dotenv.config()
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.resetPasswordEmail = (to, subject, text, html) => {
	const msg = {
	  to,
	  from: 'noreply@'+ process.env.APP_NAME,
	  subject: subject || "escapp",
	  text,
	  html,
	};
	return sgMail.send(msg);
}

