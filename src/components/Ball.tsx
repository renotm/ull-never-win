import type { Pool } from '../games/types';

interface Props {
  pool: Pool;
  value: number;
  selected?: boolean;
  highlight?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  delay?: number;
  animate?: boolean;
}

export function ballText(pool: Pool, value: number): string {
  return pool.symbols ? pool.symbols[value - 1] : String(value);
}

export function Ball({ pool, value, selected, highlight, size = 'md', onClick, disabled, delay, animate }: Props) {
  const cls = [
    'ball',
    `ball--${pool.ballStyle}`,
    `ball--${size}`,
    selected ? 'is-selected' : '',
    highlight ? 'is-highlight' : '',
    animate ? 'is-animated' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const text = ballText(pool, value);
  if (onClick) {
    return (
      <button type="button" className={cls} onClick={onClick} disabled={disabled} aria-pressed={selected}>
        {text}
      </button>
    );
  }
  return (
    <span className={cls} style={delay !== undefined ? { animationDelay: `${delay}ms` } : undefined}>
      {text}
    </span>
  );
}
