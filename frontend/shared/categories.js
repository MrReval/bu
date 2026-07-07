/** آیکون دسته‌بندی خدمات در وبسایت */
export const CATEGORY_ICONS = {
  ناخن: '💅',
  مو: '💇‍♀️',
  پوست: '✨',
  'میک آپ': '💄',
  مژه: '👁️',
  اصلاح: '✨',
  میکروبلیدینگ: '🖊️',
};

export function getCategoryIcon(name) {
  return CATEGORY_ICONS[name] || '🎀';
}
