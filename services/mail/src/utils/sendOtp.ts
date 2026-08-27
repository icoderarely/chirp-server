import { logger } from "@server/shared";
import nodemailer from "nodemailer";

export const sendOtp = async (data: {
  to: string;
  subject: string;
  body: string;
}) => {
  try {
    const { to, subject, body } = data;
    if (!to || !subject || !body) {
      throw new Error("Invalid data");
    }
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text: body,
    });
    logger.info(`Email sent: ${info.messageId} to ${to}`);
  } catch (error) {
    logger.error(`Failed to send email: ${error}`);
  }
};
