require('dotenv').config();
const nodemailer = require('nodemailer');

async function enviarCorreoDePrueba() {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: 'johannargueta38@gmail.com',  // <-- cámbialo por tu correo real
        subject: '📩 Prueba de envío desde el sistema del hotel',
        text: '¡Hola! Este es un correo de prueba enviado desde tu backend con nodemailer y Gmail.'
    };

    try {
        const result = await transporter.sendMail(mailOptions);
        console.log('✅ Correo enviado:', result.response);
    } catch (error) {
        console.error('❌ Error al enviar el correo:', error.message);
    }
}

enviarCorreoDePrueba();
