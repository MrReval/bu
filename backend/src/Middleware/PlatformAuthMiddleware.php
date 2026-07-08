<?php

declare(strict_types=1);

namespace Salon\Middleware;

use Salon\Database\Connection;
use Salon\Http\Request;
use Salon\Http\Response;

final class PlatformAuthMiddleware
{
    public static function handle(Request $request): Request
    {
        $token = $request->bearerToken();
        if (!$token) {
            Response::error('احراز هویت لازم است', 401);
        }
        $stmt = Connection::get()->prepare(
            'SELECT a.* FROM platform_tokens t JOIN platform_admins a ON a.id = t.admin_id
             WHERE t.token = ? AND t.expires_at > NOW()'
        );
        $stmt->execute([$token]);
        $admin = $stmt->fetch();
        if (!$admin) {
            Response::error('توکن نامعتبر', 401);
        }
        return $request->withUser($admin);
    }
}
