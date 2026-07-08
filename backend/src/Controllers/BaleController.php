<?php

declare(strict_types=1);

namespace Salon\Controllers;

use Salon\Database\Connection;
use Salon\Http\Request;
use Salon\Http\Response;
use Salon\Services\BaleService;
use Salon\Tenant\FeatureGate;
use Salon\Tenant\TenantContext;

final class BaleController
{
    public static function get(Request $req): void
    {
        FeatureGate::require('bale_report');
        $stmt = Connection::get()->prepare(
            'SELECT bale_token, bale_chat_id, bale_daily_enabled FROM salon_settings WHERE site_id = ?'
        );
        $stmt->execute([TenantContext::siteId()]);
        Response::json($stmt->fetch() ?: [
            'bale_token' => '', 'bale_chat_id' => '', 'bale_daily_enabled' => 0,
        ]);
    }

    public static function update(Request $req): void
    {
        FeatureGate::require('bale_report');
        $b = $req->body;
        Connection::get()->prepare(
            'UPDATE salon_settings SET bale_token = ?, bale_chat_id = ?, bale_daily_enabled = ?, updated_at = NOW() WHERE site_id = ?'
        )->execute([
            trim((string) ($b['bale_token'] ?? '')),
            trim((string) ($b['bale_chat_id'] ?? '')),
            (int) (!empty($b['bale_daily_enabled'])),
            TenantContext::siteId(),
        ]);
        Response::json(['ok' => true]);
    }

    public static function test(Request $req): void
    {
        FeatureGate::require('bale_report');
        $result = BaleService::dailyReport(TenantContext::siteId());
        Response::json($result);
    }
}
