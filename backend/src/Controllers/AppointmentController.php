<?php

declare(strict_types=1);

namespace Salon\Controllers;

use Salon\Http\Request;
use Salon\Http\Response;
use Salon\Services\AppointmentService;

final class AppointmentController
{
    public static function create(Request $req): void
    {
        $customerId = $req->user ? (int) $req->user['id'] : null;
        try {
            $body = $req->body;
            if (!empty($body['staff_id_from_slot'])) {
                $body['staff_id'] = $body['staff_id_from_slot'];
            }
            Response::json(AppointmentService::create($body, $customerId), 201);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage());
        }
    }

    public static function myAppointments(Request $req): void
    {
        Response::json(AppointmentService::list(['customer_id' => (int) $req->user['id']]));
    }

    public static function cancel(Request $req, array $params): void
    {
        $id = (int) $params['id'];
        try {
            $apt = AppointmentService::getById($id);
            if ((int) $apt['customer_id'] !== (int) $req->user['id'] && !in_array($req->user['role'], ['manager', 'super_admin', 'staff'], true)) {
                Response::error('دسترسی غیرمجاز', 403);
            }
            Response::json(AppointmentService::updateStatus($id, 'cancelled', (int) $req->user['id']));
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage());
        }
    }
}
