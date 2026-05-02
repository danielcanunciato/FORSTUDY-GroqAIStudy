const express = require("express");
const cors = require("cors");
const Groq = require('groq-sdk');

require("dotenv").config();

const API = express();
const PORT = 6767;

API.use(express.json());
API.use(cors());

const __AI = new Groq({
    apiKey: process.env.GROQ_API_TEST
});
const GLOBAL_AI_MODEL="openai/gpt-oss-20b"

API.post("/ai-test", async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({
                error: "Prompt is required."
            });
        }

        const completion = await __AI.chat.completions.create({
            model: GLOBAL_AI_MODEL,
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.2
        });

        return res.json({
            reply: completion.choices[0].message.content
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            error: err.message
        });
    }
});

API.listen(PORT, () => {
    console.log(`Running on ${PORT}`);
});