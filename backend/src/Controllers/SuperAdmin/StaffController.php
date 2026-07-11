<?php

declare(strict_types=1);

namespace Salon\Controllers\SuperAdmin;

use Salon\Http\Request;
use Salon\Http\Response;
use Salon\Services\PlatformUserService;

final class StaffController
{
    public static function index(Request $req): void
    {
        Response::json(PlatformUserService::all());
    }

    public static function store(Request $req): void
    {
        try {
            Response::json(PlatformUserService::create($req->body), 201);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage());
        }
    }

    public static function update(Request $req, array $params): void
    {
        try {
            $actorId = (int) ($req->user['id'] ?? 0);
            Response::json(PlatformUserService::update((int) $params['id'], $req->body, $actorId));
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage());
        }
    }

    public static function destroy(Request $req, array $params): void
    {
        try {
            $actorId = (int) ($req->user['id'] ?? 0);
            PlatformUserService::delete((int) $params['id'], $actorId);
            Response::json(['ok' => true]);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage());
        }
    }
}
