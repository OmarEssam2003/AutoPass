const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '🚗 AutoPass API',
      version: '1.0.0',
      description:
        'AutoPass – Intelligent ANPR-Based Automated Gate Access System. ' +
        'This API manages users, vehicles, gates, ticketing, enforcement, and more.',
      contact: {
        name: 'AutoPass Dev Team',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}/api`,
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token. Admins and Users have separate tokens.',
        },
      },
      schemas: {
        // ─── User Schemas ────────────────────────────────────────────────
        UserResponse: {
          type: 'object',
          properties: {
            user_id:       { type: 'string', format: 'uuid', example: 'a1b2c3d4-...' },
            email:         { type: 'string', format: 'email', example: 'john@example.com' },
            first_name:    { type: 'string', example: 'John' },
            middle_name:   { type: 'string', example: 'A.', nullable: true },
            last_name:     { type: 'string', example: 'Doe' },
            national_id:   { type: 'string', example: '29901010123456' },
            phone_number:  { type: 'string', example: '+201001234567' },
            address:       { type: 'string', nullable: true, example: '12 Tahrir St, Cairo' },
            date_of_birth: { type: 'string', format: 'date', nullable: true, example: '1999-01-15' },
            is_blocked:    { type: 'boolean', example: false },
            created_at:    { type: 'string', format: 'date-time' },
          },
        },
        CreateUserBody: {
          type: 'object',
          required: ['email', 'password', 'first_name', 'last_name', 'national_id', 'phone_number'],
          properties: {
            email:         { type: 'string', format: 'email', example: 'john@example.com' },
            password:      { type: 'string', minLength: 8, example: 'SecurePass123!' },
            first_name:    { type: 'string', example: 'John' },
            middle_name:   { type: 'string', example: 'A.', nullable: true },
            last_name:     { type: 'string', example: 'Doe' },
            national_id:   { type: 'string', example: '29901010123456' },
            phone_number:  { type: 'string', example: '+201001234567' },
            address:       { type: 'string', nullable: true, example: '12 Tahrir St, Cairo' },
            date_of_birth: { type: 'string', format: 'date', nullable: true, example: '1999-01-15' },
          },
        },
        UpdateUserBody: {
          type: 'object',
          description: 'All fields are optional. Password cannot be changed via this endpoint.',
          properties: {
            email:         { type: 'string', format: 'email', example: 'john.new@example.com' },
            first_name:    { type: 'string', example: 'John' },
            middle_name:   { type: 'string', example: 'A.' },
            last_name:     { type: 'string', example: 'Doe' },
            national_id:   { type: 'string', example: '29901010123456' },
            phone_number:  { type: 'string', example: '+201001234567' },
            address:       { type: 'string', example: '12 Tahrir St, Cairo' },
            date_of_birth: { type: 'string', format: 'date', example: '1999-01-15' },
          },
        },
        // ─── Shared / Generic ────────────────────────────────────────────
        SuccessMessage: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Operation completed successfully' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            status:  { type: 'string', example: 'error' },
            message: { type: 'string', example: 'Something went wrong' },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            status:  { type: 'string', example: 'error' },
            message: { type: 'string', example: 'Validation failed' },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field:   { type: 'string', example: 'email' },
                  message: { type: 'string', example: '"email" must be a valid email' },
                },
              },
            },
          },
        },
        // ─── Gate Schemas ─────────────────────────────────────────────────
        GateResponse: {
          type: 'object',
          properties: {
            gate_id:       { type: 'string', format: 'uuid' },
            location_name: { type: 'string', example: 'North Entrance Gate' },
            direction:     { type: 'string', enum: ['IN', 'OUT'], example: 'IN' },
            zone_id:       { type: 'string', format: 'uuid', nullable: true },
            zone_name:     { type: 'string', example: 'Main Entrance Zone', nullable: true },
            device_serial: { type: 'string', example: 'RPI-001-NE', nullable: true },
            is_active:     { type: 'boolean', example: true },
          },
        },
        CreateGateBody: {
          type: 'object',
          required: ['location_name', 'direction'],
          properties: {
            location_name: { type: 'string', example: 'North Entrance Gate' },
            direction:     { type: 'string', enum: ['IN', 'OUT'], example: 'IN' },
            zone_id:       { type: 'string', format: 'uuid', nullable: true },
            device_serial: { type: 'string', example: 'RPI-001-NE', nullable: true },
            is_active:     { type: 'boolean', example: true },
          },
        },
        UpdateGateBody: {
          type: 'object',
          description: 'At least one field must be provided.',
          properties: {
            location_name: { type: 'string', example: 'North Entrance Gate B' },
            direction:     { type: 'string', enum: ['IN', 'OUT'] },
            zone_id:       { type: 'string', format: 'uuid', nullable: true },
            device_serial: { type: 'string', nullable: true },
            is_active:     { type: 'boolean' },
          },
        },
        // ─── Gate Schemas ─────────────────────────────────────────────────
        GateResponse: {
          type: 'object',
          properties: {
            gate_id:       { type: 'string', format: 'uuid' },
            location_name: { type: 'string', example: 'North Entrance Gate A' },
            direction:     { type: 'string', enum: ['IN', 'OUT'] },
            device_serial: { type: 'string', example: 'RPI-001-2024', nullable: true },
            is_active:     { type: 'boolean', example: true },
            zone_id:       { type: 'string', format: 'uuid', nullable: true },
            zone_name:     { type: 'string', example: 'Main Entrance Zone', nullable: true },
          },
        },
        CreateGateBody: {
          type: 'object',
          required: ['location_name', 'direction'],
          properties: {
            location_name: { type: 'string', example: 'North Entrance Gate A' },
            direction:     { type: 'string', enum: ['IN', 'OUT'] },
            zone_id:       { type: 'string', format: 'uuid', nullable: true },
            device_serial: { type: 'string', example: 'RPI-001-2024', nullable: true },
            is_active:     { type: 'boolean', example: true, default: true },
          },
        },
        UpdateGateBody: {
          type: 'object',
          description: 'At least one field must be provided.',
          properties: {
            location_name: { type: 'string' },
            direction:     { type: 'string', enum: ['IN', 'OUT'] },
            zone_id:       { type: 'string', format: 'uuid', nullable: true },
            device_serial: { type: 'string', nullable: true },
            is_active:     { type: 'boolean' },
          },
        },
        // ─── Zone Schemas ─────────────────────────────────────────────────
        ZoneResponse: {
          type: 'object',
          properties: {
            zone_id:                      { type: 'string', format: 'uuid' },
            zone_name:                    { type: 'string', example: 'Main Entrance Zone' },
            deduplication_window_minutes: { type: 'integer', example: 15 },
          },
        },
        CreateZoneBody: {
          type: 'object',
          required: ['zone_name'],
          properties: {
            zone_name:                    { type: 'string', example: 'Main Entrance Zone' },
            deduplication_window_minutes: { type: 'integer', example: 15, default: 15 },
          },
        },
        UpdateZoneBody: {
          type: 'object',
          description: 'At least one field must be provided.',
          properties: {
            zone_name:                    { type: 'string', example: 'North Gate Zone' },
            deduplication_window_minutes: { type: 'integer', example: 30 },
          },
        },
        // ─── Admin Schemas ────────────────────────────────────────────────
        AdminResponse: {
          type: 'object',
          properties: {
            admin_id:     { type: 'string', format: 'uuid' },
            email:        { type: 'string', format: 'email', example: 'super@autopass.com' },
            first_name:   { type: 'string', example: 'Mohamed' },
            last_name:    { type: 'string', example: 'Ali' },
            phone_number: { type: 'string', example: '+201001234567', nullable: true },
            admin_level:  { type: 'string', enum: ['SUPER_ADMIN', 'SECURITY_ADMIN', 'FINANCE_ADMIN', 'OPERATOR'] },
            is_active:    { type: 'boolean', example: true },
            created_at:   { type: 'string', format: 'date-time' },
          },
        },
        CreateAdminBody: {
          type: 'object',
          required: ['email', 'password', 'first_name', 'last_name', 'admin_level'],
          properties: {
            email:        { type: 'string', format: 'email', example: 'admin@autopass.com' },
            password:     { type: 'string', minLength: 8, example: 'SecurePass123!' },
            first_name:   { type: 'string', example: 'Mohamed' },
            last_name:    { type: 'string', example: 'Ali' },
            phone_number: { type: 'string', example: '+201001234567', nullable: true },
            admin_level:  { type: 'string', enum: ['SUPER_ADMIN', 'SECURITY_ADMIN', 'FINANCE_ADMIN', 'OPERATOR'] },
            is_active:    { type: 'boolean', example: true },
          },
        },
        UpdateAdminBody: {
          type: 'object',
          description: 'All fields optional. Password cannot be changed via this endpoint.',
          properties: {
            email:        { type: 'string', format: 'email' },
            first_name:   { type: 'string' },
            last_name:    { type: 'string' },
            phone_number: { type: 'string', nullable: true },
            admin_level:  { type: 'string', enum: ['SUPER_ADMIN', 'SECURITY_ADMIN', 'FINANCE_ADMIN', 'OPERATOR'] },
            is_active:    { type: 'boolean' },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            total:       { type: 'integer', example: 100 },
            page:        { type: 'integer', example: 1 },
            limit:       { type: 'integer', example: 20 },
            total_pages: { type: 'integer', example: 5 },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth',   description: 'Login endpoint for users and admins' },
      { name: 'Users',  description: 'User management endpoints' },
      { name: 'Admins', description: 'Admin management endpoints — SUPER_ADMIN only' },
      { name: 'Zones',  description: 'Zone management — SUPER_ADMIN and OPERATOR' },
      { name: 'Gates',  description: 'Gate management — SUPER_ADMIN and OPERATOR' },
      { name: 'Gates',  description: 'Gate management — SUPER_ADMIN and OPERATOR' },
    ],
  },
  // Where to scan for JSDoc @swagger comments
  apis: ['./src/modules/**/*.routes.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;