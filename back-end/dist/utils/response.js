"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.sendError = sendError;
function sendSuccess(res, data, statusCode = 200) {
    return res.status(statusCode).json({ data });
}
function sendError(res, code, message, statusCode = 400, details) {
    const body = {
        error: {
            code,
            message,
            ...(details !== undefined ? { details } : {}),
        },
    };
    return res.status(statusCode).json(body);
}
