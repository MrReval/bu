<?php

declare(strict_types=1);

namespace Salon\Services;

use Salon\Database\Connection;
use Salon\Tenant\TenantContext;

final class AuthService
{
    public static function register(array $data): array
    {
        $pdo = Connection::get();
        $siteId = TenantContext::siteId();
        $name = trim($data['name'] ?? '');
        $phone = trim($data['phone'] ?? '');
        $email = trim($data['email'] ?? '') ?: null;
        $password = $data['password'] ?? '';

        if ($name === '' || $phone === '' || strlen($password) < 6) {
            throw new \InvalidArgumentException('نام، موبایل و رمز (حداقل ۶ کاراکتر) الزامی است');
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare(
            'INSERT INTO users (site_id, name, phone, email, password_hash, role) VALUES (?, ?, ?, ?, ?, "customer")'
        );
        try {
            $stmt->execute([$siteId, $name, $phone, $email, $hash]);
        } catch (\PDOException $e) {
            throw new \InvalidArgumentException('این موبایل یا ایمیل قبلاً ثبت شده');
        }

        $userId = (int) $pdo->lastInsertId();
        $pdo->prepare('INSERT INTO customers (user_id) VALUES (?)')->execute([$userId]);

        return self::issueToken($userId);
    }

    public static function login(string $login, string $password): array
    {
        $pdo = Connection::get();
        $siteId = TenantContext::siteId();
        $stmt = $pdo->prepare(
            'SELECT * FROM users WHERE site_id = ? AND (phone = ? OR email = ?) LIMIT 1'
        );
        $stmt->execute([$siteId, $login, $login]);
        $user = $stmt->fetch();
        if (!$user || !password_verify($password, $user['password_hash'])) {
            throw new \InvalidArgumentException('اطلاعات ورود نادرست است');
        }

        $pdo->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?')
            ->execute([$user['id']]);

        return self::issueToken((int) $user['id']);
    }

    public static function issueToken(int $userId): array
    {
        $pdo = Connection::get();
        $siteId = TenantContext::siteId();
        $token = bin2hex(random_bytes(32));
        $expires = date('Y-m-d H:i:s', strtotime('+30 days'));
        $pdo->prepare('INSERT INTO api_tokens (site_id, user_id, token, expires_at) VALUES (?, ?, ?, ?)')
            ->execute([$siteId, $userId, $token, $expires]);

        $stmt = $pdo->prepare('SELECT id, name, email, phone, role FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        return ['token' => $token, 'expires_at' => $expires, 'user' => $user];
    }

    public static function createAdmin(string $name, string $email, string $password, string $role = 'super_admin', ?int $siteId = null): int
    {
        $pdo = Connection::get();
        $siteId = $siteId ?? TenantContext::siteId();
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $phone = '09' . random_int(100000000, 999999999);
        $stmt = $pdo->prepare(
            'INSERT INTO users (site_id, name, phone, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([$siteId, $name, $phone, $email, $hash, $role]);
        return (int) $pdo->lastInsertId();
    }
}
