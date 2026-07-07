<?php

declare(strict_types=1);

namespace Salon\Services;

use PDO;
use Salon\Database\Connection;
use Salon\Config;

final class AuthService
{
    public static function register(array $data): array
    {
        $pdo = Connection::get();
        $name = trim($data['name'] ?? '');
        $phone = trim($data['phone'] ?? '');
        $email = trim($data['email'] ?? '') ?: null;
        $password = $data['password'] ?? '';

        if ($name === '' || $phone === '' || strlen($password) < 6) {
            throw new \InvalidArgumentException('نام، موبایل و رمز (حداقل ۶ کاراکتر) الزامی است');
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare(
            'INSERT INTO users (name, phone, email, password_hash, role) VALUES (?, ?, ?, ?, "customer")'
        );
        try {
            $stmt->execute([$name, $phone, $email, $hash]);
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
        $stmt = $pdo->prepare(
            'SELECT * FROM users WHERE phone = ? OR email = ? LIMIT 1'
        );
        $stmt->execute([$login, $login]);
        $user = $stmt->fetch();
        if (!$user || !password_verify($password, $user['password_hash'])) {
            throw new \InvalidArgumentException('اطلاعات ورود نادرست است');
        }

        $pdo->prepare('UPDATE users SET last_login_at = datetime("now") WHERE id = ?')
            ->execute([$user['id']]);

        return self::issueToken((int) $user['id']);
    }

    public static function issueToken(int $userId): array
    {
        $pdo = Connection::get();
        $token = bin2hex(random_bytes(32));
        $expires = date('Y-m-d H:i:s', strtotime('+30 days'));
        $pdo->prepare('INSERT INTO api_tokens (user_id, token, expires_at) VALUES (?, ?, ?)')
            ->execute([$userId, $token, $expires]);

        $user = $pdo->query("SELECT id, name, email, phone, role FROM users WHERE id = $userId")->fetch();

        return ['token' => $token, 'expires_at' => $expires, 'user' => $user];
    }

    public static function createAdmin(string $name, string $email, string $password, string $role = 'super_admin'): int
    {
        $pdo = Connection::get();
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $phone = '09' . random_int(100000000, 999999999);
        $stmt = $pdo->prepare(
            'INSERT INTO users (name, phone, email, password_hash, role) VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([$name, $phone, $email, $hash, $role]);
        return (int) $pdo->lastInsertId();
    }
}
