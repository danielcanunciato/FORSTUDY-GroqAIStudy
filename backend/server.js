const express = require("express");
const cors = require("cors");
const db = require("./db")
const Groq = require('groq-sdk');

require("dotenv").config();

const API = express();
const PORT = 6767;

API.use(express.json());
API.use(cors());

// {{{{{{{{{{{{{{{{{{{ GROQ API WITH CHATPGT MODEL }}}}}}}}}}}}}}}}}}} \\
const __AI = new Groq({
    apiKey: process.env.GROQ_API_TEST
});
const GLOBAL_AI_MODEL="openai/gpt-oss-20b"

API.post("/ask-gpt", async (req, res) => {
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
                    content: "You are a general assistant, which means you can say anything."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 1
        });

        return res.status(200).json({
            reply: completion.choices[0].message.content
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            error: err.message
        });
    }
});

API.get("/prompts", async (req,res)=>{
    try {
        const [result] = await db.query(
            "SELECT * FROM bd_prompts"
        )

        if (result.length === 0) {
            return res.status(201).json({message: "OK : Empty Table"});
        }

        return res.status(200).json(result);

    } catch(err) {
        return res.status(500).json({error: err.message});
    }
})

API.get("/prompts/:id", async (req,res)=>{
    try {
        const user_id = req.params.id;

        const [prompt_rows] = await db.query(
            "SELECT * FROM bd_prompts WHERE userID = ?",
            [user_id]
        )

        if (prompt_rows.length === 0) {
            return res.status(404).json({error: "User not found or User does not have any prompts."});
        }

        return res.status(200).json(prompt_rows);

    } catch(err) {
        return res.status(500).json({error: err.message});
    }
})

API.post("/prompts", async (req,res)=>{
    try {
        const { prompt, reply, userid } = req.body;

        if (!prompt || !reply || !userid) {
            return res.status(400).json({error: "Missing Fields Contents (Empty 'prompt', 'reply', or 'userid'."});
        }

        const [users] = await db.query(
            "SELECT * FROM bd_users WHERE id = ?",
            [userid]
        )

        if (users.length === 0) {
            return res.status(404).json({error: "User not found."})
        }

        const [result] = await db.query(
            "INSERT INTO bd_prompts (prompt, reply, userID, promptDATE) VALUES (?, ?, ?, NOW())",
            [prompt, reply, userid]
        )

        res.status(201).json({
            message: "Saved user prompt successfully.",
            prompt_id: result.insertId
        })

    } catch(err) {
        return res.status(500).json({error: err.message});
    }
})

// {{{{{{{{{{{{{{{{{{{ DATABASE RELATED CODE }}}}}}}}}}}}}}}}}}} \\
API.post("/login", async (req,res)=>{
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({error: "Missing login credentials"});
        }

        const [rows] = await db.query(
            "SELECT * FROM bd_users WHERE username = ?",
            [username]
        )

        if (rows.length === 0) {
            return res.status(404).json({error: "User not found."})
        }

        const user = rows[0];

        if (user.password !== password) {
            return res.status(401).json({error: "Invalid Password"});
        }

        return res.status(200).json({id: user.id, username: user.username})

    } catch(err) {
        return res.status(500).json({error: err.message});
    }
})

API.get("/users", async (req,res)=>{
    try {
        const [rows] = await db.query(
            "SELECT * FROM bd_users"
        )

        if (rows.length === 0) {
            return res.status(204).json({message: "Success but table is empty."})
        }

        res.status(200).json(rows)
        
    } catch(err) {
        return res.status(500).json({error: err.message});
    }
})

API.post("/users", async (req,res)=>{
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                error: "Missing field 'username' and/or 'password' contents"
            })
        }

        const [result] = await db.query(
            "INSERT INTO bd_users (username, password) VALUES (?, ?)",
            [username, password]
        );

        res.status(201).json({
            message: "User created successfully",
            id: result.insertId
        })
        

    } catch(err) {
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({error: "User with that name already exists."});
        } else {
            return res.status(500).json({error: err.message});
        }
    }
})

// {{{{{{{{{{{{{{{{{{{ LISTEN TO PORT }}}}}}}}}}}}}}}}}}} \\

API.listen(PORT, () => {
    console.log(`Running on ${PORT}`);
});