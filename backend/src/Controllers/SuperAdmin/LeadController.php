<?php

declare(strict_types=1);

namespace Salon\Controllers\SuperAdmin;

use Salon\Http\Request;
use Salon\Http\Response;
use Salon\Services\LeadService;

final class LeadController
{
    public static function index(Request $req): void
    {
        Response::json([
            'leads' => LeadService::list($req->query),
            'counts' => LeadService::counts(),
            'employees' => LeadService::employees(),
            'statuses' => LeadService::STATUSES,
        ]);
    }

    public static function store(Request $req): void
    {
        try {
            $createdBy = isset($req->user['id']) ? (int) $req->user['id'] : null;
            $body = $req->body;
            // برای کارمند، نام خودش به‌عنوان ثبت‌کننده ست می‌شود
            if (($req->user['role'] ?? '') === 'employee') {
                $body['employee_name'] = trim((string) ($body['employee_name'] ?? '')) !== ''
                    ? $body['employee_name']
                    : (string) ($req->user['name'] ?? '');
            }
            Response::json(LeadService::create($body, $createdBy), 201);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage());
        }
    }

    public static function update(Request $req, array $params): void
    {
        try {
            Response::json(LeadService::update((int) $params['id'], $req->body));
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage());
        }
    }

    public static function destroy(Request $req, array $params): void
    {
        LeadService::delete((int) $params['id']);
        Response::json(['ok' => true]);
    }
}
