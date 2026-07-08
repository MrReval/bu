<?php

declare(strict_types=1);

namespace Salon\Services;

use Salon\Database\Connection;
use Salon\Services\Sms\SmsManager;
use Salon\Tenant\FeatureGate;
use Salon\Tenant\TenantContext;

/**
 * نمای پیامک: خواندن تنظیمات هر سایت، ارسال و ثبت لاگ.
 */
final class SmsService
{
    /** ارسال مستقیم پیامک برای یک سایت (تست/دستی) */
    public static function sendForSite(int $siteId, string $phone, string $message): array
    {
        $settings = self::siteSettings($siteId);
        if (!$settings || !(int) $settings['is_enabled']) {
            return ['ok' => false, 'response' => 'پیامک برای این سایت فعال نیست'];
        }
        $creds = json_decode($settings['credentials_json'] ?? '{}', true) ?: [];
        $driver = SmsManager::driver($settings['provider'] ?? 'melipayamak', $creds);
        $result = $driver->send($phone, $message);
        self::log($siteId, $phone, $message, $settings['provider'] ?? '', $result);
        return $result;
    }

    public static function onNewAppointment(int $appointmentId): void
    {
        try {
            $siteId = TenantContext::siteIdOrNull();
            if ($siteId === null || !FeatureGate::has('sms')) {
                return;
            }
            $settings = self::siteSettings($siteId);
            if (!$settings || !(int) $settings['is_enabled'] || !self::eventEnabled($settings, 'new_appointment')) {
                return;
            }
            $apt = AppointmentService::getById($appointmentId);
            $salon = self::salonName($siteId);
            $msg = sprintf('%s%sنوبت شما ثبت شد. زمان: %s', $salon ? $salon . "\n" : '', '', $apt['start_at']);
            self::dispatch($siteId, $settings, (string) $apt['customer_phone'], $msg, 'new_appointment', [
                'salon' => (string) $salon,
                'time' => (string) $apt['start_at'],
            ]);
        } catch (\Throwable $e) {
            // پیامک نباید جریان اصلی را متوقف کند
        }
    }

    public static function onStatusChange(int $appointmentId, string $status): void
    {
        try {
            $siteId = TenantContext::siteIdOrNull();
            if ($siteId === null || !FeatureGate::has('sms')) {
                return;
            }
            $settings = self::siteSettings($siteId);
            if (!$settings || !(int) $settings['is_enabled'] || !self::eventEnabled($settings, 'status_change')) {
                return;
            }
            $labels = ['confirmed' => 'تأیید شد', 'cancelled' => 'لغو شد', 'completed' => 'انجام شد'];
            if (!isset($labels[$status])) {
                return;
            }
            $apt = AppointmentService::getById($appointmentId);
            $salon = self::salonName($siteId);
            $msg = sprintf('%sوضعیت نوبت شما: %s', $salon ? $salon . "\n" : '', $labels[$status]);
            self::dispatch($siteId, $settings, (string) $apt['customer_phone'], $msg, 'status_change', [
                'salon' => (string) $salon,
                'status' => $labels[$status],
            ]);
        } catch (\Throwable $e) {
        }
    }

    /** ارسال لینک نظرسنجی پس از تکمیل خدمت (در صورت فعال‌بودن فیچر و پیامک) */
    public static function sendSurveyLink(int $appointmentId): void
    {
        try {
            $siteId = TenantContext::siteIdOrNull();
            if ($siteId === null || !FeatureGate::has('survey') || !FeatureGate::has('sms')) {
                return;
            }
            $settings = self::siteSettings($siteId);
            if (!$settings || !(int) $settings['is_enabled']) {
                return;
            }
            $apt = AppointmentService::getById($appointmentId);
            $phone = (string) ($apt['customer_phone'] ?? '');
            if ($phone === '') {
                return;
            }
            $domain = self::siteDomain($siteId);
            if ($domain === '') {
                return;
            }
            $token = SurveyService::token($appointmentId);
            $link = 'https://' . $domain . '/survey/' . $appointmentId . '/' . $token;
            $salon = self::salonName($siteId);
            $msg = ($salon ? $salon . "\n" : '') . "از حضور شما سپاسگزاریم.\nلطفاً نظر خود را ثبت کنید:\n" . $link;
            $creds = json_decode($settings['credentials_json'] ?? '{}', true) ?: [];
            $driver = SmsManager::driver($settings['provider'] ?? 'melipayamak', $creds);
            $result = $driver->send($phone, $msg);
            self::log($siteId, $phone, $msg, $settings['provider'] ?? '', $result);
        } catch (\Throwable $e) {
        }
    }

    private static function siteDomain(int $siteId): string
    {
        $stmt = Connection::get()->prepare('SELECT domain FROM sites WHERE id = ?');
        $stmt->execute([$siteId]);
        return (string) ($stmt->fetchColumn() ?: '');
    }

    private static function dispatch(int $siteId, array $settings, string $phone, string $message, string $event, array $params): void
    {
        if ($phone === '') {
            return;
        }
        $creds = json_decode($settings['credentials_json'] ?? '{}', true) ?: [];
        $patterns = json_decode($settings['patterns_json'] ?? '{}', true) ?: [];
        $driver = SmsManager::driver($settings['provider'] ?? 'melipayamak', $creds);

        if (!empty($patterns[$event])) {
            $result = $driver->sendPattern($phone, (string) $patterns[$event], $params);
        } else {
            $result = $driver->send($phone, $message);
        }
        self::log($siteId, $phone, $message, $settings['provider'] ?? '', $result);
    }

    private static function eventEnabled(array $settings, string $event): bool
    {
        $events = json_decode($settings['events_json'] ?? '{}', true) ?: [];
        // اگر تنظیم نشده باشد، پیش‌فرض فعال است
        return !array_key_exists($event, $events) || !empty($events[$event]);
    }

    private static function siteSettings(int $siteId): ?array
    {
        $stmt = Connection::get()->prepare('SELECT * FROM site_sms_settings WHERE site_id = ?');
        $stmt->execute([$siteId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    private static function salonName(int $siteId): string
    {
        $stmt = Connection::get()->prepare('SELECT name FROM salon_settings WHERE site_id = ?');
        $stmt->execute([$siteId]);
        return (string) ($stmt->fetchColumn() ?: '');
    }

    private static function log(int $siteId, string $phone, string $message, string $provider, array $result): void
    {
        try {
            Connection::get()->prepare(
                'INSERT INTO sms_logs (site_id, phone, message, provider, status, response) VALUES (?,?,?,?,?,?)'
            )->execute([
                $siteId, $phone, $message, $provider,
                !empty($result['ok']) ? 'sent' : 'failed',
                mb_substr((string) ($result['response'] ?? ''), 0, 900),
            ]);
        } catch (\Throwable $e) {
        }
    }
}
