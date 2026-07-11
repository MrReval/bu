<?php

declare(strict_types=1);

namespace Salon\Controllers\SuperAdmin;

use Salon\Http\Request;
use Salon\Http\Response;
use Salon\Services\LeadService;
use Salon\Services\PlatformAuthService;

final class LeadController
{
    public static function index(Request $req): void
    {
        $query = $req->query;
        $mineName = null;
        $isEmployee = ($req->user['role'] ?? '') === PlatformAuthService::ROLE_EMPLOYEE;
        if ($isEmployee) {
            $mineName = (string) ($req->user['name'] ?? '');
            if (($query['status'] ?? '') === 'mine') {
                $query['mine'] = $mineName;
                $query['employee'] = $mineName;
            }
        }

        Response::json([
            'leads' => LeadService::list($query),
            'counts' => LeadService::counts($isEmployee ? $mineName : null),
            'stats' => LeadService::salesStats($isEmployee ? $mineName : null),
            'employees' => LeadService::employees(),
            'statuses' => LeadService::STATUSES,
            'priorities' => LeadService::PRIORITIES,
        ]);
    }

    public static function store(Request $req): void
    {
        try {
            $createdBy = isset($req->user['id']) ? (int) $req->user['id'] : null;
            $adminName = (string) ($req->user['name'] ?? '');
            $body = $req->body;
            if (($req->user['role'] ?? '') === PlatformAuthService::ROLE_EMPLOYEE) {
                $body['employee_name'] = $adminName;
            }
            Response::json(LeadService::create($body, $createdBy, $adminName), 201);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage());
        }
    }

    public static function bulk(Request $req): void
    {
        try {
            $createdBy = isset($req->user['id']) ? (int) $req->user['id'] : null;
            $adminName = (string) ($req->user['name'] ?? '');
            $rows = $req->body['rows'] ?? [];
            if (!is_array($rows) || !$rows) {
                // پشتیبانی از متن خام: هر خط = نام | مجموعه | شماره  یا فقط شماره
                $text = (string) ($req->body['text'] ?? '');
                $rows = self::parseBulkText($text);
            }
            if (!$rows) {
                throw new \InvalidArgumentException('لیست سرنخ خالی است');
            }
            $defaults = [
                'source' => (string) ($req->body['source'] ?? 'google'),
                'status' => (string) ($req->body['status'] ?? 'new'),
                'priority' => (string) ($req->body['priority'] ?? 'normal'),
                'employee_name' => (string) ($req->body['employee_name'] ?? ''),
            ];
            if (($req->user['role'] ?? '') === PlatformAuthService::ROLE_EMPLOYEE) {
                $defaults['employee_name'] = $adminName;
            }
            Response::json(LeadService::bulkImport($rows, $defaults, $createdBy, $adminName));
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage());
        }
    }

    public static function update(Request $req, array $params): void
    {
        try {
            $adminId = isset($req->user['id']) ? (int) $req->user['id'] : null;
            $adminName = (string) ($req->user['name'] ?? '');
            $body = $req->body;
            if (($req->user['role'] ?? '') === PlatformAuthService::ROLE_EMPLOYEE) {
                unset($body['employee_name']);
            }
            Response::json(LeadService::update((int) $params['id'], $body, $adminId, $adminName));
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage());
        }
    }

    public static function outcome(Request $req, array $params): void
    {
        try {
            $adminId = isset($req->user['id']) ? (int) $req->user['id'] : null;
            $adminName = (string) ($req->user['name'] ?? '');
            Response::json(LeadService::logOutcome((int) $params['id'], $req->body, $adminId, $adminName));
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage());
        }
    }

    public static function activities(Request $req, array $params): void
    {
        try {
            Response::json(['activities' => LeadService::activities((int) $params['id'])]);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 404);
        }
    }

    public static function destroy(Request $req, array $params): void
    {
        LeadService::delete((int) $params['id']);
        Response::json(['ok' => true]);
    }

    /** @return list<array<string,string>> */
    private static function parseBulkText(string $text): array
    {
        $rows = [];
        foreach (preg_split('/\r\n|\r|\n/', $text) ?: [] as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }
            // جداکننده: | یا , یا تب
            $parts = preg_split('/\s*[|,;\t]\s*/', $line) ?: [];
            $parts = array_values(array_filter(array_map('trim', $parts), static fn ($p) => $p !== ''));
            if (!$parts) {
                continue;
            }
            if (count($parts) === 1) {
                $rows[] = ['phone' => $parts[0], 'person_name' => ''];
            } elseif (count($parts) === 2) {
                // نام، شماره  یا  شماره، نام
                if (preg_match('/^\+?\d[\d\s-]{7,}$/', $parts[0])) {
                    $rows[] = ['phone' => $parts[0], 'person_name' => $parts[1]];
                } else {
                    $rows[] = ['person_name' => $parts[0], 'phone' => $parts[1]];
                }
            } else {
                $rows[] = [
                    'person_name' => $parts[0],
                    'business_name' => $parts[1],
                    'phone' => $parts[2],
                ];
            }
        }
        return $rows;
    }
}
