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

export abstract class ApplicationError extends Error {
    public readonly name: string;
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly details?: any;

    constructor(
        name: string,
        message: string,
        statusCode: number,
        isOperational: boolean,
        details?: any
    ) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);

        this.name = name;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.details = details;

        // Capture stack trace (excluding constructor call)
        Error.captureStackTrace(this, this.constructor);
    }

    public toJSON() {
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

// Database-related errors (400-499)
export class DatabaseError extends ApplicationError {
    constructor(message: string, public readonly originalError?: Error) {
        super(
            'DatabaseError',
            message,
            500, // Internal Server Error
            true,
            { originalError: originalError?.message }
        );
    }
}

// Authentication errors (401)
export class AuthenticationError extends ApplicationError {
    constructor(message: string = 'Authentication failed', details?: any) {
        super(
            'AuthenticationError',
            message,
            401, // Unauthorized
            true,
            details
        );
    }
}

// Authorization errors (403)
export class AuthorizationError extends ApplicationError {
    constructor(message: string = 'Permission denied', details?: any) {
        super(
            'AuthorizationError',
            message,
            403, // Forbidden
            true,
            details
        );
    }
}

// Validation errors (400)
export class ValidationError extends ApplicationError {
    constructor(message: string = 'Invalid request data', public readonly validationErrors?: any) {
        super(
            'ValidationError',
            message,
            400, // Bad Request
            true,
            { errors: validationErrors }
        );
    }
}

// Not Found errors (404)
export class NotFoundError extends ApplicationError {
    constructor(resource: string, id?: string | number) {
        super(
            'NotFoundError',
            id ? `${resource} with ID ${id} not found` : `${resource} not found`,
            404, // Not Found
            true,
            { resource, id }
        );
    }
}

// Conflict errors (409)
export class ConflictError extends ApplicationError {
    constructor(message: string = 'Resource conflict', details?: any) {
        super(
            'ConflictError',
            message,
            409, // Conflict
            true,
            details
        );
    }
}

// Rate Limit errors (429)
export class RateLimitError extends ApplicationError {
    constructor(message: string = 'Too many requests', details?: any) {
        super(
            'RateLimitError',
            message,
            429, // Too Many Requests
            true,
            details
        );
    }
}

// External Service errors (502)
export class ExternalServiceError extends ApplicationError {
    constructor(serviceName: string, details?: any) {
        super(
            'ExternalServiceError',
            `Error communicating with ${serviceName} service`,
            502, // Bad Gateway
            true,
            { service: serviceName, ...details }
        );
    }
}

// Maintenance errors (503)
export class MaintenanceError extends ApplicationError {
    constructor(message: string = 'Service temporarily unavailable for maintenance') {
        super(
            'MaintenanceError',
            message,
            503, // Service Unavailable
            true
        );
    }
}