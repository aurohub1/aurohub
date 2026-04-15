'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';

interface News {
  title: string;
  image?: string | null;
  source?: string;
  url: string;
  id?: string;
}

export function NewsCard({ news }: { news: News[] }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (news.length <= 1) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % news.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [news.length]);

  if (!news.length) return null;

  const item = news[current];

  return (
    <div className="w-full max-w-2xl rounded-lg overflow-hidden bg-white shadow-sm">
      {item.image && (
        <div className="relative w-full h-48">
          <Image
            src={item.image}
            alt={item.title}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}
      <div className="p-3">
        <h3 className="text-sm font-bold line-clamp-2 mb-2">{item.title}</h3>
        <div className="flex justify-between items-center text-xs">
          <span className="text-blue-600 font-semibold uppercase">{item.source}</span>
          <a href={item.url} target="_blank" rel="noopener" className="text-blue-600 hover:underline">Leia →</a>
        </div>
      </div>
    </div>
  );
}
