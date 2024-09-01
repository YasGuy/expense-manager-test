require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const client = require('prom-client');

// Create an Express application
const app = express();
app.use(bodyParser.json());
app.use(cors({
  origin: '*',
  methods: 'GET,POST',
  allowedHeaders: 'Content-Type'
}));

// Prometheus metrics setup
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [50, 100, 200, 300, 400, 500, 1000]
});

const appUpMetric = new client.Gauge({
  name: 'app_up',
  help: 'Indicates if the app is up (1) or down (0)'
});

// Set the initial state of the app to up
appUpMetric.set(1);

// MySQL connection pooling configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Function to test database connection
function testDbConnection(callback) {
  pool.query('SELECT 1', (err) => {
    if (err) {
      console.error('Database connection test failed:', err);
      callback(err);
    } else {
      callback(null);
    }
  });
}

// Middleware to track metrics for all routes
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    httpRequestDurationMicroseconds.labels(req.method, req.route?.path || req.path, res.statusCode).observe(duration);
  });
  next();
});

// Database connection check middleware
const checkDbConnection = (req, res, next) => {
  testDbConnection((err) => {
    if (err) {
      return res.status(503).json({ error: 'Database connection not established' });
    }
    next();
  });
};

// API Endpoints
app.get('/expenses', checkDbConnection, (req, res) => {
  pool.query('SELECT * FROM expenses', (err, results) => {
    if (err) {
      console.error('Error fetching expenses:', err);
      return res.status(500).json({ error: 'Failed to fetch expenses' });
    }
    res.json(results);
  });
});

app.post('/expenses', checkDbConnection, (req, res) => {
  const { description, amount, date, category } = req.body;
  
  if (!description || amount === undefined || !date || !category) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const query = 'INSERT INTO expenses (description, amount, date, category) VALUES (?, ?, ?, ?)';
  pool.query(query, [description, amount, date, category], (err, results) => {
    if (err) {
      console.error('Error adding expense:', err);
      return res.status(500).json({ error: 'Failed to add expense' });
    }
    res.status(201).json({ id: results.insertId, description, amount, date, category });
  });
});

app.get('/salary', checkDbConnection, (req, res) => {
  pool.query('SELECT amount FROM salary WHERE id = 1', (err, results) => {
    if (err) {
      console.error('Error fetching salary:', err);
      return res.status(500).json({ error: 'Failed to fetch salary' });
    }
    res.json(results[0] ? results[0].amount : 0);
  });
});

app.post('/salary', checkDbConnection, (req, res) => {
  const { amount } = req.body;
  
  if (amount === null || amount === undefined || isNaN(amount)) {
    return res.status(400).json({ error: 'Invalid amount provided' });
  }

  const query = 'REPLACE INTO salary (id, amount) VALUES (1, ?)';
  pool.query(query, [amount], (err) => {
    if (err) {
      console.error('Error updating salary:', err);
      return res.status(500).json({ error: 'Failed to update salary' });
    }
    res.status(201).json({ amount });
  });
});

// Route to simulate a failure
app.get('/fail', (req, res) => {
  appUpMetric.set(0);  // Set app_up to 0 to simulate a failure
  res.status(200).json({ status: 'app_down', message: 'The app is now marked as down' });
});

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Database health check endpoint
app.get('/db-health', (req, res) => {
  testDbConnection((err) => {
    if (err) {
      res.status(500).json({ status: 'db_down', error: 'Database is down' });
    } else {
      res.status(200).json({ status: 'db_up' });
    }
  });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// Start the app
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
