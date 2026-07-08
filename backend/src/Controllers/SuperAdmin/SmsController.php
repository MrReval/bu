<?php

declare(strict_types=1);

namespace Salon\Controllers\SuperAdmin;

use Salon\Database\Connection;
use Salon\Http\Request;
use Salon\Http\Response;
use Salon\Services\Sms\SmsManager;

final class SmsController
{
    public static function get(Request $req): void
    {
        $pdo = Connection::get();
        $row = $pdo->query('SELECT * FROM platform_sms_settings WHERE id = 1')->fetch();
        if (!$row) {
            $pdo->exec('INSERT INTO platform_sms_settings (id) VALUES (1)');
            $row = $pdo->query('SELECT * FROM platform_sms_settings WHERE id = 1')->fetch();
        }
        $row['credentials'] = json_decode($row['credentials_json'] ?? '{}', true);
        $row['patterns'] = json_decode($row['patterns_json'] ?? '{}', true);
        unset($row['credentials_json'], $row['patterns_json']);
        Response::json([
            'settings' => $row,
            'providers' => SmsManager::providers(),
        ]);
    }

    public static function update(Request $req): void
    {
        $b = $req->body;
        $pdo = Connection::get();
        $provider = in_array($b['provider'] ?? '', array_keys(SmsManager::providers()), true) ? $b['provider'] : 'melipayamak';
        $isEnabled = (int) (!empty($b['is_enabled']));
        $creds = json_encode($b['credentials'] ?? [], JSON_UNESCAPED_UNICODE);
        $patterns = json_encode($b['patterns'] ?? [], JSON_UNESCAPED_UNICODE);

        $exists = (int) $pdo->query('SELECT COUNT(*) FROM platform_sms_settings WHERE id = 1')->fetchColumn();
        if ($exists === 0) {
            $pdo->prepare('INSERT INTO platform_sms_settings (id, provider, is_enabled, credentials_json, patterns_json, updated_at) VALUES (1, ?, ?, ?, ?, NOW())')
                ->execute([$provider, $isEnabled, $creds, $patterns]);
        } else {
            $pdo->prepare('UPDATE platform_sms_settings SET provider=?, is_enabled=?, credentials_json=?, patterns_json=?, updated_at=NOW() WHERE id = 1')
                ->execute([$provider, $isEnabled, $creds, $patterns]);
        }
        Response::json(['ok' => true]);
    }

    public static function test(Request $req): void
    {
        $phone = trim($req->body['phone'] ?? '');
        $message = trim($req->body['message'] ?? 'پیام تست پلتفرم');
        if ($phone === '') {
            Response::error('شماره موبایل الزامی است');
        }
        $pdo = Connection::get();
        $row = $pdo->query('SELECT * FROM platform_sms_settings WHERE id = 1')->fetch();
        if (!$row || !(int) $row['is_enabled']) {
            Response::error('پیامک پلتفرم فعال نیست');
        }
        $creds = json_decode($row['credentials_json'] ?? '{}', true) ?: [];
        $driver = SmsManager::driver($row['provider'] ?? 'melipayamak', $creds);
        $result = $driver->send($phone, $message);
        Response::json($result);
    }
}
