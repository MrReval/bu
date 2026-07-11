/** کمک‌تابع‌های قالب عمودی برای فرانت */
export const VERTICAL_DEFAULTS = {
  beauty_salon: {
    eyebrow: 'سالن زیبایی لوکس',
    stats: [
      { n: '۵۰۰+', l: 'مشتری راضی' },
      { n: '۱۰+', l: 'سال تجربه' },
      { n: '۱۵+', l: 'خدمت تخصصی' },
    ],
    features: [
      { title: 'کیفیت برتر', desc: 'استفاده از بهترین مواد و تکنیک‌های روز' },
      { title: 'رزرو آسان', desc: 'نوبت‌دهی آنلاین ۲۴ ساعته' },
      { title: 'محیط حرفه‌ای', desc: 'فضایی تمیز و آرام برای آرامش شما' },
    ],
    testimonials: [
      { name: 'سارا م.', text: 'خدمات عالی و برخورد حرفه‌ای. حتماً دوباره میام.', stars: 5 },
      { name: 'نیلوفر ک.', text: 'نتیجه کار فوق‌العاده بود. پیشنهاد می‌کنم.', stars: 5 },
      { name: 'مریم ر.', text: 'رزرو آنلاین راحت بود و سر وقت نوبتم را گرفتند.', stars: 5 },
    ],
    services_fallback: 'خدمات تخصصی زیبایی',
    services_sub: 'با بهترین کیفیت و جدیدترین متدها',
    about_fallback: 'ما با تیمی متخصص، تجربه‌ای خاص از زیبایی و مراقبت را برای شما فراهم می‌کنیم.',
    cta_title: 'آماده‌اید زیباتر شوید؟',
    cta_sub: 'اولین نوبت خود را آنلاین رزرو کنید.',
    footer_tagline: 'زیبایی شما، تخصص ما',
  },
  dental_clinic: {
    eyebrow: 'کلینیک دندان‌پزشکی',
    stats: [
      { n: '۳۰۰۰+', l: 'بیمار راضی' },
      { n: '۱۲+', l: 'سال تجربه' },
      { n: '۸+', l: 'خدمت تخصصی' },
    ],
    features: [
      { title: 'تجهیزات مدرن', desc: 'تشخیص و درمان با استاندارد روز' },
      { title: 'نوبت آنلاین', desc: 'بدون انتظار پشت تلفن نوبت بگیرید' },
      { title: 'مراقبت تخصصی', desc: 'تیم دندان‌پزشکی مجرب و دلسوز' },
    ],
    testimonials: [
      { name: 'علی ر.', text: 'ویزیت مرتب و بدون درد بود. محیط کلینیک خیلی تمیز است.', stars: 5 },
      { name: 'مینا ش.', text: 'نوبت‌گیری آنلاین عالی بود و وقت دقیقاً رعایت شد.', stars: 5 },
      { name: 'رضا ک.', text: 'توضیحات پزشک کامل بود و خیالم راحت شد.', stars: 5 },
    ],
    services_fallback: 'خدمات دندان‌پزشکی',
    services_sub: 'از معاینه تا درمان‌های تخصصی',
    about_fallback: 'کلینیک ما با تمرکز بر سلامت دهان و دندان، خدمات تخصصی را در محیطی آرام ارائه می‌دهد.',
    cta_title: 'لبخند سالم را از همین امروز شروع کنید',
    cta_sub: 'نوبت معاینه یا درمان خود را آنلاین رزرو کنید.',
    footer_tagline: 'لبخند سالم، اعتماد شما',
  },
  medical_practice: {
    eyebrow: 'مطب پزشکی',
    stats: [
      { n: '۲۰۰۰+', l: 'بیمار' },
      { n: '۸+', l: 'سال فعالیت' },
      { n: '۴+', l: 'نوع ویزیت' },
    ],
    features: [
      { title: 'نوبت منظم', desc: 'زمان‌بندی دقیق بدون اتلاف وقت' },
      { title: 'مراقبت شخصی', desc: 'توجه به شرایط هر بیمار' },
      { title: 'دسترسی آسان', desc: 'رزرو آنلاین در هر ساعت از شبانه‌روز' },
    ],
    testimonials: [
      { name: 'نگار م.', text: 'نوبت‌گیری خیلی راحت بود و پزشک با حوصله توضیح داد.', stars: 5 },
      { name: 'حسین پ.', text: 'زمان ویزیت دقیق رعایت شد. راضی بودم.', stars: 5 },
      { name: 'الهام س.', text: 'پیگیری درمان منظم و حرفه‌ای انجام شد.', stars: 5 },
    ],
    services_fallback: 'انواع ویزیت',
    services_sub: 'ویزیت حضوری، پیگیری و مشاوره',
    about_fallback: 'مطب ما با رویکردی انسانی و حرفه‌ای، مسیر درمان را ساده و شفاف می‌کند.',
    cta_title: 'زمان مناسب ویزیت خود را رزرو کنید',
    cta_sub: 'بدون تماس تلفنی، نوبت آنلاین بگیرید.',
    footer_tagline: 'مراقبت بهتر، دسترسی آسان‌تر',
  },
};

export function getLabels(settings) {
  const base = settings?.labels || {};
  return {
    business: base.business || 'مجموعه',
    business_full: base.business_full || settings?.vertical_label || settings?.name || 'مجموعه',
    staff: base.staff || 'پرسنل',
    staff_singular: base.staff_singular || 'پرسنل',
    service: base.service || 'خدمت',
    services: base.services || 'خدمات',
    customer: base.customer || 'مشتری',
    appointment: base.appointment || 'نوبت',
    book_cta: base.book_cta || 'رزرو آنلاین',
    book_title: base.book_title || 'دریافت نوبت',
    hero_title: base.hero_title || settings?.hero_title || '',
    hero_subtitle: base.hero_subtitle || settings?.hero_subtitle || '',
    about_title: base.about_title || 'درباره ما',
    panel: base.panel || 'پنل مدیریت',
  };
}

export function getVerticalCopy(settings) {
  const type = settings?.business_type || 'beauty_salon';
  return VERTICAL_DEFAULTS[type] || VERTICAL_DEFAULTS.beauty_salon;
}

export function getVerticalFeatures(settings) {
  return {
    gallery: settings?.vertical_features?.gallery !== false,
    staff_portfolio: settings?.vertical_features?.staff_portfolio !== false,
    multi_service_booking: settings?.vertical_features?.multi_service_booking !== false,
    staff_selection_required: !!settings?.vertical_features?.staff_selection_required,
    customer_national_id: !!settings?.vertical_features?.customer_national_id,
    ...(settings?.vertical_features || {}),
  };
}

export function getBookingRules(settings) {
  let rules = {};
  try {
    rules = typeof settings?.booking_rules_json === 'string'
      ? JSON.parse(settings.booking_rules_json || '{}')
      : (settings?.booking_rules_json || {});
  } catch {
    rules = {};
  }
  const vf = getVerticalFeatures(settings);
  return {
    allow_staff_selection: rules.allow_staff_selection !== false,
    staff_selection_required: rules.staff_selection_required ?? vf.staff_selection_required,
    multi_service: rules.multi_service ?? vf.multi_service_booking,
    auto_confirm: !!rules.auto_confirm,
  };
}
