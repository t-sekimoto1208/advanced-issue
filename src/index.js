require('dotenv').config();
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static('public'));

const inquiriesRouter = require('./routes/inquiries');
const assigneesRouter = require('./routes/assignees');

app.use('/api/inquiries', inquiriesRouter);
app.use('/api/assignees', assigneesRouter);

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`サーバー起動: http://localhost:${PORT}`);
  });
}

module.exports = app;
