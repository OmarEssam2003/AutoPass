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
      contact: { name: 'AutoPass Dev Team' },
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

        // ─── Shared / Generic ─────────────────────────────────────────────
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
        PaginationMeta: {
          type: 'object',
          properties: {
            total:       { type: 'integer', example: 100 },
            page:        { type: 'integer', example: 1 },
            limit:       { type: 'integer', example: 20 },
            total_pages: { type: 'integer', example: 5 },
          },
        },

        // ─── User Schemas ──────────────────────────────────────────────────
        UserResponse: {
          type: 'object',
          properties: {
            user_id:       { type: 'string', format: 'uuid' },
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

        // ─── Admin Schemas ─────────────────────────────────────────────────
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

        // ─── Zone Schemas ──────────────────────────────────────────────────
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

        // ─── Gate Schemas ──────────────────────────────────────────────────
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

        // ─── Vehicle Schemas ───────────────────────────────────────────────
        VehicleResponse: {
          type: 'object',
          properties: {
            vehicle_id:         { type: 'string', format: 'uuid' },
            plate_number:       { type: 'string', example: 'ABC 1234' },
            vehicle_type:       { type: 'string', example: 'Sedan', nullable: true },
            make:               { type: 'string', example: 'Toyota', nullable: true },
            model:              { type: 'string', example: 'Corolla', nullable: true },
            color:              { type: 'string', example: 'White', nullable: true },
            owner_phone_number: { type: 'string', example: '+201001234567' },
            created_at:         { type: 'string', format: 'date-time' },
          },
        },
        CreateVehicleBody: {
          type: 'object',
          required: ['plate_number', 'owner_phone_number'],
          properties: {
            plate_number:       { type: 'string', example: 'ABC 1234' },
            vehicle_type:       { type: 'string', example: 'Sedan', nullable: true },
            make:               { type: 'string', example: 'Toyota', nullable: true },
            model:              { type: 'string', example: 'Corolla', nullable: true },
            color:              { type: 'string', example: 'White', nullable: true },
            owner_phone_number: { type: 'string', example: '+201001234567' },
          },
        },
        UpdateVehicleBody: {
          type: 'object',
          description: 'At least one field must be provided.',
          properties: {
            plate_number:       { type: 'string' },
            vehicle_type:       { type: 'string', nullable: true },
            make:               { type: 'string', nullable: true },
            model:              { type: 'string', nullable: true },
            color:              { type: 'string', nullable: true },
            owner_phone_number: { type: 'string' },
          },
        },

        // ─── Vehicle Ownership Schemas ─────────────────────────────────────
        OwnershipResponse: {
          type: 'object',
          properties: {
            ownership_id:   { type: 'string', format: 'uuid' },
            vehicle_id:     { type: 'string', format: 'uuid' },
            user_id:        { type: 'string', format: 'uuid' },
            verified:       { type: 'boolean', example: true },
            otp_expires_at: { type: 'string', format: 'date-time', nullable: true },
            created_at:     { type: 'string', format: 'date-time' },
            plate_number:   { type: 'string', example: 'ABC 1234' },
            make:           { type: 'string', example: 'Toyota', nullable: true },
            model:          { type: 'string', example: 'Corolla', nullable: true },
            color:          { type: 'string', example: 'White', nullable: true },
            first_name:     { type: 'string', example: 'John' },
            last_name:      { type: 'string', example: 'Doe' },
            email:          { type: 'string', example: 'john@example.com' },
          },
        },
        OwnershipOTPResponse: {
          type: 'object',
          description: 'Returned after creating an ownership record. OTP is shown here for development only.',
          properties: {
            ownership_id:   { type: 'string', format: 'uuid' },
            vehicle_id:     { type: 'string', format: 'uuid' },
            user_id:        { type: 'string', format: 'uuid' },
            verified:       { type: 'boolean', example: false },
            otp_expires_at: { type: 'string', format: 'date-time' },
            created_at:     { type: 'string', format: 'date-time' },
            otp:            { type: 'string', example: '482910', description: '⚠️ Dev only — send via SMS in production' },
            message:        { type: 'string', example: 'Ownership record created. Use the OTP to verify. OTP expires in 15 minutes.' },
          },
        },
        OwnershipVerifiedResponse: {
          type: 'object',
          properties: {
            ownership_id: { type: 'string', format: 'uuid' },
            vehicle_id:   { type: 'string', format: 'uuid' },
            user_id:      { type: 'string', format: 'uuid' },
            verified:     { type: 'boolean', example: true },
            created_at:   { type: 'string', format: 'date-time' },
            message:      { type: 'string', example: 'Vehicle ownership verified successfully.' },
          },
        },

        // ─── Vehicle Rental Schemas ────────────────────────────────────────
        RentalResponse: {
          type: 'object',
          properties: {
            rental_id:          { type: 'string', format: 'uuid' },
            vehicle_id:         { type: 'string', format: 'uuid' },
            owner_id:           { type: 'string', format: 'uuid' },
            renter_id:          { type: 'string', format: 'uuid' },
            start_date:         { type: 'string', format: 'date-time' },
            end_date:           { type: 'string', format: 'date-time' },
            status:             { type: 'string', enum: ['PENDING', 'ACCEPTED', 'REJECTED'] },
            created_at:         { type: 'string', format: 'date-time' },
            plate_number:       { type: 'string', example: 'ABC 1234' },
            make:               { type: 'string', example: 'Toyota', nullable: true },
            model:              { type: 'string', example: 'Corolla', nullable: true },
            color:              { type: 'string', example: 'White', nullable: true },
            owner_first_name:   { type: 'string', example: 'John' },
            owner_last_name:    { type: 'string', example: 'Doe' },
            owner_email:        { type: 'string', example: 'john@example.com' },
            renter_first_name:  { type: 'string', example: 'Sara' },
            renter_last_name:   { type: 'string', example: 'Ahmed' },
            renter_email:       { type: 'string', example: 'sara@example.com' },
          },
        },
        CreateRentalBody: {
          type: 'object',
          required: ['plate_number', 'renter_email', 'start_date', 'end_date'],
          properties: {
            plate_number: { type: 'string', example: 'ABC 1234', description: 'Plate number of a vehicle you are a verified owner of' },
            renter_email: { type: 'string', format: 'email', example: 'sara@example.com', description: 'Email address of the user you want to rent the vehicle to' },
            start_date:   { type: 'string', format: 'date-time', example: '2026-03-01T00:00:00.000Z' },
            end_date:     { type: 'string', format: 'date-time', example: '2026-03-15T00:00:00.000Z' },
          },
        },

        // ─── Vehicle Enforcement Schemas ───────────────────────────────────
        EnforcementResponse: {
          type: 'object',
          properties: {
            enforcement_id:        { type: 'string', format: 'uuid' },
            vehicle_id:            { type: 'string', format: 'uuid' },
            reported_by:           { type: 'string', format: 'uuid' },
            reason:                { type: 'string', example: 'Vehicle reported stolen by owner' },
            notes:                 { type: 'string', example: 'Reported at Cairo police station', nullable: true },
            is_active:             { type: 'boolean', example: true },
            enforced_at:           { type: 'string', format: 'date-time' },
            plate_number:          { type: 'string', example: 'ABC 1234' },
            make:                  { type: 'string', example: 'Toyota', nullable: true },
            model:                 { type: 'string', example: 'Corolla', nullable: true },
            color:                 { type: 'string', example: 'White', nullable: true },
            reported_by_first_name: { type: 'string', example: 'Mohamed' },
            reported_by_last_name:  { type: 'string', example: 'Ali' },
            reported_by_email:      { type: 'string', example: 'admin@autopass.com' },
          },
        },
        CreateEnforcementBody: {
          type: 'object',
          required: ['plate_number', 'reason'],
          properties: {
            plate_number: { type: 'string', example: 'ABC 1234' },
            reason:       { type: 'string', example: 'Vehicle reported stolen by owner' },
            notes:        { type: 'string', example: 'Reported at Cairo police station', nullable: true },
            is_active:    { type: 'boolean', example: true, default: true },
          },
        },
        UpdateEnforcementBody: {
          type: 'object',
          description: 'At least one field must be provided.',
          properties: {
            reason:    { type: 'string' },
            notes:     { type: 'string', nullable: true },
            is_active: { type: 'boolean', description: 'Set to false to lift the enforcement' },
          },
        },

        // ─── Pricing Rule Schemas ──────────────────────────────────────────
        PricingRuleResponse: {
          type: 'object',
          properties: {
            rule_id:       { type: 'string', format: 'uuid' },
            zone_id:       { type: 'string', format: 'uuid' },
            zone_name:     { type: 'string', example: 'Main Entrance Zone' },
            vehicle_type:  { type: 'string', example: 'Sedan' },
            rate_per_hour: { type: 'number', example: 5.00 },
            max_daily_cap: { type: 'number', example: 40.00, nullable: true },
            is_active:     { type: 'boolean', example: true },
            created_at:    { type: 'string', format: 'date-time' },
          },
        },
        CreatePricingRuleBody: {
          type: 'object',
          required: ['zone_id', 'vehicle_type', 'rate_per_hour'],
          properties: {
            zone_id:       { type: 'string', format: 'uuid' },
            vehicle_type:  { type: 'string', example: 'Sedan' },
            rate_per_hour: { type: 'number', example: 5.00 },
            max_daily_cap: { type: 'number', example: 40.00, nullable: true },
            is_active:     { type: 'boolean', example: true, default: true },
          },
        },
        UpdatePricingRuleBody: {
          type: 'object',
          description: 'At least one field must be provided.',
          properties: {
            zone_id:       { type: 'string', format: 'uuid' },
            vehicle_type:  { type: 'string' },
            rate_per_hour: { type: 'number' },
            max_daily_cap: { type: 'number', nullable: true },
            is_active:     { type: 'boolean' },
          },
        },

        // ─── Detection Event Schemas ───────────────────────────────────────
        DetectionEventResponse: {
          type: 'object',
          properties: {
            event_id:         { type: 'string', format: 'uuid' },
            gate_id:          { type: 'string', format: 'uuid' },
            plate_number:     { type: 'string', example: 'ABC 1234' },
            detected_at:      { type: 'string', format: 'date-time' },
            snapshot_url:     { type: 'string', example: 'https://cdn.autopass.com/snap.jpg', nullable: true },
            confidence_score: { type: 'number', example: 97.50, nullable: true },
            is_duplicate:     { type: 'boolean', example: false },
            gate_location:    { type: 'string', example: 'North Entrance Gate A' },
            gate_direction:   { type: 'string', enum: ['IN', 'OUT'] },
            zone_id:          { type: 'string', format: 'uuid', nullable: true },
            zone_name:        { type: 'string', example: 'Main Entrance Zone', nullable: true },
            ticket_created:   { type: 'boolean', example: true },
            ticket_id:        { type: 'string', format: 'uuid', nullable: true },
            enforcement_flag: {
              nullable: true,
              type: 'object',
              properties: {
                enforcement_id: { type: 'string', format: 'uuid' },
                reason:         { type: 'string', example: 'Vehicle reported stolen' },
              },
            },
            message: { type: 'string', example: 'Detection recorded. Ticket created.' },
          },
        },
        CreateDetectionEventBody: {
          type: 'object',
          required: ['gate_id', 'plate_number'],
          properties: {
            gate_id:          { type: 'string', format: 'uuid' },
            plate_number:     { type: 'string', example: 'ABC 1234' },
            detected_at:      { type: 'string', format: 'date-time', description: 'Defaults to now if omitted' },
            snapshot_url:     { type: 'string', format: 'uri', nullable: true },
            confidence_score: { type: 'number', example: 97.50, nullable: true },
          },
        },

      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth',                 description: 'Login endpoint for users and admins' },
      { name: 'Users',                description: 'User management endpoints' },
      { name: 'Admins',               description: 'Admin management endpoints — SUPER_ADMIN only' },
      { name: 'Zones',                description: 'Zone management — SUPER_ADMIN and OPERATOR' },
      { name: 'Gates',                description: 'Gate management — SUPER_ADMIN and OPERATOR' },
      { name: 'Vehicles',             description: 'Vehicle registration and management' },
      { name: 'Vehicle Ownerships',   description: 'Link users to vehicles with OTP verification' },
      { name: 'Vehicle Rentals',      description: 'Rental requests between vehicle owners and renters' },
      { name: 'Vehicle Enforcements', description: 'Flag vehicles for enforcement at gates — SUPER_ADMIN and OPERATOR' },
      { name: 'Pricing Rules',        description: 'Zone-based pricing rules per vehicle type — SUPER_ADMIN and OPERATOR' },
      { name: 'Detection Events',     description: 'ANPR plate detection events posted by gate cameras' },
    ],
  },
  apis: ['./src/modules/**/*.routes.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;