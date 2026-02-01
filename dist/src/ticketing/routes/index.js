"use strict";
/**
 * Ticketing Routes - Centralized exports
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventTicketResaleRouter = exports.eventReviewRouter = exports.eventFavoriteRouter = exports.eventTicketPurchaseRouter = exports.eventOrganizerRouter = exports.eventCategoryRouter = exports.eventRouter = void 0;
var event_router_1 = require("./event.router");
Object.defineProperty(exports, "eventRouter", { enumerable: true, get: function () { return __importDefault(event_router_1).default; } });
var event_category_router_1 = require("./event-category.router");
Object.defineProperty(exports, "eventCategoryRouter", { enumerable: true, get: function () { return __importDefault(event_category_router_1).default; } });
var event_organizer_router_1 = require("./event-organizer.router");
Object.defineProperty(exports, "eventOrganizerRouter", { enumerable: true, get: function () { return __importDefault(event_organizer_router_1).default; } });
var event_ticket_purchase_router_1 = require("./event-ticket-purchase.router");
Object.defineProperty(exports, "eventTicketPurchaseRouter", { enumerable: true, get: function () { return __importDefault(event_ticket_purchase_router_1).default; } });
var event_favorite_router_1 = require("./event-favorite.router");
Object.defineProperty(exports, "eventFavoriteRouter", { enumerable: true, get: function () { return __importDefault(event_favorite_router_1).default; } });
var event_review_router_1 = require("./event-review.router");
Object.defineProperty(exports, "eventReviewRouter", { enumerable: true, get: function () { return __importDefault(event_review_router_1).default; } });
var event_ticket_resale_router_1 = require("./event-ticket-resale.router");
Object.defineProperty(exports, "eventTicketResaleRouter", { enumerable: true, get: function () { return __importDefault(event_ticket_resale_router_1).default; } });
