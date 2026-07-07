<?php

declare(strict_types=1);

namespace Salon\Middleware;

use Salon\Database\Connection;
use Salon\Http\Request;
use Salon\Http\Response;

final class AuthMiddleware
{
    public static function handle(Request $request, array $roles): Request
    {
        $token = $request->bearerToken();
        if (!$token) {
            Response::error('احراز هویت لازم است', 401);
        }

        $stmt = Connection::get()->prepare(
            'SELECT u.* FROM api_tokens t JOIN users u ON u.id = t.user_id
             WHERE t.token = ? AND t.expires_at > datetime("now")'
        );
        $stmt->execute([$token]);
        $user = $stmt->fetch();
        if (!$user) {
            Response::error('توکن نامعتبر', 401);
        }

        if (!in_array($user['role'], $roles, true)) {
            Response::error('دسترسی غیرمجاز', 403);
        }

        return $request->withUser($user);
    }
}
