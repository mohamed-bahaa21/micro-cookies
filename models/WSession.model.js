const mongoose = require('mongoose');

// stationID, sessionStartTime, SessionEndTime, cookieCount
const WSessionSchema = new mongoose.Schema({
  stationID: {
    type: String,
    required: true,
    unique: true
  },
  cookiesCount: {
    type: Number,
    required: true,
    default: 0
  },
  sessionStartTime: {
    type: Date,
    required: false
  },
  sessionEndTime: {
    type: Date,
    required: false
  },
}, {
  timestamps: true
});

const WSession = mongoose.model('WSession', WSessionSchema);

module.exports = WSession;
