import './memory-gem-tier.css';

/** The number stays visible so quality never depends on color alone. */
export function MemoryGemTier({ tier }: { tier: number }) {
  return <span className={`memory-gem-tier memory-gem-tier--${tier}`} data-tier={tier} aria-label={`Tier ${tier}`}><i aria-hidden="true" />T{tier}</span>;
}
