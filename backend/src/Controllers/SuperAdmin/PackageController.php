<?php

declare(strict_types=1);

namespace Salon\Controllers\SuperAdmin;

use Salon\Http\Request;
use Salon\Http\Response;
use Salon\Services\PackageService;

final class PackageController
{
    public static function features(Request $req): void
    {
        Response::json(PackageService::features());
    }

    public static function index(Request $req): void
    {
        $type = $req->query['business_type'] ?? null;
        Response::json(PackageService::all($type !== null && $type !== '' ? (string) $type : null));
    }

    public static function store(Request $req): void
    {
        try {
            $id = PackageService::save($req->body);
            Response::json(['id' => $id], 201);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage());
        }
    }

    public static function update(Request $req, array $params): void
    {
        try {
            $id = PackageService::save($req->body, (int) $params['id']);
            Response::json(['id' => $id]);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage());
        }
    }

    public static function destroy(Request $req, array $params): void
    {
        PackageService::delete((int) $params['id']);
        Response::json(['ok' => true]);
    }
}
