<?php

declare(strict_types=1);

namespace Salon\Controllers;

use Salon\Http\Request;
use Salon\Http\Response;
use Salon\Services\SurveyService;
use Salon\Tenant\FeatureGate;

final class SurveyController
{
    // ── عمومی (صفحه نظرسنجی روی سایت) ────────────────────────────────────
    public static function info(Request $req, array $params): void
    {
        try {
            Response::json(SurveyService::info((int) $params['id'], (string) $params['token']));
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 404);
        }
    }

    public static function submit(Request $req, array $params): void
    {
        try {
            SurveyService::submit(
                (int) $params['id'],
                (string) $params['token'],
                (int) ($req->body['rating'] ?? 5),
                (string) ($req->body['comment'] ?? '')
            );
            Response::json(['ok' => true]);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage());
        }
    }

    // ── پنل مدیریت ───────────────────────────────────────────────────────
    public static function list(Request $req): void
    {
        FeatureGate::require('survey');
        Response::json(SurveyService::listResponses());
    }
}
