import { useState } from 'react'
import ReactMarkdown from 'react-markdown';
import './App.css'
import React from 'react';

function App() {
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
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

      const res = await fetch("http://localhost:6767/ai-test", {
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

    } catch(err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1>AI Prompt Test</h1>

      <form className="input-group" onSubmit={askAI}>
          <input
              id="input-prompt"
              type="text"
              placeholder="Type out your prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
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

      {reply && (
          <div className="response-box">
              <h2>AI Response</h2>
              <p>
                <ReactMarkdown>
                  {reply}
                </ReactMarkdown>
              </p>
          </div>
      )}
  </>
  )
}

export default App
