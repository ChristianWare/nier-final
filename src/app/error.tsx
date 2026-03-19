"use client";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
      <h2>Something went wrong</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
