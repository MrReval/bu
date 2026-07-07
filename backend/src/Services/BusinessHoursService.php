<?php

declare(strict_types=1);

namespace Salon\Services;

final class BusinessHoursService
{
    /** کلیدها مطابق DateTime::format('w'): 0=یکشنبه ... 5=جمعه ... 6=شنبه */
    public static function normalizeJson(?string $json): ?string
    {
        if ($json === null || $json === '') {
            return $json;
        }

        $hours = json_decode($json, true);
        if (!is_array($hours)) {
            return $json;
        }

        $hours = self::fixIranFridaySaturdaySwap($hours);
        $hours = self::fillMissingOpenHours($hours);

        return json_encode($hours, JSON_UNESCAPED_UNICODE);
    }

    /** @return array<string|int, array<string, mixed>> */
    public static function decode(?string $json): array
    {
        $hours = json_decode($json ?? '{}', true);
        if (!is_array($hours)) {
            return [];
        }
        if (array_is_list($hours)) {
            $out = [];
            foreach ($hours as $i => $day) {
                if (is_array($day)) {
                    $out[(string) $i] = $day;
                }
            }
            $hours = $out;
        }

        return self::fillMissingOpenHours(self::fixIranFridaySaturdaySwap($hours));
    }

    /** @param array<string|int, array<string, mixed>> $hours */
    private static function fixIranFridaySaturdaySwap(array $hours): array
    {
        $fri = $hours['5'] ?? $hours[5] ?? null;
        $sat = $hours['6'] ?? $hours[6] ?? null;
        if (!is_array($fri) || !is_array($sat)) {
            return $hours;
        }

        $friClosed = !empty($fri['closed']);
        $satClosed = !empty($sat['closed']);
        $friOpen = trim((string) ($fri['open'] ?? ''));
        $satOpen = trim((string) ($sat['open'] ?? ''));

        // نصب‌های قدیمی: شنبه (۶) اشتباه تعطیل و جمعه (۵) باز ذخیره شده بود.
        $looksSwapped = $satClosed && !$friClosed && $satOpen === '' && $friOpen !== '';
        if ($looksSwapped) {
            $hours['5'] = $sat;
            $hours['6'] = $fri;
        }

        return $hours;
    }

    /** @param array<string|int, array<string, mixed>> $hours */
    private static function fillMissingOpenHours(array $hours): array
    {
        foreach ($hours as $key => $day) {
            if (!is_array($day)) {
                continue;
            }
            if (!empty($day['closed'])) {
                $hours[$key]['open'] = '';
                $hours[$key]['close'] = '';
                continue;
            }
            if (empty($day['open'])) {
                $hours[$key]['open'] = '09:00';
            }
            if (empty($day['close'])) {
                $hours[$key]['close'] = '21:00';
            }
            $hours[$key]['closed'] = false;
        }

        return $hours;
    }
}
