// Static examples only. No API calls, personalization or registration actions.
const recommendations = [
  { title: "Beach cleanup", category: "Environment", hours: 2, reason: "Make a visible difference with a short outdoor activity." },
  { title: "Teach a child", category: "Education", hours: 3, reason: "Share your knowledge and help a student practise." },
  { title: "Community food drive", category: "Community", hours: 2, reason: "Help sort and distribute essential supplies." },
];

export default function DemoRecommendations() {
  return <section aria-labelledby="recommendations-title">
    <h2 id="recommendations-title">Ideas for your next contribution</h2>
    <p className="muted">Demo recommendations · Static examples, not live events or personalized suggestions.</p>
    <div className="recommendation-grid">{recommendations.map(item =>
      <article className="impact-card" key={item.title}>
        <small>{item.category}</small><h3>{item.title}</h3>
        <p>{item.reason}</p><strong>{item.hours} hours · {item.hours * 10} potential points</strong>
      </article>
    )}</div>
  </section>;
}
