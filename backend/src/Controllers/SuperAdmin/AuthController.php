<?php

declare(strict_types=1);

namespace Salon\Controllers\SuperAdmin;

use Salon\Http\Request;
use Salon\Http\Response;
use Salon\Services\PlatformAuthService;

final class AuthController
{
    public static function login(Request $req): void
    {
        $email = trim($req->body['email'] ?? '');
        $password = $req->body['password'] ?? '';
        try {
            Response::json(PlatformAuthService::login($email, $password));
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 401);
        }
    }

    public static function me(Request $req): void
    {
        Response::json(['admin' => PlatformAuthService::publicAdmin($req->user)]);
    }
}
