import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown';
import './App.css'
import React from 'react';

function App() {
  const [changeLogScreen, setChangeLS] = useState(false);

  const [loggedIn, setLoggedIn] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [userinfo, setUserInfo] = useState({})

  const [prompt, setPrompt] = useState("");

  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [responses, setResponses] = useState([]);

  function formatDate(dateValue) {
      const date = new Date(dateValue);

      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();

      return `${day}/${month}/${year}`;
  }

  async function handleSavePrompts(getPrompt, getReply) {
    try {
      setError("");

      const res = await fetch("http://localhost:6767/prompts", {
        method: "POST",
        headers: {
          "Content-Type" : "application/json"
        },
        body: JSON.stringify({
          prompt: getPrompt,
          reply: getReply,
          userid: userinfo.id
        })
      })

    } catch(err) {
      setError(err);
      return console.error(err);
    }
  }

  async function handleLoadPrompts(get_userid) {
    try {
      fetch(`http://localhost:6767/prompts/${get_userid}`)
      .then(res=>{
        if (res.status === 404) {
          return [];
        }

        if (!res.ok) {
          throw new Error("Error while fetching prompts.")
        }

        return res.json();
      })
      .then(data=>{
        setResponses(data);
      })
      .catch(err=>console.error(err));

    } catch(err) {
      setError(err);
      return console.error(err);
    }
  }

  async function handleRegister(ev) {
    ev.preventDefault();

    try {
      setError("");

      const res = await fetch("http://localhost:6767/users", {
        method: "POST",
        headers: {
          "Content-Type" : "application/json"
        },
        body: JSON.stringify({
          username: username,
          password: password,
        })
      })

      const data = await res.json();

      if (res.ok) {
        setChangeLS(false)
        setSuccess("Account created successfully, log in with the credentials.")

        setUsername("");
        setPassword("");

      } else {
        if (res.status === 409) {
          setError("User with that name already exists.")
        }
      }

    } catch(err) {
      setError(err);
      console.error(err);
    }
  }

  async function handleLogin(ev) {
    ev.preventDefault();

    try {
      const res = await fetch("http://localhost:6767/login", {
        method: "POST",
        headers: {
          "Content-Type" : "application/json"
        },
        body: JSON.stringify({
          username: username,
          password: password,
        })
      })

      const data = await res.json();

      if (res.ok) {
        setTimeout(()=>{setLoggedIn(true)}, 1000)
        setUserInfo(data);
        setError("");

        if (data.id) {
          handleLoadPrompts(data.id);
        }
      } else {
        setError("Wrong username or password.")
      }

    } catch(err) {
      console.error(err);
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
      setReply("");

      const res = await fetch("http://localhost:6767/ask-gpt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: prompt
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Request failed.");
      }

      setReply(data.reply);
      const newPrompt = {id:responses.length, reply: data.reply, prompt: prompt};
      setResponses((prev)=> [...prev, newPrompt])

      handleSavePrompts(newPrompt.prompt, newPrompt.reply)

    } catch(err) {
      setError(err.message);

    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{
    if (loggedIn) {
      handleLoadPrompts(userinfo.id);
    }
  }, [responses])

  return (
    <>
      <h1>GROQ API TEST (OPENAI MODEL)</h1>

      {
        loggedIn ? (
            <div>
              <form className="input-group" onSubmit={askAI}>
                <p style={{marginBottom: "20px"}}>Logged in as: <b>{userinfo.username}</b></p>

                <input
                    id="input-prompt"
                    type="text"
                    placeholder="Type out your prompt"
                    value={prompt}
                    onChange={(e) => {
                        setPrompt(e.target.value); 
                      }
                    }
                />

                <button
                    className="submit-btn"
                    type="submit"
                    disabled={loading}
                >
                    {loading ? "Loading..." : "Submit Prompt"}
                </button>
            </form>

            {error && (
                <p className="error-message">
                    {error}
                </p>
            )}

            {(responses) && (
                responses.map((prompt, index)=>(
                  <div style={{width: '100%', marginTop: '20px'}}  key={`PROMPT::${prompt.prompt}::INDEX::${index}`}>
                    <div className='response-box'>
                        <h2 style={{textAlign: 'right', color: 'gray'}}><b><span style={{color: 'gray', fontSize: '16px'}}><b>PROMPT ID:</b> {prompt.prompt_id}</span> | <b>GENERATED AT:</b> {formatDate(prompt.promptDate)}</b></h2>

                        <h2 style={{textAlign: 'right', color: 'gold'}}><b><span style={{color: 'gray', fontSize: '16px'}}><b>ID:</b> {prompt.userID}</span> USER PROMPT</b></h2>
                        <p style={{textAlign: 'right'}}>
                          {prompt.prompt}
                        </p>

                        <h2 style={{textAlign: 'left', color: 'cyan'}}><b>AI</b></h2>
                        <ReactMarkdown>
                          {prompt.reply}
                        </ReactMarkdown>
                    </div>
                    <hr />
                  </div>
                ))
            )}
          </div>
        ) : (
          changeLogScreen === false ? (
            <div className='prompt-container' style={{marginTop: '40px', filter: 'drop-shadow(0 0 10px gray)'}}>
              <h1>LOGIN</h1>
              <p>You must be logged in to run the prompts.</p>

                {success && (
                    <p className="error-message" style={{fontSize: '16px', color: 'green'}}>
                        {success}
                    </p>
                )}

               {error && (
                    <p className="error-message" style={{fontSize: '16px', color: 'red'}}>
                        {error}
                    </p>
                )}

              <form className='input-group' onSubmit={handleLogin}>
                  <div>
                    <label>USERNAME</label>
                    <p style={{fontSize: '12px'}}>username cannot be over 20 characters long</p>
                    <input 
                      placeholder='Username' 
                      type="text" 
                      maxLength={20} 
                      value={username}
                      onChange={(e)=>setUsername(e.target.value)}
                      required
                    />
                  </div>

                  <hr />

                  <div>
                    <label>PASSWORD</label>
                    <p style={{fontSize: '12px'}}>password cannot be over 12 characters long</p>
                    <input
                      placeholder='Password'
                      type="password" 
                      maxLength={12}
                      value={password}
                      onChange={(e)=>setPassword(e.target.value)}
                      required
                    />
                  </div>

                  <button type="submit" className='login-btn'>Log In</button>

                  <div className="extra-links"> <p onClick={()=>{setChangeLS(true); setUsername(""); setPassword("")}}>Create Account</p> </div>

              </form>
            </div>
          ) : (
            <div className='prompt-container' style={{marginTop: '40px', filter: 'drop-shadow(0 0 10px gray)'}}>
              <h1 style={{lineHeight: '1'}}>REGISTER ACCOUNT</h1>
              <p>You must be logged in to run the prompts.</p>

              {error && (
                <p className="error-message" style={{fontSize: '16px', color: 'red'}}>
                      {error}
                  </p>
              )}

              <form className='input-group' onSubmit={handleRegister}>
                  <div>
                    <label>USERNAME</label>
                    <p style={{fontSize: '12px'}}>username cannot be over 20 characters long</p>
                    <input 
                      placeholder='Username' 
                      type="text" 
                      maxLength={20} 
                      value={username}
                      onChange={(e)=>setUsername(e.target.value)}
                      required
                    />
                  </div>

                  <hr />

                  <div>
                    <label>PASSWORD</label>
                    <p style={{fontSize: '12px'}}>password cannot be over 12 characters long</p>
                    <input
                      placeholder='Password'
                      type="password" 
                      maxLength={12}
                      value={password}
                      onChange={(e)=>setPassword(e.target.value)}
                      required
                    />
                  </div>

                  <button type="submit" className='login-btn'>Create Account</button>

                  <div className="extra-links"> <p onClick={()=>{setChangeLS(false); setUsername(""); setPassword("")}}>Already have account?</p> </div>

              </form>
            </div>
          )
        )
      }
      
  </>
  )
}

export default App
