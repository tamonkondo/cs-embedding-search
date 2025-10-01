import React from "react";
import type { SearchDoc } from "@/types/search";
import { highlight } from "@/lib/highlight";

interface Props {
  doc: SearchDoc;
  query: string;
}

export default function ResultItem({ doc, query }: Props) {
  return (
    <li className="p-4 hover:bg-gray-50 cursor-pointer group">
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
          {doc.source_type}
        </span>
        <span>{doc.product}</span>
        <span>•</span>
        <span>{new Date(doc.updated_at).toLocaleString()}</span>
      </div>
      <h3 className="font-medium leading-tight" dangerouslySetInnerHTML={{ __html: highlight(doc.title, query) }} />
      <p
        className="text-sm text-gray-600 mt-1 line-clamp-2"
        dangerouslySetInnerHTML={{ __html: highlight(doc.body, query) }}
      />
    </li>
  );
}
