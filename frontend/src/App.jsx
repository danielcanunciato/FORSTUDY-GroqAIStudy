import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'
import './App.css'
import React from 'react';

/* =========================
   Memoized Message
========================= */
const Message = React.memo(({ prompt, userinfo, formatDate, promptID }) => {
  return (
    <div style={{ width: '100%', marginTop: '20px' }}>
      <div className='response-box'>
        <h2 style={{ textAlign: 'right', color: 'gray' }}>
          <b>
            <span style={{ fontSize: '16px' }}>
              <b>PROMPT ID:</b> {promptID}
            </span>{" "}
            | <b>GENERATED AT:</b> {formatDate(prompt.promptDate)}
          </b>
        </h2>

        <h2 style={{ textAlign: 'right', color: 'gold' }}>
          <b>{userinfo.username}</b>
        </h2>

        <p style={{ textAlign: 'right' }}>{prompt.prompt}</p>

        <h2 style={{ textAlign: 'left', color: 'cyan' }}>
          <b>AI</b>
        </h2>

        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {prompt.reply}
        </ReactMarkdown>
      </div>
      <hr />
    </div>
  );
});

/* =========================
   App
========================= */
function App() {
  const [changeLogScreen, setChangeLS] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [userinfo, setUserInfo] = useState({});
  const [prompt, setPrompt] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [responses, setResponses] = useState([]);

  const responsesContainerRef = useRef(null);

  /* =========================
     Helpers
  ========================= */
  function formatDate(dateValue) {
    if (!dateValue) return "—";

    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return "—";

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }

  function switchLoginScreen(bool) {
    setChangeLS(bool);
    setUsername("");
    setPassword("");
    setError("");
    setSuccess("");
  }

  /* =========================
     API
  ========================= */

  useEffect(()=>{
    async function auto_login() {
      // LOGIN AUTOMATICALLY
      const JWT_USER_TOKEN = localStorage.getItem("USERTOKEN");

      if (!JWT_USER_TOKEN) return;

      try {
        const res = await fetch("http://localhost:6767/me", {
          headers : {
            Authorization : `Bearer ${JWT_USER_TOKEN}`
          }
        });

        if (!res.ok) {
          // INVALID OR EXPIRED
          localStorage.removeItem("USERTOKEN");
          return;
        }

        const user = await res.json();

        setLoggedIn(true);
        setUserInfo(user);

        await handleLoadPrompts();

      } catch(err) {
        console.error(err);
      }
    }

    auto_login();
  }, [])

  async function handleLoadPrompts() {
    try {
      const res = await fetch("http://localhost:6767/prompts", {
        headers: {
          Authorization : `Bearer ${localStorage.getItem("USERTOKEN")}`
        }
      });

      if (!res.ok) throw new Error("Error while fetching prompts.");

      const data = await res.json();
      
      if (Array.isArray(data)) {
        setResponses(data);
      } else {
        setResponses([]);
      }

    } catch (err) { 
      console.error(err);
    }
  }

  async function handleLogin(ev) {
    
    if (ev) {
      ev.preventDefault();
    }

    try {
      const res = await fetch("http://localhost:6767/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("USERTOKEN", data.token);
        
        setLoggedIn(true);
        setUserInfo(data);
        setError("");

        handleLoadPrompts();

      } else {
        setError(data.error || "Something went wrong.");
      }

    } catch (err) {
      console.error(err);
    }
  }

  async function handleRegister(ev) {
    ev.preventDefault();

    try {
      const res = await fetch("http://localhost:6767/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        setChangeLS(false);
        setError("");
        setSuccess("Account created successfully.");
        setUsername("");
        setPassword("");

      } else {
        setError(data.error || "Something went wrong.");
      }

    } catch (err) {
      console.error(err);
      setError('Network error. Please try again');
    }
  }

  async function askAI(e) {
    e.preventDefault();

    if (!prompt.trim()) {
      setError("Please enter your prompt.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const USERTOKEN=localStorage.getItem("USERTOKEN")

      const res = await fetch("http://localhost:6767/ask-gpt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization" : `Bearer ${USERTOKEN}`
        },
        body: JSON.stringify({ prompt })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Request failed.");

      const newPrompt = {
        prompt_id: data.prompt_id,
        prompt,
        reply: data.reply,
        promptDate: new Date().toISOString()
      };

      setResponses(prev => [...prev, newPrompt]);
      setPrompt("");

      await handleLoadPrompts();

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("USERTOKEN");
    setLoggedIn(false);
    setUserInfo({});
    setResponses([]);
    setUsername("");
    setPassword("");
    setSuccess("Logged out successfully.");
  }

  /* =========================
     Auto Scroll
  ========================= */
  useEffect(() => {
    const container = responsesContainerRef.current;

    if (!container) return;

    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }, [responses]);

  const visibleResponses = responses.slice(-30);

  return (
    <>
      <h1>GROQ API TEST (OPENAI MODEL)</h1>
      <p>Prompts older than 2 months are automatically removed from the database.</p>

      <div>
        {loggedIn ? (
          <div>

            <form className="input-group" onSubmit={askAI}>
              <p style={{ marginBottom: "20px" }}>
                Logged in as: <b>{userinfo.username}</b>
              </p>

              <textarea
                id="input-prompt"
                placeholder="Type out your prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                style={{ resize: 'none' }}
              />

              <button
                className="submit-btn"
                type="submit"
                disabled={loading}
              >
                {loading ? "Loading..." : "Submit Prompt"}
              </button>

              {error && (
                <p className="error-message" style={{ color: 'red', marginTop: '20px' }}>
                  {error}
                </p>
              )}
            </form>

            <button onClick={handleLogout} className="logout-btn">
              Logout from <b>{userinfo.username}</b>
            </button>

            <div
              ref={responsesContainerRef}
              style={{
                maxHeight: "500px",
                overflowY: "auto",
                border: "2px solid gray",
                padding: "20px",
                marginTop: "20px",
                marginBottom: "20px",
                width: '90vw'
              }}
            >
              {
                responses.length > 0 ? (
                  visibleResponses.map((prompt, index) => (
                    <Message
                      key={prompt.prompt_id || index}
                      prompt={prompt}
                      userinfo={userinfo}
                      formatDate={formatDate}
                      promptID={prompt.prompt_id ?? "-"}
                    />
                  ))
                ) : (
                  <p>No history of prompts.</p>
                )
              }
            </div>

          </div>
        ) : (
          changeLogScreen === false ? (
            <div className='prompt-container' style={{ marginTop: '40px', filter: 'drop-shadow(0 0 10px gray)' }}>
              <h1>LOGIN</h1>

              {success && (
                <p className="error-message" style={{ color: 'lime'}}>
                  {success}
                </p>
              )}

               {error && (
                <p className="error-message" style={{ color: 'red'}}>
                  {error}
                </p>
              )}

              <form className='input-group' onSubmit={handleLogin}>
                <label>USERNAME</label>
                <p style={{fontSize: '12px'}}>username cannot be over 20 characters long</p>
                <input value={username} maxLength={20} onChange={(e) => setUsername(e.target.value)} />

                <label style={{marginTop: '20px'}}>PASSWORD</label>
                <p style={{fontSize: '12px'}}>password must be at least 6 characters long</p>
                <input type="password" maxLength={12} value={password} onChange={(e) => setPassword(e.target.value)} />
                <button className='login-btn'>Log In</button>
              </form>

              <div className="extra-links">
                <p onClick={() => {switchLoginScreen(true)}}>Create Account</p>
              </div>
            </div>
            
          ) : (

            <div className='prompt-container' style={{ marginTop: '40px', filter: 'drop-shadow(0 0 10px gray)' }}>
              <h1>REGISTER ACCOUNT</h1>

              {error && (
                <p className="error-message" style={{ color: 'red'}}>
                  {error}
                </p>
              )}

              <form className='input-group' onSubmit={handleRegister}>
                <label>USERNAME</label>
                <p style={{fontSize: '12px'}}>username cannot be over 20 characters long</p>
                <input value={username} maxLength={20} onChange={(e) => setUsername(e.target.value)} />

                <label style={{marginTop: '20px'}}>PASSWORD</label>
                <p style={{fontSize: '12px'}}>password must be at least 6 characters long</p>
                <input type="password" maxLength={12} value={password} onChange={(e) => setPassword(e.target.value)} />
                <button className='login-btn'>Create Account</button>
              </form>

              <div className="extra-links">
                <p onClick={() => {switchLoginScreen(false)}}>Already have account?</p>
              </div>
            </div>
          )
        )}
      </div>
    </>
  );
}

export default App;