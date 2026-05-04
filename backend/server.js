const express = require("express");
const cors = require("cors");
const db = require("./db")
const Groq = require('groq-sdk');

require("dotenv").config();

const API = express();
const PORT = 6767;

API.use(express.json());
API.use(cors());

// {{{{{{{{{{{{{{{{{{{ CHECK OLD PROMPTS }}}}}}}}}}}}}}}}}}} \\

async function delete_old_prompts() {
    try {
        const [res] = await db.query(
            "DELETE FROM bd_prompts WHERE promptDate < NOW() - INTERVAL 2 MONTH"
        );

        if (res.affectedRows > 1 || res.affectedRows === 0) {
            console.log(`[CLEANUP] Deleted ${res.affectedRows} old prompts.`)
        } else {
            console.log(`[CLEANUP] Deleted ${res.affectedRows} old prompt.`)
        }

    } catch(err) {
        console.error("[CLEANUP ERROR] An error occured while trying to cleanup old prompts: ",err.message);
    }
}

// {{{{{{{{{{{{{{{{{{{ AUTHENTICATION RELATED CODE }}}}}}}}}}}}}}}}}}} \\

// CRYPTOGRAPHY
const bcrypt = require("bcrypt");
const SALT__ROUNDS = 10;

const jwt = require("jsonwebtoken");
const { useImperativeHandle } = require("react");
const JWT_TKN = process.env.JWT_TOKEN;

function authorizeRole(...allowedRoles) {
    return (req, res, next) => {
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: "Forbidden" });
        }
        next();
    };
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
        return res.status(401).json({ error: "Access denied" });
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(token, JWT_TKN, (err, user) => {
        if (err) {
            return res.status(403).json({ error: "Invalid token" });
        }

        req.user = user;

        next();
    });
}

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
        const hashpass_isMatched = await bcrypt.compare(password, user.password);

        if (!hashpass_isMatched) {
            console.log("wrong password");
            return res.status(401).json({error: "Invalid password."})
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_TKN,
            { expiresIn: "2h" }
        )

        delete_old_prompts();

        return res.status(200).json({token, username: user.username, id: user.id})

    } catch(err) {
        return res.status(500).json({error: err.message});
    }
})

API.get("/me", authenticateToken, async (req,res)=>{
    try {
        const [rows] = await db.query(
            "SELECT id,username,role from bd_users WHERE id = ?",
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({error: "User not found."})
        }

        return res.json(rows[0]);

    } catch(err) {
        return res.status(500).json({error: err.message});
    }
})


// {{{{{{{{{{{{{{{{{{{ GROQ API WITH CHATPGT MODEL }}}}}}}}}}}}}}}}}}} \\

const __AI = new Groq({
    apiKey: process.env.GROQ_API_TOKEN
});
const GLOBAL_AI_MODEL=process.env.AI_MODEL

API.post("/ask-gpt", authenticateToken, async (req, res) => {
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

        const reply = completion.choices[0].message.content;

        const [result] = await db.query(
            "INSERT INTO bd_prompts (prompt, reply, userID, promptDATE) VALUES (?,?,?,NOW())",
            [prompt, reply, req.user.id]
        )

        return res.status(200).json({
            reply, prompt_Id: result.insertId
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            error: err.message
        });
    }
});

API.get("/prompts", authenticateToken, async (req,res)=>{
    try {
        const userID = req.user.id;

        const [result] = await db.query(
            "SELECT * FROM bd_prompts WHERE userID = ?",
            [userID]
        )

        if (result.length === 0) {
            return res.status(201).json({message: "OK : Empty Table"});
        }

        return res.status(200).json(result);

    } catch(err) {
        return res.status(500).json({error: err.message});
    }
})

API.get("/prompts/:id", authenticateToken, async (req,res)=>{
    try {
        const reqID = parseInt(req.params.id);
        const loggedUserID = req.user.id;

        if (isNaN(reqID)) {
            return res.status(400).json({error: "Invalid user ID"});
        }

        if (reqID !== loggedUserID) {
            return res.status(403).json({error: "Forbidden: You cannot access other users's prompts."});
        }

        const [prompt_rows] = await db.query(
            "SELECT * FROM bd_prompts WHERE userID = ?",
            [reqID]
        )

        if (prompt_rows.length === 0) {
            return res.status(404).json({error: "User not found or User does not have any prompts."});
        }

        return res.status(200).json(prompt_rows);

    } catch(err) {
        return res.status(500).json({error: err.message});
    }
})

API.post("/prompts", authenticateToken, async (req,res)=>{
    try {
        const { prompt, reply } = req.body;

        const userID = req.user.id;

        if (!prompt || !reply) {
            return res.status(400).json({error: "Missing Fields Contents (Empty 'prompt' or 'reply'."});
        }

        const [users] = await db.query(
            "SELECT * FROM bd_users WHERE id = ?",
            [userID]
        )

        if (users.length === 0) {
            return res.status(404).json({error: "User not found."})
        }

        const [result] = await db.query(
            "INSERT INTO bd_prompts (prompt, reply, userID, promptDATE) VALUES (?, ?, ?, NOW())",
            [prompt, reply, userID]
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
const rateLimit = require("express-rate-limit");

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20, // max 20 requests per IP
  message: { error: "Too many accounts created, try later." }
});

API.get("/users", authenticateToken, async (req,res)=>{
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

API.post("/users", registerLimiter, async (req,res)=>{
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                error: "Missing field 'username' and/or 'password' contents"
            })
        }
        
        const usernameRegex = /^[a-zA-Z0-9_.]+$/;

        if (!usernameRegex.test(username)) {
            return res.status(400).json({error: "[INVALID_FORMAT] Invalid username format."})
        }

        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({error: "[USRNM_INVALID] Username must be between 3-20 characters long."});
        }

        if (password.length < 6) {
            return res.status(400).json({error: "[PASS_INVALID] Password too short, must be at least 6 characters long."})
        }

        const hashed_pass = await bcrypt.hash(password, SALT__ROUNDS);

        const [result] = await db.query(
            "INSERT INTO bd_users (username, password, role) VALUES (?, ?, 'user')",
            [username, hashed_pass]
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

API.listen(PORT, async () => {
    console.log(`Running on ${PORT}`);
    await delete_old_prompts();
});