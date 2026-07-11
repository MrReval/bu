<?php

declare(strict_types=1);

namespace Salon\Tenant;

/**
 * رجیستری قالب‌های عمودی (سالن، دندان، مطب).
 * پلن‌های اشتراک مشترک‌اند؛ تفاوت در لیبل، رنگ، seed و سکشن لندینگ است.
 */
final class VerticalRegistry
{
    public const BEAUTY = 'beauty_salon';
    public const DENTAL = 'dental_clinic';
    public const MEDICAL = 'medical_practice';

    public const ALL = [self::BEAUTY, self::DENTAL, self::MEDICAL];

    public static function normalize(?string $type): string
    {
        $type = trim((string) $type);
        return in_array($type, self::ALL, true) ? $type : self::BEAUTY;
    }

    /** فهرست برای سوپرادمین */
    public static function options(): array
    {
        $out = [];
        foreach (self::ALL as $key) {
            $t = self::get($key);
            $out[] = [
                'key' => $key,
                'label' => $t['label'],
                'description' => $t['description'],
                'primary_color' => $t['primary_color'],
            ];
        }
        return $out;
    }

    public static function get(string $type): array
    {
        $type = self::normalize($type);
        return match ($type) {
            self::DENTAL => self::dental(),
            self::MEDICAL => self::medical(),
            default => self::beauty(),
        };
    }

    /** لیبل‌های قابل‌مصرف در فرانت */
    public static function labels(string $type): array
    {
        return self::get($type)['labels'];
    }

    private static function beauty(): array
    {
        return [
            'key' => self::BEAUTY,
            'label' => 'سالن زیبایی',
            'description' => 'آرایشگاه، اسکین، ناخن و خدمات زیبایی',
            'primary_color' => '#be185d',
            'secondary_color' => '#500724',
            'default_name' => 'سالن زیبایی',
            'staff_color' => '#be185d',
            'features' => [
                'gallery' => true,
                'staff_portfolio' => true,
                'multi_service_booking' => true,
                'staff_selection_required' => false,
            ],
            'labels' => [
                'business' => 'سالن',
                'business_full' => 'سالن زیبایی',
                'staff' => 'پرسنل',
                'staff_singular' => 'آرایشگر',
                'service' => 'خدمت',
                'services' => 'خدمات',
                'customer' => 'مشتری',
                'appointment' => 'نوبت',
                'book_cta' => 'رزرو آنلاین',
                'book_title' => 'دریافت نوبت',
                'hero_title' => 'زیبایی، تخصص و تجربه‌ای خاص',
                'hero_subtitle' => 'نوبت خود را آنلاین رزرو کنید و از خدمات حرفه‌ای لذت ببرید.',
                'about_title' => 'درباره سالن',
                'panel' => 'پنل مدیریت سالن',
            ],
            'landing' => [
                ['hero', 0, '{"use_settings":true}'],
                ['services', 1, '{"title":"خدمات ما"}'],
                ['about', 2, '{"title":"درباره ما"}'],
                ['cta', 3, '{"title":"همین حالا نوبت بگیرید","button_text":"رزرو آنلاین","button_link":"/book"}'],
            ],
            'categories' => ['ناخن', 'مو', 'پوست', 'ابرو و مژه'],
            'services' => [
                ['ناخن', 'مانیکور', 'مانیکور حرفه‌ای', 45, 250000],
                ['ناخن', 'پدیکور', 'پدیکور کامل', 60, 350000],
                ['ناخن', 'کاشت ناخن', 'کاشت و طراحی', 90, 800000],
                ['مو', 'کوتاهی مو', 'کوتاهی و استایل', 30, 200000],
                ['پوست', 'پاکسازی پوست', 'پاکسازی عمقی', 60, 450000],
            ],
            'hours' => self::defaultHours('09:00', '21:00', 5),
        ];
    }

    private static function dental(): array
    {
        return [
            'key' => self::DENTAL,
            'label' => 'کلینیک دندان‌پزشکی',
            'description' => 'مطب و کلینیک دندان با نوبت‌دهی آنلاین',
            'primary_color' => '#0e7490',
            'secondary_color' => '#164e63',
            'default_name' => 'کلینیک دندان‌پزشکی',
            'staff_color' => '#0e7490',
            'features' => [
                'gallery' => true,
                'staff_portfolio' => false,
                'multi_service_booking' => false,
                'staff_selection_required' => true,
            ],
            'labels' => [
                'business' => 'کلینیک',
                'business_full' => 'کلینیک دندان‌پزشکی',
                'staff' => 'پزشکان',
                'staff_singular' => 'دندان‌پزشک',
                'service' => 'خدمت درمانی',
                'services' => 'خدمات دندان‌پزشکی',
                'customer' => 'بیمار',
                'appointment' => 'نوبت',
                'book_cta' => 'رزرو نوبت',
                'book_title' => 'نوبت دندان‌پزشکی',
                'hero_title' => 'لبخند سالم، با برنامه‌ریزی آسان',
                'hero_subtitle' => 'نوبت ویزیت و درمان را آنلاین بگیرید؛ بدون انتظار پشت تلفن.',
                'about_title' => 'درباره کلینیک',
                'panel' => 'پنل مدیریت کلینیک',
            ],
            'landing' => [
                ['hero', 0, '{"use_settings":true}'],
                ['services', 1, '{"title":"خدمات دندان‌پزشکی"}'],
                ['about', 2, '{"title":"تخصص و مراقبت"}'],
                ['cta', 3, '{"title":"نوبت خود را رزرو کنید","button_text":"رزرو نوبت","button_link":"/book"}'],
            ],
            'categories' => ['ویزیت', 'ترمیم', 'ارتودنسی', 'جراحی', 'زیبایی'],
            'services' => [
                ['ویزیت', 'ویزیت و معاینه', 'معاینه اولیه و مشاوره', 20, 350000],
                ['ترمیم', 'ترمیم دندان', 'پر کردن دندان', 45, 1200000],
                ['زیبایی', 'بلیچینگ', 'سفید کردن دندان', 60, 3500000],
                ['جراحی', 'کشیدن دندان', 'کشیدن ساده', 30, 900000],
                ['ارتودنسی', 'ویزیت ارتودنسی', 'معاینه‌ی ارتودنسی', 30, 500000],
            ],
            'hours' => self::defaultHours('09:00', '20:00', 5),
        ];
    }

    private static function medical(): array
    {
        return [
            'key' => self::MEDICAL,
            'label' => 'مطب پزشکی / تراپی',
            'description' => 'مطب شخصی، متخصص، تراپیست و مشاور',
            'primary_color' => '#3f6212',
            'secondary_color' => '#1a2e05',
            'default_name' => 'مطب پزشکی',
            'staff_color' => '#3f6212',
            'features' => [
                'gallery' => false,
                'staff_portfolio' => false,
                'multi_service_booking' => false,
                'staff_selection_required' => true,
            ],
            'labels' => [
                'business' => 'مطب',
                'business_full' => 'مطب پزشکی',
                'staff' => 'پزشکان',
                'staff_singular' => 'پزشک',
                'service' => 'ویزیت',
                'services' => 'انواع ویزیت',
                'customer' => 'بیمار',
                'appointment' => 'نوبت ویزیت',
                'book_cta' => 'دریافت نوبت',
                'book_title' => 'نوبت ویزیت',
                'hero_title' => 'مراقبت بهتر، با نوبت‌دهی هوشمند',
                'hero_subtitle' => 'زمان مناسب خود را انتخاب کنید و بدون تماس تلفنی نوبت بگیرید.',
                'about_title' => 'درباره مطب',
                'panel' => 'پنل مدیریت مطب',
            ],
            'landing' => [
                ['hero', 0, '{"use_settings":true}'],
                ['services', 1, '{"title":"انواع ویزیت"}'],
                ['about', 2, '{"title":"درباره ما"}'],
                ['cta', 3, '{"title":"همین حالا نوبت بگیرید","button_text":"دریافت نوبت","button_link":"/book"}'],
            ],
            'categories' => ['ویزیت عمومی', 'مشاوره', 'پیگیری'],
            'services' => [
                ['ویزیت عمومی', 'ویزیت حضوری', 'معاینه و مشاوره حضوری', 20, 400000],
                ['ویزیت عمومی', 'ویزیت مجدد', 'پیگیری درمان', 15, 250000],
                ['مشاوره', 'مشاوره تلفنی', 'مشاوره کوتاه تلفنی', 15, 200000],
                ['پیگیری', 'کنترل دوره‌ای', 'بررسی روند درمان', 20, 300000],
            ],
            'hours' => self::defaultHours('09:00', '18:00', 5),
        ];
    }

    /** @return array<string,array{open:string,close:string,closed:bool}> */
    private static function defaultHours(string $open, string $close, int $closedDay): array
    {
        $hours = [];
        for ($d = 0; $d <= 6; $d++) {
            $closed = $d === $closedDay;
            $hours[(string) $d] = [
                'open' => $closed ? '' : $open,
                'close' => $closed ? '' : $close,
                'closed' => $closed,
            ];
        }
        return $hours;
    }
}
