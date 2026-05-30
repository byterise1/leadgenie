'use client';

import { motion } from 'framer-motion';

interface TestimonialCardProps {
  quote: string;
  name: string;
  title: string;
  brand: string;
}

export function TestimonialCard({ quote, name, title, brand }: TestimonialCardProps) {
  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 240, damping: 20 }}
      className="card-surface relative overflow-hidden rounded-[28px] border border-slate-200/80 p-8 text-slate-900"
    >
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-slate-950/5 to-transparent" />
      <p className="relative text-base leading-8 text-slate-800">“{quote}”</p>
      <div className="relative mt-8 flex flex-col gap-1">
        <span className="text-sm font-semibold text-slate-950">{name}</span>
        <span className="text-sm text-slate-500">{title} · {brand}</span>
      </div>
    </motion.article>
  );
}
