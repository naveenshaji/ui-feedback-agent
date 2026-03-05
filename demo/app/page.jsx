import { DevFeedbackOverlay } from "./dev-feedback-overlay";

const cards = [
  {
    title: "Hero Header",
    detail: "Try changing typography scale, spacing rhythm, or CTA alignment.",
    cta: "Edit hero"
  },
  {
    title: "Feature Card",
    detail: "Annotate icon treatment, card density, and hover behavior.",
    cta: "Edit card"
  },
  {
    title: "Pricing Block",
    detail: "Request copy changes or pricing layout improvements.",
    cta: "Edit pricing"
  }
];

export default function Page() {
  return (
    <main className="page-shell">
      <header className="hero" data-testid="demo-hero">
        <p className="eyebrow">UI Feedback Agent Demo</p>
        <h1>Pick any element, add feedback, and export one prompt.</h1>
        <p className="hero-sub">
          Open the overlay with <strong>Cmd/Ctrl + Shift + U</strong>, click <strong>Pick Element</strong>, and
          capture multiple requests in one pass.
        </p>
        <div className="hero-actions">
          <button className="primary">Primary CTA</button>
          <button className="secondary">Secondary CTA</button>
        </div>
      </header>

      <section className="grid" aria-label="demo sections">
        {cards.map((card) => (
          <article className="card" key={card.title} data-testid={`card-${card.title.toLowerCase().replace(/\s+/g, "-")}`}>
            <h2>{card.title}</h2>
            <p>{card.detail}</p>
            <button className="ghost">{card.cta}</button>
          </article>
        ))}
      </section>

      <section className="notes" data-testid="demo-notes">
        <h3>Rapid screenshot target</h3>
        <p>
          This page is intentionally simple and stable so you can capture before/after screenshots quickly while
          iterating on overlay behavior.
        </p>
      </section>

      {process.env.NODE_ENV === "development" ? <DevFeedbackOverlay /> : null}
    </main>
  );
}
