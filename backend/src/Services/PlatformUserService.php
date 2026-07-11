<?php

declare(strict_types=1);

namespace Salon\Services;

use Salon\Database\Connection;

final class PlatformUserService
{
    public static function all(): array
    {
        $rows = Connection::get()->query(
            'SELECT id, name, email, role, is_active, last_login_at, created_at
             FROM platform_admins
             ORDER BY FIELD(role, \'super_admin\', \'employee\'), id ASC'
        )->fetchAll();
        return array_map(static fn ($r) => [
            'id' => (int) $r['id'],
            'name' => $r['name'],
            'email' => $r['email'],
            'role' => $r['role'] ?? PlatformAuthService::ROLE_SUPER,
            'is_active' => (int) ($r['is_active'] ?? 1),
            'last_login_at' => $r['last_login_at'],
            'created_at' => $r['created_at'],
        ], $rows);
    }

    public static function create(array $data): array
    {
        $name = trim((string) ($data['name'] ?? ''));
        $email = strtolower(trim((string) ($data['email'] ?? '')));
        $password = (string) ($data['password'] ?? '');
        $role = (string) ($data['role'] ?? PlatformAuthService::ROLE_EMPLOYEE);

        if ($name === '' || $email === '') {
            throw new \InvalidArgumentException('نام و ایمیل الزامی است');
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException('ایمیل نامعتبر است');
        }
        if (strlen($password) < 6) {
            throw new \InvalidArgumentException('رمز عبور حداقل ۶ کاراکتر باشد');
        }
        if (!in_array($role, [PlatformAuthService::ROLE_SUPER, PlatformAuthService::ROLE_EMPLOYEE], true)) {
            throw new \InvalidArgumentException('نقش نامعتبر است');
        }

        $pdo = Connection::get();
        $exists = $pdo->prepare('SELECT id FROM platform_admins WHERE email = ?');
        $exists->execute([$email]);
        if ($exists->fetch()) {
            throw new \InvalidArgumentException('این ایمیل قبلاً ثبت شده است');
        }

        $id = PlatformAuthService::createAdmin($name, $email, $password, $role);
        return self::find($id);
    }

    public static function update(int $id, array $data, int $actorId): array
    {
        $current = self::find($id);
        $fields = [];
        $params = [];

        if (array_key_exists('name', $data)) {
            $name = trim((string) $data['name']);
            if ($name === '') {
                throw new \InvalidArgumentException('نام الزامی است');
            }
            $fields[] = 'name = ?';
            $params[] = $name;
        }

        if (array_key_exists('email', $data)) {
            $email = strtolower(trim((string) $data['email']));
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                throw new \InvalidArgumentException('ایمیل نامعتبر است');
            }
            $dup = Connection::get()->prepare('SELECT id FROM platform_admins WHERE email = ? AND id <> ?');
            $dup->execute([$email, $id]);
            if ($dup->fetch()) {
                throw new \InvalidArgumentException('این ایمیل قبلاً ثبت شده است');
            }
            $fields[] = 'email = ?';
            $params[] = $email;
        }

        if (array_key_exists('role', $data)) {
            $role = (string) $data['role'];
            if (!in_array($role, [PlatformAuthService::ROLE_SUPER, PlatformAuthService::ROLE_EMPLOYEE], true)) {
                throw new \InvalidArgumentException('نقش نامعتبر است');
            }
            if ($current['role'] === PlatformAuthService::ROLE_SUPER && $role !== PlatformAuthService::ROLE_SUPER) {
                self::assertNotLastSuper($id);
            }
            $fields[] = 'role = ?';
            $params[] = $role;
        }

        if (array_key_exists('is_active', $data)) {
            $active = (int) ((bool) $data['is_active']);
            if (!$active && $current['role'] === PlatformAuthService::ROLE_SUPER) {
                self::assertNotLastSuper($id);
            }
            if (!$active && $id === $actorId) {
                throw new \InvalidArgumentException('نمی‌توانید حساب خودتان را غیرفعال کنید');
            }
            $fields[] = 'is_active = ?';
            $params[] = $active;
        }

        if (!empty($data['password'])) {
            $password = (string) $data['password'];
            if (strlen($password) < 6) {
                throw new \InvalidArgumentException('رمز عبور حداقل ۶ کاراکتر باشد');
            }
            $fields[] = 'password_hash = ?';
            $params[] = password_hash($password, PASSWORD_DEFAULT);
            // باطل کردن توکن‌های قبلی بعد از تغییر رمز
            Connection::get()->prepare('DELETE FROM platform_tokens WHERE admin_id = ?')->execute([$id]);
        }

        if ($fields) {
            $params[] = $id;
            Connection::get()->prepare(
                'UPDATE platform_admins SET ' . implode(', ', $fields) . ' WHERE id = ?'
            )->execute($params);
        }

        return self::find($id);
    }

    public static function delete(int $id, int $actorId): void
    {
        if ($id === $actorId) {
            throw new \InvalidArgumentException('نمی‌توانید حساب خودتان را حذف کنید');
        }
        $user = self::find($id);
        if ($user['role'] === PlatformAuthService::ROLE_SUPER) {
            self::assertNotLastSuper($id);
        }
        Connection::get()->prepare('DELETE FROM platform_admins WHERE id = ?')->execute([$id]);
    }

    public static function find(int $id): array
    {
        $stmt = Connection::get()->prepare(
            'SELECT id, name, email, role, is_active, last_login_at, created_at FROM platform_admins WHERE id = ?'
        );
        $stmt->execute([$id]);
        $r = $stmt->fetch();
        if (!$r) {
            throw new \InvalidArgumentException('کاربر یافت نشد');
        }
        return [
            'id' => (int) $r['id'],
            'name' => $r['name'],
            'email' => $r['email'],
            'role' => $r['role'] ?? PlatformAuthService::ROLE_SUPER,
            'is_active' => (int) ($r['is_active'] ?? 1),
            'last_login_at' => $r['last_login_at'],
            'created_at' => $r['created_at'],
        ];
    }

    private static function assertNotLastSuper(int $id): void
    {
        $stmt = Connection::get()->prepare(
            "SELECT COUNT(*) FROM platform_admins
             WHERE role = 'super_admin' AND is_active = 1 AND id <> ?"
        );
        $stmt->execute([$id]);
        if ((int) $stmt->fetchColumn() < 1) {
            throw new \InvalidArgumentException('حداقل یک سوپرادمین فعال باید باقی بماند');
        }
    }
}
