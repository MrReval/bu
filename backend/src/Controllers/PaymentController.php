<?php

declare(strict_types=1);

namespace Salon\Controllers;

use Salon\Database\Connection;
use Salon\Http\Request;
use Salon\Http\Response;
use Salon\Services\AppointmentService;
use Salon\Services\Payment\ZibalService;
use Salon\Tenant\FeatureGate;
use Salon\Tenant\TenantContext;

final class PaymentController
{
    /** شروع پرداخت بیعانه برای یک نوبت */
    public static function startDeposit(Request $req, array $params): void
    {
        $siteId = TenantContext::siteId();
        $appointmentId = (int) ($params['id'] ?? 0);

        if (!FeatureGate::has('deposit')) {
            Response::error('درگاه پرداخت فعال نیست', 403);
        }

        try {
            $apt = AppointmentService::getById($appointmentId);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 404);
        }

        $amount = (int) round((float) $apt['deposit_amount']);
        if ($amount <= 0 || ($apt['deposit_status'] ?? '') === 'paid') {
            Response::error('بیعانه‌ای برای پرداخت وجود ندارد');
        }

        $settings = self::paymentSettings($siteId);
        if (!$settings || !(int) $settings['is_enabled'] || trim((string) $settings['zibal_merchant']) === '') {
            Response::error('درگاه پرداخت پیکربندی نشده است', 400);
        }

        $pdo = Connection::get();
        $pdo->prepare(
            'INSERT INTO payments (site_id, appointment_id, amount, provider, status) VALUES (?,?,?,?,"pending")'
        )->execute([$siteId, $appointmentId, $amount, 'zibal']);
        $paymentId = (int) $pdo->lastInsertId();

        $callback = self::baseUrl($req) . '/api/v1/payments/callback?payment_id=' . $paymentId;
        $result = ZibalService::request(
            (string) $settings['zibal_merchant'],
            $amount,
            $callback,
            'بیعانه نوبت #' . $appointmentId,
            $paymentId
        );

        if (empty($result['ok'])) {
            $pdo->prepare('UPDATE payments SET status = "failed", updated_at = NOW() WHERE id = ?')->execute([$paymentId]);
            Response::error($result['error'] ?? 'خطا در ایجاد پرداخت');
        }

        $pdo->prepare('UPDATE payments SET track_id = ?, updated_at = NOW() WHERE id = ?')
            ->execute([$result['trackId'], $paymentId]);

        Response::json(['url' => $result['url'], 'payment_id' => $paymentId]);
    }

    /** بازگشت از درگاه زیبال (ریدایرکت مرورگر) */
    public static function callback(Request $req): void
    {
        $siteId = TenantContext::siteId();
        $paymentId = (int) ($req->query['payment_id'] ?? 0);
        $pdo = Connection::get();
        $stmt = $pdo->prepare('SELECT * FROM payments WHERE id = ? AND site_id = ?');
        $stmt->execute([$paymentId, $siteId]);
        $payment = $stmt->fetch();

        if (!$payment) {
            self::redirect('/?payment=notfound');
        }

        $settings = self::paymentSettings($siteId);
        $trackId = (string) ($req->query['trackId'] ?? $payment['track_id']);
        $success = (string) ($req->query['success'] ?? '');

        if ($success !== '1') {
            $pdo->prepare('UPDATE payments SET status = "failed", updated_at = NOW() WHERE id = ?')->execute([$paymentId]);
            self::redirect('/my-appointments?payment=failed');
        }

        $verify = ZibalService::verify((string) $settings['zibal_merchant'], $trackId);
        if (empty($verify['ok'])) {
            $pdo->prepare('UPDATE payments SET status = "failed", updated_at = NOW() WHERE id = ?')->execute([$paymentId]);
            self::redirect('/my-appointments?payment=failed');
        }

        $pdo->prepare('UPDATE payments SET status = "paid", ref_number = ?, updated_at = NOW() WHERE id = ?')
            ->execute([$verify['refNumber'] ?? '', $paymentId]);
        if (!empty($payment['appointment_id'])) {
            $pdo->prepare('UPDATE appointments SET deposit_status = "paid", updated_at = NOW() WHERE id = ? AND site_id = ?')
                ->execute([(int) $payment['appointment_id'], $siteId]);
        }

        self::redirect('/my-appointments?payment=success');
    }

    private static function paymentSettings(int $siteId): ?array
    {
        $stmt = Connection::get()->prepare('SELECT * FROM site_payment_settings WHERE site_id = ?');
        $stmt->execute([$siteId]);
        return $stmt->fetch() ?: null;
    }

    private static function baseUrl(Request $req): string
    {
        $https = ($_SERVER['HTTPS'] ?? '') === 'on'
            || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
        $scheme = $https ? 'https' : 'http';
        $host = $_SERVER['HTTP_X_FORWARDED_HOST'] ?? $_SERVER['HTTP_HOST'] ?? 'localhost';
        return $scheme . '://' . $host;
    }

    private static function redirect(string $path): void
    {
        header('Location: ' . $path);
        exit;
    }
}
