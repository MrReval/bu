import {
  Sparkles,
  Scissors,
  Hand,
  Eye,
  Paintbrush,
  Flower2,
  PenLine,
} from 'lucide-react';

const MAP = {
  ناخن: Hand,
  مو: Scissors,
  پوست: Sparkles,
  'میک آپ': Paintbrush,
  مژه: Eye,
  اصلاح: Flower2,
  میکروبلیدینگ: PenLine,
};

export function getCategoryIconComponent(name) {
  return MAP[name] || Sparkles;
}
