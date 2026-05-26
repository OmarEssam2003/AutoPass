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
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'Static API key used by Raspberry Pi / ANPR camera devices.',
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
            is_blocked:             { type: 'boolean', example: false },
            national_id_image_link: { type: 'string', example: '507f1f77bcf86cd799439011', nullable: true, description: 'MongoDB document ID of the stored national ID image' },
            created_at:             { type: 'string', format: 'date-time' },
          },
        },
        CreateUserBody: {
          type: 'object',
          description: 'multipart/form-data — includes image file upload for national ID OCR verification',
          required: ['email', 'password', 'first_name', 'last_name', 'national_id', 'phone_number', 'national_id_image'],
          properties: {
            email:              { type: 'string', format: 'email', example: 'john@example.com' },
            password:           { type: 'string', minLength: 8, example: 'SecurePass123!' },
            first_name:         { type: 'string', example: 'John' },
            middle_name:        { type: 'string', example: 'A.', nullable: true },
            last_name:          { type: 'string', example: 'Doe' },
            national_id:        { type: 'string', example: '29901010123456', description: 'Exactly 14 digits — must match the image' },
            phone_number:       { type: 'string', example: '+201001234567' },
            address:            { type: 'string', nullable: true, example: '12 Tahrir St, Cairo' },
            date_of_birth:      { type: 'string', format: 'date', nullable: true, example: '1999-01-15' },
            national_id_image:  { type: 'string', format: 'binary', description: 'JPEG or PNG image of the national ID (max 5MB)' },
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
            enforcement_id:       { type: 'string', format: 'uuid' },
            vehicle_id:           { type: 'string', format: 'uuid' },
            plate_number:         { type: 'string', example: 'ABC 1234' },
            make:                 { type: 'string', example: 'Toyota', nullable: true },
            model:                { type: 'string', example: 'Corolla', nullable: true },
            color:                { type: 'string', example: 'White', nullable: true },
            vehicle_type:         { type: 'string', example: 'Sedan', nullable: true },
            enforcement_type:     { type: 'string', enum: ['STOP', 'AUTO_BLOCK', 'OBSERVE'], example: 'STOP' },
            priority:             { type: 'integer', enum: [1, 2, 3], example: 3, description: 'STOP=3, AUTO_BLOCK=2, OBSERVE=1' },
            reason:               { type: 'string', example: 'Vehicle reported stolen — police case #12345' },
            notes:                { type: 'string', nullable: true },
            is_active:            { type: 'boolean', example: true },
            issued_by:            { type: 'string', format: 'uuid' },
            issued_by_first_name: { type: 'string', example: 'Mohamed' },
            issued_by_last_name:  { type: 'string', example: 'Ali' },
            issued_at:            { type: 'string', format: 'date-time' },
          },
        },
        CreateEnforcementBody: {
          type: 'object',
          required: ['plate_number', 'enforcement_type', 'reason'],
          properties: {
            plate_number:     { type: 'string', example: 'ABC 1234' },
            enforcement_type: { type: 'string', enum: ['STOP', 'AUTO_BLOCK', 'OBSERVE'], example: 'STOP' },
            priority:         { type: 'integer', enum: [1, 2, 3], description: 'Auto-derived from type if omitted. STOP=3, AUTO_BLOCK=2, OBSERVE=1' },
            reason:           { type: 'string', example: 'Vehicle reported stolen — police case #12345' },
            notes:            { type: 'string', nullable: true },
          },
        },
        UpdateEnforcementBody: {
          type: 'object',
          description: 'At least one field required. Priority auto-re-derived if type changes without explicit priority.',
          properties: {
            enforcement_type: { type: 'string', enum: ['STOP', 'AUTO_BLOCK', 'OBSERVE'] },
            priority:         { type: 'integer', enum: [1, 2, 3] },
            reason:           { type: 'string' },
            notes:            { type: 'string', nullable: true },
            is_active:        { type: 'boolean', description: 'Set false to deactivate without deleting' },
          },
        },

        // ─── Pricing Rule Schemas ──────────────────────────────────────────
        PricingRuleResponse: {
          type: 'object',
          properties: {
            rule_id:               { type: 'string', format: 'uuid' },
            zone_id:               { type: 'string', format: 'uuid' },
            zone_name:             { type: 'string', example: 'Main Entrance Zone' },
            vehicle_type:          { type: 'string', example: 'Sedan' },
            rate_per_hour:         { type: 'number', example: 5.00, description: 'Base hourly rate. Always present (NOT NULL).' },
            max_daily_cap:         { type: 'number', example: 40.00, nullable: true, description: 'Max daily charge cap. NULL = no cap.' },
            price:                 { type: 'number', example: 20.00, nullable: true, description: 'Optional flat fee. If set, overrides rate_per_hour at billing time.' },
            valid_from:            { type: 'string', format: 'date-time', nullable: true, description: 'When rule becomes effective. NULL = immediately from created_at.' },
            is_active:             { type: 'boolean', example: true },
            created_by:            { type: 'string', format: 'uuid', nullable: true },
            created_by_first_name: { type: 'string', example: 'Mohamed', nullable: true },
            created_by_last_name:  { type: 'string', example: 'Ali', nullable: true },
            created_at:            { type: 'string', format: 'date-time' },
          },
        },
        CreatePricingRuleBody: {
          type: 'object',
          required: ['zone_id', 'vehicle_type', 'rate_per_hour'],
          properties: {
            zone_id:       { type: 'string', format: 'uuid' },
            vehicle_type:  { type: 'string', example: 'Sedan' },
            rate_per_hour: { type: 'number', example: 5.00, description: 'Required. Base hourly charge (NOT NULL in DB).' },
            max_daily_cap: { type: 'number', example: 40.00, nullable: true, description: 'Must be >= rate_per_hour. NULL = no cap.' },
            price:         { type: 'number', example: 20.00, nullable: true, description: 'Optional flat fee override. Overrides rate_per_hour at billing time if set.' },
            valid_from:    { type: 'string', format: 'date-time', nullable: true, description: 'Schedule a future effective date. NULL = effective immediately.' },
          },
        },
        UpdatePricingRuleBody: {
          type: 'object',
          description: 'At least one field required. rate_per_hour cannot be set to null. max_daily_cap re-validated on every update.',
          properties: {
            vehicle_type:  { type: 'string' },
            rate_per_hour: { type: 'number', description: 'Cannot be null — NOT NULL in DB.' },
            max_daily_cap: { type: 'number', nullable: true },
            price:         { type: 'number', nullable: true, description: 'Set to null to remove flat fee and fall back to hourly billing.' },
            valid_from:    { type: 'string', format: 'date-time', nullable: true },
            is_active:     { type: 'boolean', description: 'Set false to deactivate without deleting.' },
          },
        },

        // ─── Detection Event Schemas ───────────────────────────────────────
        CreateDetectionEventBody: {
          type: 'object',
          description: 'multipart/form-data — image file required as "gate_image" field',
          required: ['gate_id', 'gate_image'],
          properties: {
            gate_id:             { type: 'string', format: 'uuid' },
            gate_image:          { type: 'string', format: 'binary', description: 'JPEG or PNG snapshot (max 5MB). Stored in MongoDB — doc ID saved in PostgreSQL as image_url.' },
            plate_detected:      { type: 'boolean', nullable: true },
            detection_stage:     { type: 'string', enum: ['NO_PLATE', 'TEMPLATE_FAIL', 'OCR_FAIL', 'SUCCESS'], nullable: true },
            template_confidence: { type: 'number', minimum: 0, maximum: 1, nullable: true },
            ocr_text:            { type: 'string', example: 'ABC 1234', nullable: true },
            ocr_confidence:      { type: 'number', minimum: 0, maximum: 1, nullable: true },
            decision:            { type: 'string', enum: ['OPEN', 'DENY'], nullable: true },
            failure_reason:      { type: 'string', nullable: true },
          },
        },
        UpdateDetectionEventBody: {
          type: 'object',
          description: 'At least one field required. vehicle_id is immutable — cannot be changed.',
          properties: {
            plate_detected:      { type: 'boolean', nullable: true },
            detection_stage:     { type: 'string', enum: ['NO_PLATE', 'TEMPLATE_FAIL', 'OCR_FAIL', 'SUCCESS'], nullable: true },
            template_confidence: { type: 'number', minimum: 0, maximum: 1, nullable: true },
            ocr_text:            { type: 'string', nullable: true },
            ocr_confidence:      { type: 'number', minimum: 0, maximum: 1, nullable: true },
            decision:            { type: 'string', enum: ['OPEN', 'DENY'], nullable: true },
            failure_reason:      { type: 'string', nullable: true },
            is_duplicate:        { type: 'boolean' },
          },
        },
        DetectionEventResponse: {
          type: 'object',
          properties: {
            event_id:             { type: 'string', format: 'uuid' },
            gate_id:              { type: 'string', format: 'uuid' },
            gate_name:            { type: 'string', example: 'North Entrance Gate A' },
            gate_direction:       { type: 'string', enum: ['IN', 'OUT'] },
            zone_id:              { type: 'string', format: 'uuid', nullable: true },
            zone_name:            { type: 'string', example: 'Main Entrance Zone', nullable: true },
            vehicle_id:           { type: 'string', format: 'uuid', nullable: true },
            plate_number:         { type: 'string', example: 'ABC 1234', nullable: true },
            make:                 { type: 'string', example: 'Toyota', nullable: true },
            model:                { type: 'string', example: 'Corolla', nullable: true },
            color:                { type: 'string', example: 'White', nullable: true },
            vehicle_type:         { type: 'string', example: 'Sedan', nullable: true },
            image_url:            { type: 'string', example: 'https://cdn.autopass.com/snap.jpg' },
            plate_detected:       { type: 'boolean', example: true, nullable: true },
            detection_stage:      { type: 'string', enum: ['NO_PLATE', 'TEMPLATE_FAIL', 'OCR_FAIL', 'SUCCESS'], nullable: true },
            template_confidence:  { type: 'number', example: 0.97, nullable: true },
            ocr_text:             { type: 'string', example: 'ABC1234', nullable: true },
            ocr_confidence:       { type: 'number', example: 0.95, nullable: true },
            decision:             { type: 'string', enum: ['OPEN', 'DENY'], nullable: true },
            failure_reason:       { type: 'string', nullable: true },
            is_duplicate:         { type: 'boolean', example: false },
            created_at:           { type: 'string', format: 'date-time' },
          },
        },

        // ─── Ticket Schemas ────────────────────────────────────────────────
        TicketResponse: {
          type: 'object',
          description: 'Auto-generated when a vehicle passes through a road gate. Price is a flat fee set at detection time.',
          properties: {
            ticket_id:               { type: 'string', format: 'uuid' },
            event_id:                { type: 'string', format: 'uuid', description: 'Source detection event' },
            vehicle_id:              { type: 'string', format: 'uuid' },
            plate_number:            { type: 'string', example: 'ABC 1234' },
            make:                    { type: 'string', example: 'Toyota', nullable: true },
            model:                   { type: 'string', example: 'Corolla', nullable: true },
            color:                   { type: 'string', example: 'White', nullable: true },
            vehicle_type:            { type: 'string', example: 'Sedan', nullable: true },
            rule_id:                 { type: 'string', format: 'uuid', nullable: true, description: 'Reference to the pricing rule used to calculate price at detection time' },
            gate_id:                 { type: 'string', format: 'uuid', nullable: true },
            gate_name:               { type: 'string', example: 'North Entrance Gate A', nullable: true },
            gate_direction:          { type: 'string', enum: ['IN', 'OUT'], nullable: true },
            zone_id:                 { type: 'string', format: 'uuid', nullable: true },
            zone_name:               { type: 'string', example: 'Main Entrance Zone', nullable: true },
            direction:               { type: 'string', enum: ['IN', 'OUT'], nullable: true, description: 'Direction of travel at detection time' },
            price:                   { type: 'number', example: 15.00, nullable: true, description: 'Flat fee charged for this gate passage' },
            status:                  { type: 'string', enum: ['UNPAID', 'PAID', 'DISPUTED', 'CANCELLED'], example: 'UNPAID' },
            charged_as:              { type: 'string', enum: ['OWNER', 'RENTER', 'UNASSIGNED'], example: 'OWNER' },
            rental_id:               { type: 'string', format: 'uuid', nullable: true, description: 'Set if an active rental was detected at passage time' },
            charged_user_id:         { type: 'string', format: 'uuid', nullable: true },
            charged_user_first_name: { type: 'string', example: 'John', nullable: true },
            charged_user_last_name:  { type: 'string', example: 'Doe', nullable: true },
            charged_user_email:      { type: 'string', example: 'john@example.com', nullable: true },
            issued_at:               { type: 'string', format: 'date-time' },
          },
        },
        UpdateTicketBody: {
          type: 'object',
          description: 'SUPER_ADMIN manual override. At least one field required. Cannot modify PAID or CANCELLED tickets.',
          properties: {
            status:          { type: 'string', enum: ['UNPAID', 'PAID', 'DISPUTED', 'CANCELLED'] },
            price:           { type: 'number', example: 12.50, minimum: 0, description: 'Flat gate passage fee' },
            charged_user_id: { type: 'string', format: 'uuid', nullable: true },
            charged_as:      { type: 'string', enum: ['OWNER', 'RENTER', 'UNASSIGNED'] },
          },
        },

        // ─── Alert Schemas ─────────────────────────────────────────────────
        AlertResponse: {
          type: 'object',
          properties: {
            alert_id:         { type: 'string', format: 'uuid' },
            user_id:          { type: 'string', format: 'uuid', nullable: true },
            user_first_name:  { type: 'string', nullable: true },
            user_last_name:   { type: 'string', nullable: true },
            user_email:       { type: 'string', nullable: true },
            admin_id:         { type: 'string', format: 'uuid', nullable: true },
            admin_first_name: { type: 'string', nullable: true },
            admin_last_name:  { type: 'string', nullable: true },
            type:             { type: 'string', example: 'TICKET_ISSUED' },
            message:          { type: 'string', example: 'Your vehicle ABC 1234 was charged EGP 15.00.' },
            is_read:          { type: 'boolean', example: false },
            created_at:       { type: 'string', format: 'date-time' },
          },
        },
        CreateAlertBody: {
          type: 'object',
          required: ['type', 'message'],
          description: 'At least one of user_id or admin_id must be provided.',
          properties: {
            user_id:  { type: 'string', format: 'uuid', nullable: true },
            admin_id: { type: 'string', format: 'uuid', nullable: true },
            type:     { type: 'string', example: 'ENFORCEMENT_FLAG', description: 'e.g. ENFORCEMENT_FLAG, PAYMENT_REMINDER, TICKET_ISSUED, RENTAL_REQUEST' },
            message:  { type: 'string', example: 'Vehicle ABC 1234 has been flagged with STOP enforcement.' },
          },
        },

        // ─── Audit Log Schemas ──────────────────────────────────────────────
        AuditLogResponse: {
          type: 'object',
          properties: {
            audit_id:         { type: 'string', format: 'uuid' },
            admin_id:         { type: 'string', format: 'uuid', nullable: true },
            admin_first_name: { type: 'string', nullable: true },
            admin_last_name:  { type: 'string', nullable: true },
            action_type:      { type: 'string', example: 'UPDATE_ENFORCEMENT', description: 'e.g. CREATE_USER, DELETE_TICKET, UPDATE_ENFORCEMENT' },
            entity_type:      { type: 'string', example: 'vehicle_enforcements', description: 'Table name of the affected record' },
            entity_id:        { type: 'string', format: 'uuid', nullable: true },
            old_value:        { type: 'object', nullable: true, description: 'Record state before the change' },
            new_value:        { type: 'object', nullable: true, description: 'Record state after the change' },
            ip_address:       { type: 'string', example: '197.32.14.5', nullable: true },
            created_at:       { type: 'string', format: 'date-time' },
          },
        },

        // ─── Payment Schemas ───────────────────────────────────────────────
        PayTicketBody: {
          type: 'object',
          required: ['ticket_id'],
          properties: {
            ticket_id:      { type: 'string', format: 'uuid' },
            payment_method: { type: 'string', example: 'MOBILE_APP', default: 'MOBILE_APP' },
          },
        },
        PayAllBody: {
          type: 'object',
          required: ['vehicle_id'],
          properties: {
            vehicle_id:     { type: 'string', format: 'uuid' },
            payment_method: { type: 'string', example: 'MOBILE_APP', default: 'MOBILE_APP' },
          },
        },
        PaymentResponse: {
          type: 'object',
          properties: {
            payment_id:     { type: 'string', format: 'uuid' },
            user_id:        { type: 'string', format: 'uuid', nullable: true },
            first_name:     { type: 'string', example: 'John', nullable: true },
            last_name:      { type: 'string', example: 'Doe', nullable: true },
            email:          { type: 'string', example: 'john@example.com', nullable: true },
            amount:         { type: 'number', example: 35.00 },
            payment_method: { type: 'string', example: 'MOBILE_APP' },
            status:         { type: 'string', enum: ['COMPLETED', 'FAILED', 'REFUNDED'] },
            paid_at:        { type: 'string', format: 'date-time' },
            ticket_ids:     { type: 'array', items: { type: 'string', format: 'uuid' } },
          },
        },
        PaymentDetailResponse: {
          type: 'object',
          description: 'Full payment detail including ticket breakdown',
          properties: {
            payment_id:     { type: 'string', format: 'uuid' },
            user_id:        { type: 'string', format: 'uuid', nullable: true },
            first_name:     { type: 'string', example: 'John', nullable: true },
            last_name:      { type: 'string', example: 'Doe', nullable: true },
            email:          { type: 'string', example: 'john@example.com', nullable: true },
            amount:         { type: 'number', example: 35.00 },
            payment_method: { type: 'string', example: 'MOBILE_APP' },
            status:         { type: 'string', enum: ['COMPLETED', 'FAILED', 'REFUNDED'] },
            paid_at:        { type: 'string', format: 'date-time' },
            tickets: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  ticket_id:    { type: 'string', format: 'uuid' },
                  price:        { type: 'number', example: 15.00, nullable: true },
                  status:       { type: 'string', example: 'PAID' },
                  plate_number: { type: 'string', example: 'ABC 1234' },
                  gate_name:    { type: 'string', example: 'North Entrance Gate A', nullable: true },
                  zone_name:    { type: 'string', example: 'Main Entrance Zone', nullable: true },
                  issued_at:    { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        PaymentResultResponse: {
          type: 'object',
          description: 'Returned after a successful pay or pay-all operation',
          properties: {
            status:       { type: 'string', example: 'success' },
            payment:      { $ref: '#/components/schemas/PaymentResponse' },
            total_amount: { type: 'number', example: 35.00 },
            ticket_count: { type: 'integer', example: 3, description: 'Only present in pay-all response' },
            message:      { type: 'string', example: 'All 3 ticket(s) paid successfully. Total charged: 35.00 EGP.' },
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
      { name: 'Vehicle Enforcements', description: 'Flag vehicles at gates with STOP / AUTO_BLOCK / OBSERVE enforcement types — SUPER_ADMIN, SECURITY_ADMIN, OPERATOR' },
      { name: 'Pricing Rules',        description: 'Zone-based pricing rules per vehicle type — SUPER_ADMIN and OPERATOR' },
      { name: 'Detection Events',     description: 'ANPR pipeline audit trail. POST by Raspberry Pi (x-api-key). PUT/DELETE restricted to SUPER_ADMIN.' },
      { name: 'Tickets',              description: 'Parking/access tickets auto-generated from detection events' },
      { name: 'Payments',             description: 'Single and bulk ticket payments from the mobile app' },
      { name: 'Payment Tickets',      description: 'Look up which payment covered a specific ticket' },
      { name: 'Alerts',               description: 'System notifications for users and admins' },
      { name: 'Audit Logs',           description: 'Immutable append-only record of all admin actions — read only' },
    ],
  },
  apis: ['./src/modules/**/*.routes.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;