import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ADIGO API',
      description: 'Transportation & Delivery Management System API',
      version: '1.0.0',
      contact: {
        name: 'ADIGO Support',
        email: 'support@adigobookings.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3800/v1/api',
        description: 'Development Server',
      },
      {
        url: 'https://api.adigobookings.com/v1/api',
        description: 'Production Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/**/*.ts', './src/controllers/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
