<?php

declare(strict_types=1);

namespace Salon\Controllers;

use Salon\Database\Connection;
use Salon\Http\Request;
use Salon\Http\Response;
use Salon\Services\AppointmentService;
use Salon\Services\NotificationService;
use Salon\Services\Payment\ZibalService;
use Salon\Services\UploadService;
use Salon\Tenant\FeatureGate;
use Salon\Tenant\TenantContext;

final class PaymentController
{
    /** شروع پرداخت بیعانه آنلاین (زیبال) */
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
        $mode = (string) ($settings['payment_mode'] ?? 'zibal');
        if (!$settings || !(int) $settings['is_enabled'] || !in_array($mode, ['zibal', 'both'], true)) {
            Response::error('درگاه آنلاین فعال نیست', 400);
        }
        if (trim((string) ($settings['zibal_merchant'] ?? '')) === '') {
            Response::error('مرچنت زیبال پیکربندی نشده است', 400);
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

        Response::json(['url' => $result['url'], 'payment_id' => $paymentId, 'method' => 'zibal']);
    }

    /**
     * ثبت فیش کارت‌به‌کارت برای بیعانه.
     * multipart: receipt (تصویر فیش)، اختیاری: note
     */
    public static function submitCardReceipt(Request $req, array $params): void
    {
        $siteId = TenantContext::siteId();
        $appointmentId = (int) ($params['id'] ?? 0);

        if (!FeatureGate::has('deposit')) {
            Response::error('دریافت بیعانه فعال نیست', 403);
        }

        try {
            $apt = AppointmentService::getById($appointmentId);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 404);
        }

        // فقط صاحب نوبت یا مهمان با همان نوبت (بدون توکن هم بعد از رزرو مجاز است)
        if ($req->user) {
            $role = $req->user['role'] ?? '';
            if ($role === 'customer' && (int) $req->user['id'] !== (int) $apt['customer_id']) {
                Response::error('دسترسی مجاز نیست', 403);
            }
        }

        $amount = (int) round((float) $apt['deposit_amount']);
        if ($amount <= 0 || ($apt['deposit_status'] ?? '') === 'paid') {
            Response::error('بیعانه‌ای برای پرداخت وجود ندارد');
        }
        if (($apt['deposit_status'] ?? '') === 'awaiting_review') {
            Response::error('فیش شما در انتظار بررسی مدیر است');
        }

        $settings = self::paymentSettings($siteId);
        $mode = (string) ($settings['payment_mode'] ?? 'zibal');
        if (!$settings || !(int) $settings['is_enabled'] || !in_array($mode, ['card', 'both'], true)) {
            Response::error('پرداخت کارت‌به‌کارت فعال نیست', 400);
        }
        if (trim((string) ($settings['card_number'] ?? '')) === '') {
            Response::error('شماره کارت سالن تنظیم نشده است', 400);
        }

        if (empty($_FILES['receipt'])) {
            Response::error('آپلود تصویر فیش الزامی است');
        }

        try {
            $path = UploadService::saveUploadedImage($_FILES['receipt'], $siteId . '/receipts');
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage());
        } catch (\Throwable $e) {
            Response::error('خطا در ذخیره فیش', 500);
        }

        $note = trim((string) ($req->body['note'] ?? $_POST['note'] ?? ''));
        $pdo = Connection::get();

        // پرداخت قبلی در انتظار را رد کن تا فقط یک فیش فعال بماند
        $pdo->prepare(
            "UPDATE payments SET status = 'rejected', updated_at = NOW()
             WHERE site_id = ? AND appointment_id = ? AND provider = 'card'
               AND status IN ('pending','awaiting_review')"
        )->execute([$siteId, $appointmentId]);

        $pdo->prepare(
            'INSERT INTO payments (site_id, appointment_id, amount, provider, receipt_path, status, admin_note)
             VALUES (?,?,?,?,?,"awaiting_review",?)'
        )->execute([$siteId, $appointmentId, $amount, 'card', $path, $note !== '' ? $note : null]);
        $paymentId = (int) $pdo->lastInsertId();

        $pdo->prepare(
            'UPDATE appointments SET deposit_status = "awaiting_review", status = "pending", updated_at = NOW()
             WHERE id = ? AND site_id = ?'
        )->execute([$appointmentId, $siteId]);

        NotificationService::notifyManagersDepositReceipt($appointmentId, $paymentId);

        Response::json([
            'ok' => true,
            'payment_id' => $paymentId,
            'deposit_status' => 'awaiting_review',
            'receipt_url' => UploadService::publicUrl($path),
            'message' => 'فیش ارسال شد و پس از تأیید مدیر، نوبت نهایی می‌شود',
        ], 201);
    }

    /** بازگشت از درگاه زیبال */
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
            $pdo->prepare(
                'UPDATE appointments SET deposit_status = "paid", status = "confirmed", updated_at = NOW()
                 WHERE id = ? AND site_id = ?'
            )->execute([(int) $payment['appointment_id'], $siteId]);
        }

        self::redirect('/my-appointments?payment=success');
    }

    /** فهرست فیش‌های کارت‌به‌کارت برای مدیر */
    public static function adminList(Request $req): void
    {
        FeatureGate::require('deposit');
        $siteId = TenantContext::siteId();
        $status = trim((string) ($req->query['status'] ?? 'awaiting_review'));
        $pdo = Connection::get();

        $where = 'p.site_id = ? AND p.provider = "card"';
        $params = [$siteId];
        if ($status !== '' && $status !== 'all') {
            $where .= ' AND p.status = ?';
            $params[] = $status;
        }

        $stmt = $pdo->prepare(
            "SELECT p.*, a.start_at, a.status AS appointment_status, a.deposit_status,
                    a.total_price, u.name AS customer_name, u.phone AS customer_phone
             FROM payments p
             LEFT JOIN appointments a ON a.id = p.appointment_id
             LEFT JOIN users u ON u.id = a.customer_id
             WHERE {$where}
             ORDER BY FIELD(p.status, 'awaiting_review', 'pending', 'paid', 'rejected', 'failed'), p.id DESC
             LIMIT 200"
        );
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['receipt_url'] = UploadService::publicUrl($r['receipt_path'] ?? null);
            $r['amount'] = (float) $r['amount'];
        }
        unset($r);

        $counts = [
            'awaiting_review' => 0,
            'paid' => 0,
            'rejected' => 0,
            'all' => 0,
        ];
        $cStmt = $pdo->prepare(
            'SELECT status, COUNT(*) AS cnt FROM payments WHERE site_id = ? AND provider = "card" GROUP BY status'
        );
        $cStmt->execute([$siteId]);
        foreach ($cStmt->fetchAll() as $c) {
            $st = (string) $c['status'];
            $n = (int) $c['cnt'];
            $counts['all'] += $n;
            if (isset($counts[$st])) {
                $counts[$st] = $n;
            }
        }

        Response::json(['payments' => $rows, 'counts' => $counts]);
    }

    public static function approve(Request $req, array $params): void
    {
        FeatureGate::require('deposit');
        self::reviewPayment((int) ($params['id'] ?? 0), true, trim((string) ($req->body['note'] ?? '')), $req);
    }

    public static function reject(Request $req, array $params): void
    {
        FeatureGate::require('deposit');
        self::reviewPayment((int) ($params['id'] ?? 0), false, trim((string) ($req->body['note'] ?? '')), $req);
    }

    private static function reviewPayment(int $paymentId, bool $approve, string $note, Request $req): void
    {
        $siteId = TenantContext::siteId();
        $pdo = Connection::get();
        $stmt = $pdo->prepare('SELECT * FROM payments WHERE id = ? AND site_id = ? AND provider = "card"');
        $stmt->execute([$paymentId, $siteId]);
        $payment = $stmt->fetch();
        if (!$payment) {
            Response::error('پرداخت یافت نشد', 404);
        }
        if (($payment['status'] ?? '') !== 'awaiting_review') {
            Response::error('این فیش قابل بررسی نیست');
        }

        $appointmentId = (int) ($payment['appointment_id'] ?? 0);
        $adminId = isset($req->user['id']) ? (int) $req->user['id'] : null;

        if ($approve) {
            $pdo->prepare(
                'UPDATE payments SET status = "paid", admin_note = ?, ref_number = ?, updated_at = NOW() WHERE id = ?'
            )->execute([
                $note !== '' ? $note : 'تأیید شد',
                'CARD-' . $paymentId,
                $paymentId,
            ]);
            if ($appointmentId > 0) {
                $pdo->prepare(
                    'UPDATE appointments SET deposit_status = "paid", status = "confirmed", updated_at = NOW()
                     WHERE id = ? AND site_id = ?'
                )->execute([$appointmentId, $siteId]);
                $pdo->prepare(
                    'INSERT INTO appointment_status_history (appointment_id, old_status, new_status, changed_by)
                     VALUES (?, "pending", "confirmed", ?)'
                )->execute([$appointmentId, $adminId]);

                try {
                    $apt = AppointmentService::getById($appointmentId);
                    NotificationService::notifyCustomerStatus($appointmentId, (int) $apt['customer_id'], 'confirmed');
                } catch (\Throwable) {
                }
            }
            Response::json(['ok' => true, 'status' => 'paid', 'message' => 'فیش تأیید و نوبت نهایی شد']);
        }

        $pdo->prepare(
            'UPDATE payments SET status = "rejected", admin_note = ?, updated_at = NOW() WHERE id = ?'
        )->execute([$note !== '' ? $note : 'رد شد', $paymentId]);
        if ($appointmentId > 0) {
            $pdo->prepare(
                'UPDATE appointments SET deposit_status = "pending", updated_at = NOW() WHERE id = ? AND site_id = ?'
            )->execute([$appointmentId, $siteId]);
            try {
                $apt = AppointmentService::getById($appointmentId);
                NotificationService::create(
                    (int) $apt['customer_id'],
                    'deposit_rejected',
                    'فیش بیعانه رد شد',
                    $note !== '' ? $note : 'فیش ارسالی تأیید نشد. لطفاً دوباره فیش معتبر ارسال کنید.',
                    ['appointment_id' => $appointmentId, 'payment_id' => $paymentId]
                );
            } catch (\Throwable) {
            }
        }
        Response::json(['ok' => true, 'status' => 'rejected', 'message' => 'فیش رد شد']);
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
