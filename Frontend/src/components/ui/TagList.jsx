export default function TagList({ items = [], empty = "Nothing added yet." }) {
  if (!items.length) return <p className="muted">{empty}</p>;
  return (
    <ul className="taglist">
      {items.map((item) => (
        <li className="tag" key={item}>{item}</li>
      ))}
    </ul>
  );
}
