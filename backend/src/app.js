const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger');
const usersRoutes = require('./routes/users_routes');


const app = express();

// Middlewares
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/users', usersRoutes);

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'AutoPass Backend Running 🚀' });
});

module.exports = app;
