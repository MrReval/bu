<?php

declare(strict_types=1);

namespace Salon\Services;

use Salon\Database\Connection;

final class PlatformAuthService
{
    public static function login(string $email, string $password): array
    {
        $pdo = Connection::get();
        $stmt = $pdo->prepare('SELECT * FROM platform_admins WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $admin = $stmt->fetch();
        if (!$admin || !password_verify($password, $admin['password_hash'])) {
            throw new \InvalidArgumentException('اطلاعات ورود نادرست است');
        }
        $pdo->prepare('UPDATE platform_admins SET last_login_at = NOW() WHERE id = ?')->execute([$admin['id']]);
        return self::issueToken((int) $admin['id'], $admin);
    }

    public static function issueToken(int $adminId, ?array $admin = null): array
    {
        $pdo = Connection::get();
        $token = bin2hex(random_bytes(32));
        $expires = date('Y-m-d H:i:s', strtotime('+7 days'));
        $pdo->prepare('INSERT INTO platform_tokens (admin_id, token, expires_at) VALUES (?, ?, ?)')
            ->execute([$adminId, $token, $expires]);

        if ($admin === null) {
            $stmt = $pdo->prepare('SELECT * FROM platform_admins WHERE id = ?');
            $stmt->execute([$adminId]);
            $admin = $stmt->fetch();
        }

        return [
            'token' => $token,
            'expires_at' => $expires,
            'admin' => [
                'id' => (int) $admin['id'],
                'name' => $admin['name'],
                'email' => $admin['email'],
            ],
        ];
    }

    public static function createAdmin(string $name, string $email, string $password): int
    {
        $pdo = Connection::get();
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare('INSERT INTO platform_admins (name, email, password_hash) VALUES (?, ?, ?)');
        $stmt->execute([$name, $email, $hash]);
        return (int) $pdo->lastInsertId();
    }

    public static function ensureFirstAdmin(string $name, string $email, string $password): void
    {
        $pdo = Connection::get();
        $count = (int) $pdo->query('SELECT COUNT(*) FROM platform_admins')->fetchColumn();
        if ($count === 0) {
            self::createAdmin($name, $email, $password);
        }
    }
}
