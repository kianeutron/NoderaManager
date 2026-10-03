"use client";

/** The last resort, for a failure in the root layout itself, where the theme and providers do not exist yet. Plain styles on purpose. */
export default function RootError({ error, reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <html lang="en">
      <body style={{ alignItems: "center", background: "#0b1020", color: "#e8ecf6", display: "flex", fontFamily: "system-ui, sans-serif", justifyContent: "center", margin: 0, minHeight: "100vh", padding: 24 }}>
        <div role="alert" style={{ maxWidth: 480, textAlign: "center" }}>
          <h1 style={{ fontSize: 24 }}>The workspace could not load</h1>
          <p style={{ opacity: 0.75 }}>No data has been changed. Try again in a moment.</p>
          {error.digest ? <p style={{ fontSize: 12, opacity: 0.6 }}>Reference: {error.digest}</p> : null}
          <button onClick={reset} style={{ background: "#6d8bff", border: 0, borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 16, padding: "10px 20px" }} type="button">Try again</button>
        </div>
      </body>
    </html>
  );
}
