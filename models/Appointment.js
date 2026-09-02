const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  wpNumber: { type: String, required: true },
  email: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  subject: { type: String, required: true },
  description: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Ye rule make sure karega ki ek Date aur Time par do bookings save na ho sakein
appointmentSchema.index({ date: 1, time: 1 }, { unique: true });

module.exports = mongoose.model('Appointment', appointmentSchema);