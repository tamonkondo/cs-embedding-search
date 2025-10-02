type HighlightPart = {
  text: string;
  match: boolean;
  key: string;
};

export function highlightParts(text: string, query: string): HighlightPart[] {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [{ text, match: false, key: "0" }];
  }

  const escaped = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matcher = new RegExp(escaped, "ig");
  const parts: HighlightPart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null = matcher.exec(text);

  while (match !== null) {
    const start = match.index;
    const end = matcher.lastIndex;
    if (start > lastIndex) {
      parts.push({
        text: text.slice(lastIndex, start),
        match: false,
        key: `${lastIndex}-${start}`,
      });
    }

    parts.push({
      text: match[0] ?? "",
      match: true,
      key: `${start}-${end}`,
    });

    lastIndex = end;
    match = matcher.exec(text);
  }

  if (lastIndex < text.length) {
    parts.push({
      text: text.slice(lastIndex),
      match: false,
      key: `${lastIndex}-${text.length}`,
    });
  }

  return parts.length > 0 ? parts : [{ text, match: false, key: "0" }];
}
