<?php

declare(strict_types=1);

namespace Salon\Controllers;

use Salon\Database\Connection;
use Salon\Http\Request;
use Salon\Http\Response;
use Salon\Services\Sms\SmsManager;
use Salon\Services\SmsService;
use Salon\Tenant\FeatureGate;
use Salon\Tenant\TenantContext;

final class IntegrationController
{
    // ── پیامک ───────────────────────────────────────────────────────────
    public static function getSms(Request $req): void
    {
        FeatureGate::require('sms');
        $sid = TenantContext::siteId();
        $pdo = Connection::get();
        $stmt = $pdo->prepare('SELECT * FROM site_sms_settings WHERE site_id = ?');
        $stmt->execute([$sid]);
        $row = $stmt->fetch();
        if (!$row) {
            $pdo->prepare('INSERT INTO site_sms_settings (site_id) VALUES (?)')->execute([$sid]);
            $stmt->execute([$sid]);
            $row = $stmt->fetch();
        }
        $row['credentials'] = json_decode($row['credentials_json'] ?? '{}', true);
        $row['patterns'] = json_decode($row['patterns_json'] ?? '{}', true);
        $row['events'] = json_decode($row['events_json'] ?? '{}', true);
        unset($row['credentials_json'], $row['patterns_json'], $row['events_json']);
        Response::json([
            'settings' => $row,
            'providers' => SmsManager::providers(),
        ]);
    }

    public static function updateSms(Request $req): void
    {
        FeatureGate::require('sms');
        $sid = TenantContext::siteId();
        $b = $req->body;
        $provider = in_array($b['provider'] ?? '', array_keys(SmsManager::providers()), true) ? $b['provider'] : 'melipayamak';
        $pdo = Connection::get();
        $pdo->prepare(
            'UPDATE site_sms_settings SET provider=?, is_enabled=?, credentials_json=?, patterns_json=?, events_json=?, updated_at=NOW() WHERE site_id=?'
        )->execute([
            $provider,
            (int) (!empty($b['is_enabled'])),
            json_encode($b['credentials'] ?? [], JSON_UNESCAPED_UNICODE),
            json_encode($b['patterns'] ?? [], JSON_UNESCAPED_UNICODE),
            json_encode($b['events'] ?? [], JSON_UNESCAPED_UNICODE),
            $sid,
        ]);
        Response::json(['ok' => true]);
    }

    public static function testSms(Request $req): void
    {
        FeatureGate::require('sms');
        $phone = trim($req->body['phone'] ?? '');
        if ($phone === '') {
            Response::error('شماره موبایل الزامی است');
        }
        $message = trim($req->body['message'] ?? 'پیام تست');
        $result = SmsService::sendForSite(TenantContext::siteId(), $phone, $message);
        Response::json($result);
    }

    // ── درگاه پرداخت (زیبال) ─────────────────────────────────────────────
    public static function getPayment(Request $req): void
    {
        FeatureGate::require('deposit');
        $sid = TenantContext::siteId();
        $pdo = Connection::get();
        $stmt = $pdo->prepare('SELECT * FROM site_payment_settings WHERE site_id = ?');
        $stmt->execute([$sid]);
        $row = $stmt->fetch();
        if (!$row) {
            $pdo->prepare('INSERT INTO site_payment_settings (site_id) VALUES (?)')->execute([$sid]);
            $stmt->execute([$sid]);
            $row = $stmt->fetch();
        }
        Response::json($row);
    }

    public static function updatePayment(Request $req): void
    {
        FeatureGate::require('deposit');
        $sid = TenantContext::siteId();
        $b = $req->body;
        Connection::get()->prepare(
            'UPDATE site_payment_settings SET provider=?, zibal_merchant=?, is_enabled=?, updated_at=NOW() WHERE site_id=?'
        )->execute([
            'zibal',
            trim((string) ($b['zibal_merchant'] ?? '')),
            (int) (!empty($b['is_enabled'])),
            $sid,
        ]);
        Response::json(['ok' => true]);
    }
}
