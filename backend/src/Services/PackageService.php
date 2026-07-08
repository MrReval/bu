<?php

declare(strict_types=1);

namespace Salon\Services;

use Salon\Database\Connection;

final class PackageService
{
    /** @return array<int,array<string,mixed>> */
    public static function features(): array
    {
        return Connection::get()->query('SELECT * FROM features ORDER BY sort_order, id')->fetchAll();
    }

    /** @return array<int,array<string,mixed>> */
    public static function all(): array
    {
        $pdo = Connection::get();
        $packages = $pdo->query('SELECT * FROM packages ORDER BY id DESC')->fetchAll();
        $fstmt = $pdo->prepare('SELECT feature_id FROM package_features WHERE package_id = ?');
        foreach ($packages as &$p) {
            $fstmt->execute([(int) $p['id']]);
            $p['feature_ids'] = array_map('intval', array_column($fstmt->fetchAll(), 'feature_id'));
            $cnt = $pdo->prepare('SELECT COUNT(*) FROM sites WHERE package_id = ?');
            $cnt->execute([(int) $p['id']]);
            $p['sites_count'] = (int) $cnt->fetchColumn();
        }
        return $packages;
    }

    public static function save(array $data, ?int $id = null): int
    {
        $pdo = Connection::get();
        $name = trim($data['name'] ?? '');
        if ($name === '') {
            throw new \InvalidArgumentException('نام پکیج الزامی است');
        }
        $monthly = (int) ($data['price_monthly'] ?? 0);
        $yearly = (int) ($data['price_yearly'] ?? 0);
        $desc = trim($data['description'] ?? '');
        $isActive = (int) ($data['is_active'] ?? 1);
        $featureIds = array_map('intval', $data['feature_ids'] ?? []);

        $pdo->beginTransaction();
        try {
            if ($id) {
                $pdo->prepare('UPDATE packages SET name=?, description=?, price_monthly=?, price_yearly=?, is_active=? WHERE id=?')
                    ->execute([$name, $desc, $monthly, $yearly, $isActive, $id]);
            } else {
                $pdo->prepare('INSERT INTO packages (name, description, price_monthly, price_yearly, is_active) VALUES (?,?,?,?,?)')
                    ->execute([$name, $desc, $monthly, $yearly, $isActive]);
                $id = (int) $pdo->lastInsertId();
            }
            $pdo->prepare('DELETE FROM package_features WHERE package_id = ?')->execute([$id]);
            $ins = $pdo->prepare('INSERT INTO package_features (package_id, feature_id) VALUES (?, ?)');
            foreach ($featureIds as $fid) {
                $ins->execute([$id, $fid]);
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
        return (int) $id;
    }

    public static function delete(int $id): void
    {
        $pdo = Connection::get();
        $pdo->prepare('UPDATE sites SET package_id = NULL WHERE package_id = ?')->execute([$id]);
        $pdo->prepare('DELETE FROM packages WHERE id = ?')->execute([$id]);
    }
}
