"use client";

import { useState, useRef } from "react";

export default function Home() {
  const [tab, setTab] = useState<"url" | "text">("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Article state
  const [article, setArticle] = useState<{
    title: string;
    content: string;
  } | null>(null);

  const articleRef = useRef<HTMLDivElement>(null);

  function textToHtml(raw: string): { title: string; content: string } {
    const lines = raw.split("\n").filter((l) => l.trim());
    const title = lines[0] || "Untitled";
    const bodyLines = lines.slice(1);
    const content = bodyLines.map((l) => `<p>${escapeHtml(l.trim())}</p>`).join("\n");
    return { title, content };
  }

  function escapeHtml(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setArticle(null);

    if (tab === "url") {
      if (!url.trim()) {
        setError("Please enter a URL.");
        return;
      }
      setLoading(true);
      try {
        const res = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim() }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to extract article.");
        } else {
          setArticle({ title: data.title, content: data.content });
        }
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    } else {
      if (!text.trim()) {
        setError("Please paste some text.");
        return;
      }
      const result = textToHtml(text.trim());
      setArticle(result);
    }
  }

  function handlePrint() {
    window.print();
  }

  function handleBack() {
    setArticle(null);
    setError("");
  }

  // ---- Article Preview ----
  if (article) {
    return (
      <>
        <div className="toolbar">
          <button onClick={handleBack}>&larr; New Article</button>
          <button onClick={handlePrint}>Save as PDF / Print</button>
        </div>
        <div className="article" ref={articleRef}>
          <h1 className="article-title">{article.title}</h1>
          <div
            className="article-body"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </div>
      </>
    );
  }

  // ---- Input Form ----
  return (
    <div className="input-page">
      <div className="container">
        <h1 className="page-title">Article Formatter</h1>
        <p className="subtitle">Paste a URL or text, get a book-style printable article.</p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="tab-row">
            <button
              type="button"
              className={`tab ${tab === "url" ? "active" : ""}`}
              onClick={() => { setTab("url"); setText(""); }}
            >
              From URL
            </button>
            <button
              type="button"
              className={`tab ${tab === "text" ? "active" : ""}`}
              onClick={() => { setTab("text"); setUrl(""); }}
            >
              Paste Text
            </button>
          </div>

          <div className="input-area">
            {tab === "url" ? (
              <div>
                <label htmlFor="url">Article URL</label>
                <input
                  type="text"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/article"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="text">Article Text</label>
                <textarea
                  id="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste the full article text here. The first line will be used as the title."
                />
              </div>
            )}

            <button type="submit" className="btn" disabled={loading}>
              {loading ? "Extracting..." : "Format Article"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
