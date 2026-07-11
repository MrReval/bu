<?php

declare(strict_types=1);

namespace Salon\Services;

use Salon\Database\Connection;

final class LeadService
{
    public const STATUSES = [
        'new',
        'no_answer',
        'follow_up',
        'whatsapp',
        'interested',
        'burned',
        'converted',
    ];

    public static function counts(): array
    {
        $pdo = Connection::get();
        $rows = $pdo->query(
            'SELECT status, COUNT(*) AS cnt FROM leads GROUP BY status'
        )->fetchAll();
        $out = ['all' => 0];
        foreach (self::STATUSES as $s) {
            $out[$s] = 0;
        }
        foreach ($rows as $r) {
            $st = (string) $r['status'];
            $c = (int) $r['cnt'];
            $out[$st] = $c;
            $out['all'] += $c;
        }
        $out['follow_due'] = (int) $pdo->query(
            "SELECT COUNT(*) FROM leads
             WHERE status IN ('follow_up','whatsapp','no_answer','interested')
               AND next_follow_up_at IS NOT NULL
               AND next_follow_up_at <= NOW()"
        )->fetchColumn();
        return $out;
    }

    public static function list(array $filters = []): array
    {
        $pdo = Connection::get();
        $where = ['1=1'];
        $params = [];

        $status = trim((string) ($filters['status'] ?? ''));
        if ($status === 'follow_due') {
            $where[] = "l.status IN ('follow_up','whatsapp','no_answer','interested')";
            $where[] = 'l.next_follow_up_at IS NOT NULL AND l.next_follow_up_at <= NOW()';
        } elseif ($status !== '' && $status !== 'all' && in_array($status, self::STATUSES, true)) {
            $where[] = 'l.status = ?';
            $params[] = $status;
        }

        $q = trim((string) ($filters['q'] ?? ''));
        if ($q !== '') {
            $where[] = '(l.person_name LIKE ? OR l.business_name LIKE ? OR l.phone LIKE ? OR l.employee_name LIKE ? OR l.notes LIKE ?)';
            $like = '%' . $q . '%';
            array_push($params, $like, $like, $like, $like, $like);
        }

        $employee = trim((string) ($filters['employee'] ?? ''));
        if ($employee !== '') {
            $where[] = 'l.employee_name = ?';
            $params[] = $employee;
        }

        $source = trim((string) ($filters['source'] ?? ''));
        if ($source !== '') {
            $where[] = 'l.source = ?';
            $params[] = $source;
        }

        $from = trim((string) ($filters['from'] ?? ''));
        if ($from !== '') {
            $where[] = 'DATE(l.created_at) >= ?';
            $params[] = $from;
        }
        $to = trim((string) ($filters['to'] ?? ''));
        if ($to !== '') {
            $where[] = 'DATE(l.created_at) <= ?';
            $params[] = $to;
        }

        $sql = 'SELECT l.* FROM leads l WHERE ' . implode(' AND ', $where) . ' ORDER BY l.updated_at DESC, l.id DESC LIMIT 500';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function employees(): array
    {
        $pdo = Connection::get();
        $rows = $pdo->query(
            "SELECT DISTINCT employee_name FROM leads WHERE employee_name <> '' ORDER BY employee_name"
        )->fetchAll(\PDO::FETCH_COLUMN);
        return array_values(array_map('strval', $rows ?: []));
    }

    public static function find(int $id): array
    {
        $stmt = Connection::get()->prepare('SELECT * FROM leads WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            throw new \InvalidArgumentException('سرنخ یافت نشد');
        }
        return $row;
    }

    public static function create(array $data, ?int $createdBy = null): array
    {
        $person = trim((string) ($data['person_name'] ?? ''));
        $phone = self::normalizePhone((string) ($data['phone'] ?? ''));
        if ($person === '') {
            throw new \InvalidArgumentException('نام شخص الزامی است');
        }
        if ($phone === '') {
            throw new \InvalidArgumentException('شماره تماس الزامی است');
        }

        $status = (string) ($data['status'] ?? 'new');
        if (!in_array($status, self::STATUSES, true)) {
            $status = 'new';
        }

        $pdo = Connection::get();
        $stmt = $pdo->prepare(
            'INSERT INTO leads
             (person_name, business_name, phone, status, source, employee_name, notes,
              next_follow_up_at, last_contacted_at, created_by)
             VALUES (?,?,?,?,?,?,?,?,?,?)'
        );
        $stmt->execute([
            $person,
            trim((string) ($data['business_name'] ?? '')),
            $phone,
            $status,
            trim((string) ($data['source'] ?? 'google')) ?: 'google',
            trim((string) ($data['employee_name'] ?? '')),
            trim((string) ($data['notes'] ?? '')),
            self::nullableDatetime($data['next_follow_up_at'] ?? null),
            self::nullableDatetime($data['last_contacted_at'] ?? null),
            $createdBy,
        ]);
        return self::find((int) $pdo->lastInsertId());
    }

    public static function update(int $id, array $data): array
    {
        self::find($id);
        $fields = [];
        $params = [];

        $map = [
            'person_name' => static fn ($v) => trim((string) $v),
            'business_name' => static fn ($v) => trim((string) $v),
            'phone' => static fn ($v) => self::normalizePhone((string) $v),
            'source' => static fn ($v) => trim((string) $v) ?: 'google',
            'employee_name' => static fn ($v) => trim((string) $v),
            'notes' => static fn ($v) => trim((string) $v),
        ];
        foreach ($map as $key => $cast) {
            if (array_key_exists($key, $data)) {
                $val = $cast($data[$key]);
                if ($key === 'person_name' && $val === '') {
                    throw new \InvalidArgumentException('نام شخص الزامی است');
                }
                if ($key === 'phone' && $val === '') {
                    throw new \InvalidArgumentException('شماره تماس الزامی است');
                }
                $fields[] = "{$key} = ?";
                $params[] = $val;
            }
        }

        if (array_key_exists('status', $data)) {
            $status = (string) $data['status'];
            if (!in_array($status, self::STATUSES, true)) {
                throw new \InvalidArgumentException('وضعیت نامعتبر است');
            }
            $fields[] = 'status = ?';
            $params[] = $status;
            if (in_array($status, ['follow_up', 'whatsapp', 'no_answer', 'interested', 'burned', 'converted'], true)
                && !array_key_exists('last_contacted_at', $data)) {
                $fields[] = 'last_contacted_at = COALESCE(last_contacted_at, NOW())';
            }
        }

        if (array_key_exists('next_follow_up_at', $data)) {
            $fields[] = 'next_follow_up_at = ?';
            $params[] = self::nullableDatetime($data['next_follow_up_at']);
        }
        if (array_key_exists('last_contacted_at', $data)) {
            $fields[] = 'last_contacted_at = ?';
            $params[] = self::nullableDatetime($data['last_contacted_at']);
        }

        if (!$fields) {
            return self::find($id);
        }

        $params[] = $id;
        Connection::get()->prepare(
            'UPDATE leads SET ' . implode(', ', $fields) . ' WHERE id = ?'
        )->execute($params);

        return self::find($id);
    }

    public static function delete(int $id): void
    {
        Connection::get()->prepare('DELETE FROM leads WHERE id = ?')->execute([$id]);
    }

    private static function normalizePhone(string $phone): string
    {
        $phone = preg_replace('/[^\d+]/', '', trim($phone)) ?? '';
        if (str_starts_with($phone, '98') && strlen($phone) >= 12) {
            $phone = '0' . substr($phone, 2);
        }
        if (str_starts_with($phone, '+98')) {
            $phone = '0' . substr($phone, 3);
        }
        return $phone;
    }

    private static function nullableDatetime(mixed $v): ?string
    {
        if ($v === null || $v === '') {
            return null;
        }
        $s = trim((string) $v);
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $s)) {
            return $s . ' 00:00:00';
        }
        return $s;
    }
}
