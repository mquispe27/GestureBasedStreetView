import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import logger from "morgan";
import * as path from "path";

// The following line sets up the environment variables before everything else.
dotenv.config();

export const app = express();
const PORT = process.env.PORT || 3000;
app.use(logger("dev"));

app.use(cors()); // https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS

app.use(express.json()); // Enable parsing JSON in requests and responses.
app.use(express.urlencoded({ extended: false })); // Also enable URL encoded request and responses.

app.use(express.static(path.join(__dirname, "../public")));

export default app;
