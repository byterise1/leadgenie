type Block = { type: 'p' | 'ul'; lines: string[] };

function toBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const isBullet = line.startsWith('• ');
    const text = isBullet ? line.slice(2) : line;
    const last = blocks[blocks.length - 1];
    if (isBullet && last?.type === 'ul') {
      last.lines.push(text);
    } else if (isBullet) {
      blocks.push({ type: 'ul', lines: [text] });
    } else {
      blocks.push({ type: 'p', lines: [text] });
    }
  }
  return blocks;
}

export function LegalContent({ content }: { content: string }) {
  return (
    <div className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed space-y-3">
      {toBlocks(content).map((block, i) =>
        block.type === 'ul' ? (
          <ul key={i} className="space-y-2">
            {block.lines.map((line, j) => (
              <li key={j} className="flex items-start gap-2">
                <span className="text-blue-500 mt-1.5 text-[10px] leading-none">●</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>{block.lines.join(' ')}</p>
        )
      )}
    </div>
  );
}
