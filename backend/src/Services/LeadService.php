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

    public const PRIORITIES = ['low', 'normal', 'high'];

    public static function counts(?string $mineEmployee = null): array
    {
        $pdo = Connection::get();
        $params = [];
        $mineSql = '';
        if ($mineEmployee !== null && $mineEmployee !== '') {
            $mineSql = ' AND employee_name = ?';
            $params[] = $mineEmployee;
        }

        $sql = 'SELECT status, COUNT(*) AS cnt FROM leads WHERE 1=1' . $mineSql . ' GROUP BY status';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        $out = ['all' => 0, 'mine' => 0, 'high' => 0];
        foreach (self::STATUSES as $s) {
            $out[$s] = 0;
        }
        foreach ($rows as $r) {
            $st = (string) $r['status'];
            $c = (int) $r['cnt'];
            $out[$st] = $c;
            $out['all'] += $c;
        }

        $followParams = $params;
        $followSql = "SELECT COUNT(*) FROM leads
             WHERE status IN ('follow_up','whatsapp','no_answer','interested')
               AND next_follow_up_at IS NOT NULL
               AND next_follow_up_at <= NOW()" . $mineSql;
        $fs = $pdo->prepare($followSql);
        $fs->execute($followParams);
        $out['follow_due'] = (int) $fs->fetchColumn();

        $highSql = "SELECT COUNT(*) FROM leads WHERE priority = 'high' AND status NOT IN ('burned','converted')" . $mineSql;
        $hs = $pdo->prepare($highSql);
        $hs->execute($params);
        $out['high'] = (int) $hs->fetchColumn();

        return $out;
    }

    public static function salesStats(?string $mineEmployee = null): array
    {
        $pdo = Connection::get();
        $mineSql = '';
        $params = [];
        if ($mineEmployee) {
            $mineSql = ' AND employee_name = ?';
            $params[] = $mineEmployee;
        }

        $q = static function (string $sql, array $p) use ($pdo) {
            $st = $pdo->prepare($sql);
            $st->execute($p);
            return (int) $st->fetchColumn();
        };

        $newToday = $q('SELECT COUNT(*) FROM leads WHERE DATE(created_at) = CURDATE()' . $mineSql, $params);
        $contactedToday = $q(
            'SELECT COUNT(*) FROM leads WHERE DATE(last_contacted_at) = CURDATE()' . $mineSql,
            $params
        );
        $convertedWeek = $q(
            "SELECT COUNT(*) FROM leads WHERE status = 'converted' AND updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)" . $mineSql,
            $params
        );
        $activitiesToday = $q(
            'SELECT COUNT(*) FROM lead_activities a
             JOIN leads l ON l.id = a.lead_id
             WHERE DATE(a.created_at) = CURDATE()' . ($mineEmployee ? ' AND l.employee_name = ?' : ''),
            $params
        );
        $interestedOpen = $q(
            "SELECT COUNT(*) FROM leads WHERE status = 'interested'" . $mineSql,
            $params
        );

        return [
            'new_today' => $newToday,
            'contacted_today' => $contactedToday,
            'activities_today' => $activitiesToday,
            'converted_week' => $convertedWeek,
            'interested_open' => $interestedOpen,
        ];
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
        } elseif ($status === 'high') {
            $where[] = "l.priority = 'high' AND l.status NOT IN ('burned','converted')";
        } elseif ($status === 'mine') {
            $mine = trim((string) ($filters['mine'] ?? ''));
            if ($mine !== '') {
                $where[] = 'l.employee_name = ?';
                $params[] = $mine;
            }
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

        $priority = trim((string) ($filters['priority'] ?? ''));
        if ($priority !== '' && in_array($priority, self::PRIORITIES, true)) {
            $where[] = 'l.priority = ?';
            $params[] = $priority;
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

        $order = "CASE l.priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END,
                  CASE WHEN l.next_follow_up_at IS NOT NULL AND l.next_follow_up_at <= NOW() THEN 0 ELSE 1 END,
                  l.updated_at DESC, l.id DESC";

        $sql = 'SELECT l.* FROM leads l WHERE ' . implode(' AND ', $where) . " ORDER BY {$order} LIMIT 500";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function employees(): array
    {
        $pdo = Connection::get();
        $fromLeads = $pdo->query(
            "SELECT DISTINCT employee_name AS name FROM leads WHERE employee_name <> ''"
        )->fetchAll(\PDO::FETCH_COLUMN);
        $fromStaff = $pdo->query(
            "SELECT name FROM platform_admins WHERE role = 'employee' AND is_active = 1"
        )->fetchAll(\PDO::FETCH_COLUMN);
        $names = array_unique(array_merge(
            array_map('strval', $fromStaff ?: []),
            array_map('strval', $fromLeads ?: [])
        ));
        sort($names, SORT_STRING);
        return array_values($names);
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

    public static function activities(int $leadId): array
    {
        self::find($leadId);
        $stmt = Connection::get()->prepare(
            'SELECT * FROM lead_activities WHERE lead_id = ? ORDER BY id DESC LIMIT 100'
        );
        $stmt->execute([$leadId]);
        return $stmt->fetchAll();
    }

    public static function create(array $data, ?int $createdBy = null, ?string $adminName = null): array
    {
        $person = trim((string) ($data['person_name'] ?? ''));
        $phone = self::normalizePhone((string) ($data['phone'] ?? ''));
        if ($person === '') {
            throw new \InvalidArgumentException('نام شخص الزامی است');
        }
        if ($phone === '') {
            throw new \InvalidArgumentException('شماره تماس الزامی است');
        }

        $dup = self::findByPhone($phone);
        if ($dup) {
            throw new \InvalidArgumentException('این شماره قبلاً ثبت شده: ' . ($dup['person_name'] ?? ''));
        }

        $status = (string) ($data['status'] ?? 'new');
        if (!in_array($status, self::STATUSES, true)) {
            $status = 'new';
        }
        $priority = (string) ($data['priority'] ?? 'normal');
        if (!in_array($priority, self::PRIORITIES, true)) {
            $priority = 'normal';
        }

        $pdo = Connection::get();
        $stmt = $pdo->prepare(
            'INSERT INTO leads
             (person_name, business_name, phone, status, priority, source, employee_name, notes,
              next_follow_up_at, last_contacted_at, created_by)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)'
        );
        $stmt->execute([
            $person,
            trim((string) ($data['business_name'] ?? '')),
            $phone,
            $status,
            $priority,
            trim((string) ($data['source'] ?? 'google')) ?: 'google',
            trim((string) ($data['employee_name'] ?? '')),
            trim((string) ($data['notes'] ?? '')),
            self::nullableDatetime($data['next_follow_up_at'] ?? null),
            self::nullableDatetime($data['last_contacted_at'] ?? null),
            $createdBy,
        ]);
        $id = (int) $pdo->lastInsertId();
        self::addActivity($id, 'created', 'سرنخ ثبت شد', $createdBy, $adminName, null, $status);
        return self::find($id);
    }

    /** @return array{created:int,skipped:int,errors:list<string>} */
    public static function bulkImport(array $rows, array $defaults, ?int $createdBy = null, ?string $adminName = null): array
    {
        $created = 0;
        $skipped = 0;
        $errors = [];
        foreach ($rows as $i => $row) {
            if (!is_array($row)) {
                continue;
            }
            try {
                $data = array_merge($defaults, $row);
                if (trim((string) ($data['person_name'] ?? '')) === '' && trim((string) ($data['phone'] ?? '')) !== '') {
                    $data['person_name'] = 'سرنخ ' . self::normalizePhone((string) $data['phone']);
                }
                self::create($data, $createdBy, $adminName);
                $created++;
            } catch (\InvalidArgumentException $e) {
                $msg = $e->getMessage();
                if (str_contains($msg, 'قبلاً ثبت شده')) {
                    $skipped++;
                } else {
                    $errors[] = 'ردیف ' . ($i + 1) . ': ' . $msg;
                }
            }
        }
        return ['created' => $created, 'skipped' => $skipped, 'errors' => array_slice($errors, 0, 20)];
    }

    public static function update(int $id, array $data, ?int $adminId = null, ?string $adminName = null): array
    {
        $before = self::find($id);
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
                if ($key === 'phone') {
                    $dup = self::findByPhone($val);
                    if ($dup && (int) $dup['id'] !== $id) {
                        throw new \InvalidArgumentException('این شماره قبلاً برای سرنخ دیگری ثبت شده');
                    }
                }
                $fields[] = "{$key} = ?";
                $params[] = $val;
            }
        }

        if (array_key_exists('priority', $data)) {
            $priority = (string) $data['priority'];
            if (!in_array($priority, self::PRIORITIES, true)) {
                throw new \InvalidArgumentException('اولویت نامعتبر است');
            }
            $fields[] = 'priority = ?';
            $params[] = $priority;
        }

        $newStatus = null;
        if (array_key_exists('status', $data)) {
            $status = (string) $data['status'];
            if (!in_array($status, self::STATUSES, true)) {
                throw new \InvalidArgumentException('وضعیت نامعتبر است');
            }
            $fields[] = 'status = ?';
            $params[] = $status;
            $newStatus = $status;
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

        if ($fields) {
            $params[] = $id;
            Connection::get()->prepare(
                'UPDATE leads SET ' . implode(', ', $fields) . ' WHERE id = ?'
            )->execute($params);
        }

        if ($newStatus !== null && $newStatus !== ($before['status'] ?? '')) {
            self::addActivity(
                $id,
                'status',
                'تغییر وضعیت',
                $adminId,
                $adminName,
                (string) ($before['status'] ?? ''),
                $newStatus
            );
        }

        return self::find($id);
    }

    /** ثبت نتیجه تماس / واتساپ در یک مرحله */
    public static function logOutcome(int $id, array $data, ?int $adminId = null, ?string $adminName = null): array
    {
        $before = self::find($id);
        $type = (string) ($data['type'] ?? 'call');
        if (!in_array($type, ['call', 'whatsapp', 'note'], true)) {
            $type = 'call';
        }
        $status = (string) ($data['status'] ?? $before['status']);
        if (!in_array($status, self::STATUSES, true)) {
            $status = (string) $before['status'];
        }
        $note = trim((string) ($data['notes'] ?? $data['message'] ?? ''));
        $follow = $data['next_follow_up_at'] ?? null;

        $payload = [
            'status' => $status,
            'last_contacted_at' => date('Y-m-d H:i:s'),
        ];
        if ($follow !== null) {
            $payload['next_follow_up_at'] = $follow;
        }
        if ($note !== '') {
            $prevNotes = trim((string) ($before['notes'] ?? ''));
            $stamp = date('Y-m-d H:i');
            $payload['notes'] = $prevNotes === ''
                ? "[{$stamp}] {$note}"
                : $prevNotes . "\n[{$stamp}] {$note}";
        }
        if (array_key_exists('priority', $data)) {
            $payload['priority'] = $data['priority'];
        }

        $lead = self::update($id, $payload, $adminId, $adminName);
        self::addActivity(
            $id,
            $type,
            $note !== '' ? $note : ($type === 'whatsapp' ? 'ارسال واتساپ' : ($type === 'call' ? 'تماس تلفنی' : 'یادداشت')),
            $adminId,
            $adminName,
            (string) ($before['status'] ?? ''),
            $status
        );
        return $lead;
    }

    public static function delete(int $id): void
    {
        Connection::get()->prepare('DELETE FROM leads WHERE id = ?')->execute([$id]);
    }

    public static function addActivity(
        int $leadId,
        string $type,
        string $message,
        ?int $adminId = null,
        ?string $adminName = null,
        ?string $oldStatus = null,
        ?string $newStatus = null
    ): void {
        try {
            Connection::get()->prepare(
                'INSERT INTO lead_activities (lead_id, admin_id, admin_name, type, message, old_status, new_status)
                 VALUES (?,?,?,?,?,?,?)'
            )->execute([
                $leadId,
                $adminId,
                $adminName ?? '',
                $type,
                $message,
                $oldStatus,
                $newStatus,
            ]);
        } catch (\Throwable) {
            // جدول ممکن است هنوز ساخته نشده باشد؛ نادیده بگیر
        }
    }

    private static function findByPhone(string $phone): ?array
    {
        if ($phone === '') {
            return null;
        }
        $stmt = Connection::get()->prepare('SELECT * FROM leads WHERE phone = ? LIMIT 1');
        $stmt->execute([$phone]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function normalizePhone(string $phone): string
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
