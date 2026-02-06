// Vercel Serverless Function Entry Point
// Uses dynamic require to prevent ncc from re-bundling the pre-built handler
const path = require("path");
const handlerPath = path.join(__dirname, "..", "dist", "vercel-handler.cjs");
module.exports = require(handlerPath);
