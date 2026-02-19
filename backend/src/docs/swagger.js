const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AutoPass API',
      version: '1.0.0',
    },
    servers: [
      {
        url: 'http://localhost:5000',
      },
    ],
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: {
            user_id: { type: 'string', format: 'uuid' },
            email: { type: 'string' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            national_id: { type: 'string' },
            phone_number: { type: 'string' },
            is_blocked: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        CreateUserInput: {
          type: 'object',
          required: [
            'email',
            'password_hash',
            'first_name',
            'last_name',
            'national_id',
            'phone_number'
          ],
          properties: {
            email: { type: 'string' },
            password_hash: { type: 'string' },
            first_name: { type: 'string' },
            middle_name: { type: 'string' },
            last_name: { type: 'string' },
            national_id: { type: 'string' },
            phone_number: { type: 'string' },
            address: { type: 'string' },
            date_of_birth: { type: 'string', format: 'date' }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
