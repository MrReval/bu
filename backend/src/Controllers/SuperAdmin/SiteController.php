<?php

declare(strict_types=1);

namespace Salon\Controllers\SuperAdmin;

use Salon\Http\Request;
use Salon\Http\Response;
use Salon\Services\SiteService;
use Salon\Tenant\VerticalRegistry;

final class SiteController
{
    public static function verticals(Request $req): void
    {
        Response::json(VerticalRegistry::options());
    }

    public static function index(Request $req): void
    {
        Response::json(SiteService::all());
    }

    public static function show(Request $req, array $params): void
    {
        try {
            Response::json(SiteService::find((int) $params['id']));
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 404);
        }
    }

    public static function store(Request $req): void
    {
        try {
            Response::json(SiteService::create($req->body), 201);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage());
        } catch (\Throwable $e) {
            Response::error('خطا در ایجاد سایت: ' . $e->getMessage(), 500);
        }
    }

    public static function update(Request $req, array $params): void
    {
        try {
            Response::json(SiteService::update((int) $params['id'], $req->body));
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage());
        }
    }

    public static function destroy(Request $req, array $params): void
    {
        SiteService::delete((int) $params['id']);
        Response::json(['ok' => true]);
    }

    public static function resetPassword(Request $req, array $params): void
    {
        try {
            SiteService::resetAdminPassword((int) $params['id'], (string) ($req->body['password'] ?? ''));
            Response::json(['ok' => true]);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage());
        }
    }
}
