const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASS,
	},
})

const sendEmail = async (to, subject, text) => {
	try {
		await transporter.sendMail({
			from: `"Marketplace" <${process.env.EMAIL_USER}>`,
			to,
			subject,
			text,
		})
		console.log(`Email send to ${to}`)
	} catch (error) {
		console.error('Error sending email:', {
			message: error.message,
			stack: error.stack,
			to,
		})
	}
}

module.exports = { sendEmail }
