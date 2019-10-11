// const dotenv = require("dotenv");
// dotenv.config()
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.resetPasswordEmail = (to, link) => {
	const msg = {
	  to,
	  from: 'noreply@escapp.dit.upm.es',
	  subject: 'escapp: Password reset',
	  text: 'Reset password: '+ link,
	  html: 'Reset password: '+ link,
	};
	sgMail.send(msg);
}

