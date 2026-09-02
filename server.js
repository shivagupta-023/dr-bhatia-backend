require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const Appointment = require('./models/Appointment');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("DB Error: ", err));

// Email Transporter Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// API 1: Fetch Booked Slots for a specific date
app.get('/api/appointments/booked', async (req, res) => {
  try {
    const { date } = req.query;
    const appointments = await Appointment.find({ date });
    const bookedSlots = appointments.map(app => app.time);
    res.json({ bookedSlots });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// API 2: Book Appointment & Send Emails
app.post('/api/appointments/book', async (req, res) => {
  try {
    const { name, wpNumber, email, date, time, subject, description } = req.body;

    // 1. Save to Database
    const newAppointment = new Appointment({ name, wpNumber, email, date, time, subject, description });
    await newAppointment.save(); // Agar slot same time pe booked hoga, toh yahan error throw hoga (Mongo E11000)

    // 2. Email to Doctor
    // 2. Email to Doctor (Mobile Responsive Layout)
    const doctorMailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.DOCTOR_EMAIL,
      subject: `New Booking: ${name} at ${time}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @media only screen and (max-width: 600px) {
              .container { padding: 15px 10px !important; }
              .box { border-radius: 8px !important; }
              .header { padding: 15px !important; }
              .content { padding: 20px 15px !important; }
              th { width: 90px !important; font-size: 14px !important; }
              td { font-size: 14px !important; }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 30px 15px;">
            <div class="box" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
              <div class="header" style="background-color: #0f172a; padding: 20px 25px;">
                <h2 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 500;">New Consultation Booked</h2>
                <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 13px;">Date: ${date}</p>
              </div>
              <div class="content" style="padding: 25px;">
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                  <tr>
                    <th style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600; width: 110px;">Patient:</th>
                    <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 500;">${name}</td>
                  </tr>
                  <tr>
                    <th style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600;">Time:</th>
                    <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #D81B60; font-weight: bold;">${time}</td>
                  </tr>
                  <tr>
                    <th style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600;">Subject:</th>
                    <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a;">${subject}</td>
                  </tr>
                  <tr>
                    <th style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600;">WhatsApp:</th>
                    <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a;">
                      <a href="https://wa.me/91${wpNumber.replace(/\D/g,'')}" style="color: #25D366; text-decoration: none; font-weight: 500;">${wpNumber}</a>
                    </td>
                  </tr>
                  <tr>
                    <th style="padding: 12px 0; color: #64748b; font-weight: 600;">Email:</th>
                    <td style="padding: 12px 0; color: #0f172a; word-break: break-all;">${email}</td>
                  </tr>
                </table>
                <div style="margin-top: 25px; background-color: #f8fafc; padding: 15px; border-radius: 8px; border-left: 3px solid #4A90E2;">
                  <p style="color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; margin: 0 0 5px 0;">Brief Description</p>
                  <p style="margin: 0; color: #334155; font-size: 14px; line-height: 1.5;">${description || 'No additional details provided by the patient.'}</p>
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // 3. Invoice/Confirmation Email to Patient (Mobile Responsive + Address Details)
    const patientMailOptions = {
      from: `"Dr. Bhatia Clinic" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Booking Confirmed - Dr. Gopal Bhatia's Clinic`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @media only screen and (max-width: 600px) {
              .container { padding: 15px 10px !important; }
              .box { border-radius: 12px !important; }
              .header { padding: 25px 15px !important; }
              .header h1 { font-size: 20px !important; }
              .content { padding: 25px 15px !important; }
              .details-card { padding: 15px !important; }
              .label { width: 60px !important; display: inline-block; }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 30px 15px;">
            <div class="box" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
              
              <!-- Header -->
              <div class="header" style="background-color: #4A90E2; padding: 35px 25px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 400; letter-spacing: -0.5px;">Appointment Confirmed</h1>
                <p style="color: #e0f2fe; margin: 8px 0 0 0; font-size: 14px;">Dr. Gopal Bhatia's Psychiatry Clinic</p>
              </div>
              
              <!-- Body -->
              <div class="content" style="padding: 35px 25px;">
                <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">Hello ${name},</h3>
                <p style="color: #64748b; line-height: 1.6; margin: 0 0 25px 0; font-size: 15px;">
                  Thank you for taking the first step. Your consultation has been successfully scheduled. Here are your appointment details:
                </p>
                
                <!-- Details Card -->
                <div class="details-card" style="background-color: #f1f5f9; border-left: 4px solid #D81B60; padding: 20px 25px; border-radius: 0 12px 12px 0; margin-bottom: 30px;">
                  <p style="margin: 0 0 12px 0; font-size: 15px;"><strong class="label" style="color: #64748b; display: inline-block; width: 70px;">Date:</strong> <span style="color: #0f172a; font-weight: 600;">${date}</span></p>
                  <p style="margin: 0 0 12px 0; font-size: 15px;"><strong class="label" style="color: #64748b; display: inline-block; width: 70px;">Time:</strong> <span style="color: #D81B60; font-weight: 600;">${time}</span></p>
                  <p style="margin: 0; font-size: 15px;"><strong class="label" style="color: #64748b; display: inline-block; width: 70px;">Subject:</strong> <span style="color: #0f172a;">${subject}</span></p>
                </div>

                <!-- Location & Contact Details -->
                <div style="border-top: 1px solid #e2e8f0; padding-top: 25px; margin-bottom: 10px;">
                  <h4 style="margin: 0 0 10px 0; color: #0f172a; font-size: 15px;">📍 Clinic Address</h4>
                  <p style="color: #64748b; line-height: 1.6; font-size: 14px; margin: 0 0 15px 0;">
                    F4,5, Vitthal Nagar Char Rasta, Civil Hospital Rd,<br>
                    Arihant Nagar, Shahibag,<br>
                    Ahmedabad, Gujarat 380016
                  </p>
                  
                  <h4 style="margin: 0 0 8px 0; color: #0f172a; font-size: 15px;">💬 Need Help?</h4>
                  <p style="margin: 0; font-size: 14px; color: #64748b;">
                    WhatsApp/Call us at: <a href="https://wa.me/918511514158" style="color: #25D366; font-weight: 600; text-decoration: none;">+91 8511514158</a>
                  </p>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">Please aim to arrive 10 minutes early. This is an automated confirmation.</p>
              </div>

            </div>
          </div>
        </body>
        </html>
      `
    };

    /// Vercel par 'await' lagana bohot zaroori hai taaki process beech me kill na ho
    await Promise.all([
      transporter.sendMail(doctorMailOptions),
      transporter.sendMail(patientMailOptions)
    ]);

    res.status(200).json({ success: true, message: "Appointment booked successfully!" });

  } catch (error) {
    // Check if it's a Duplicate Key Error (Double Booking attempt)
    if (error.code === 11000) {
      return res.status(409).json({ error: "This slot was just booked by someone else. Please choose another." });
    }
    res.status(500).json({ error: "Failed to book appointment" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));