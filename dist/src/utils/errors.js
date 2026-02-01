"use strict";
/**
 * Custom error classes for Scholaa application
 *
 * Hierarchy:
 * - ApplicationError (abstract base)
 *   - DatabaseError
 *   - AuthenticationError
 *   - AuthorizationError
 *   - ValidationError
 *   - NotFoundError
 *   - ConflictError
 *   - RateLimitError
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaintenanceError = exports.ExternalServiceError = exports.RateLimitError = exports.ConflictError = exports.NotFoundError = exports.ValidationError = exports.AuthorizationError = exports.AuthenticationError = exports.DatabaseError = exports.ApplicationError = void 0;
class ApplicationError extends Error {
    constructor(name, message, statusCode, isOperational, details) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = name;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.details = details;
        // Capture stack trace (excluding constructor call)
        Error.captureStackTrace(this, this.constructor);
    }
    toJSON() {
        return {
            error: {
                name: this.name,
                message: this.message,
                statusCode: this.statusCode,
                details: this.details,
                ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
            }
        };
    }
}
exports.ApplicationError = ApplicationError;
// Database-related errors (400-499)
class DatabaseError extends ApplicationError {
    constructor(message, originalError) {
        super('DatabaseError', message, 500, // Internal Server Error
        true, { originalError: originalError?.message });
        this.originalError = originalError;
    }
}
exports.DatabaseError = DatabaseError;
// Authentication errors (401)
class AuthenticationError extends ApplicationError {
    constructor(message = 'Authentication failed', details) {
        super('AuthenticationError', message, 401, // Unauthorized
        true, details);
    }
}
exports.AuthenticationError = AuthenticationError;
// Authorization errors (403)
class AuthorizationError extends ApplicationError {
    constructor(message = 'Permission denied', details) {
        super('AuthorizationError', message, 403, // Forbidden
        true, details);
    }
}
exports.AuthorizationError = AuthorizationError;
// Validation errors (400)
class ValidationError extends ApplicationError {
    constructor(message = 'Invalid request data', validationErrors) {
        super('ValidationError', message, 400, // Bad Request
        true, { errors: validationErrors });
        this.validationErrors = validationErrors;
    }
}
exports.ValidationError = ValidationError;
// Not Found errors (404)
class NotFoundError extends ApplicationError {
    constructor(resource, id) {
        super('NotFoundError', id ? `${resource} with ID ${id} not found` : `${resource} not found`, 404, // Not Found
        true, { resource, id });
    }
}
exports.NotFoundError = NotFoundError;
// Conflict errors (409)
class ConflictError extends ApplicationError {
    constructor(message = 'Resource conflict', details) {
        super('ConflictError', message, 409, // Conflict
        true, details);
    }
}
exports.ConflictError = ConflictError;
// Rate Limit errors (429)
class RateLimitError extends ApplicationError {
    constructor(message = 'Too many requests', details) {
        super('RateLimitError', message, 429, // Too Many Requests
        true, details);
    }
}
exports.RateLimitError = RateLimitError;
// External Service errors (502)
class ExternalServiceError extends ApplicationError {
    constructor(serviceName, details) {
        super('ExternalServiceError', `Error communicating with ${serviceName} service`, 502, // Bad Gateway
        true, { service: serviceName, ...details });
    }
}
exports.ExternalServiceError = ExternalServiceError;
// Maintenance errors (503)
class MaintenanceError extends ApplicationError {
    constructor(message = 'Service temporarily unavailable for maintenance') {
        super('MaintenanceError', message, 503, // Service Unavailable
        true);
    }
}
exports.MaintenanceError = MaintenanceError;
