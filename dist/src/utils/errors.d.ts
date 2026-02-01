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
export declare abstract class ApplicationError extends Error {
    readonly name: string;
    readonly statusCode: number;
    readonly isOperational: boolean;
    readonly details?: any;
    constructor(name: string, message: string, statusCode: number, isOperational: boolean, details?: any);
    toJSON(): {
        error: {
            stack: string;
            name: string;
            message: string;
            statusCode: number;
            details: any;
        };
    };
}
export declare class DatabaseError extends ApplicationError {
    readonly originalError?: Error;
    constructor(message: string, originalError?: Error);
}
export declare class AuthenticationError extends ApplicationError {
    constructor(message?: string, details?: any);
}
export declare class AuthorizationError extends ApplicationError {
    constructor(message?: string, details?: any);
}
export declare class ValidationError extends ApplicationError {
    readonly validationErrors?: any;
    constructor(message?: string, validationErrors?: any);
}
export declare class NotFoundError extends ApplicationError {
    constructor(resource: string, id?: string | number);
}
export declare class ConflictError extends ApplicationError {
    constructor(message?: string, details?: any);
}
export declare class RateLimitError extends ApplicationError {
    constructor(message?: string, details?: any);
}
export declare class ExternalServiceError extends ApplicationError {
    constructor(serviceName: string, details?: any);
}
export declare class MaintenanceError extends ApplicationError {
    constructor(message?: string);
}
