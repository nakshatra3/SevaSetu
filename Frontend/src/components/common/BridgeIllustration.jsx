// "Setu" means bridge: people on one bank, causes on the other.
export default function BridgeIllustration() {
  return (
    <svg className="bridge" viewBox="0 0 480 260" role="img" aria-label="A bridge connecting two river banks at sunrise">
      <circle cx="240" cy="120" r="46" fill="#F2A93B" />
      <path d="M0 190h480v70H0z" fill="#0A2B31" />
      <path d="M0 190q60-26 120 0v70H0zM360 190q60-26 120 0v70H360z" fill="#1B7F79" />
      <path d="M96 190a144 144 0 0 1 288 0" fill="none" stroke="#F4F7F6" strokeWidth="10" strokeLinecap="round" />
      <path d="M96 190h288" stroke="#F4F7F6" strokeWidth="10" strokeLinecap="round" />
      {[150, 195, 240, 285, 330].map((x) => (
        <path key={x} d={`M${x} 190V${190 - Math.sqrt(144 * 144 - (x - 240) ** 2)}`} stroke="#F4F7F6" strokeWidth="3" opacity=".7" />
      ))}
      <path d="M20 226h120M170 238h140M340 226h120" stroke="#F4F7F6" strokeWidth="3" strokeLinecap="round" opacity=".35" />
    </svg>
  );
}
