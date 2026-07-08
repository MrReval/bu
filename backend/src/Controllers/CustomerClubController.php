<?php

declare(strict_types=1);

namespace Salon\Controllers;

use Salon\Http\Request;
use Salon\Http\Response;
use Salon\Services\CustomerClubService;
use Salon\Tenant\FeatureGate;

final class CustomerClubController
{
    public static function index(Request $req): void
    {
        FeatureGate::require('customer_club');
        Response::json([
            'customers' => CustomerClubService::customers(),
            'birthdays' => CustomerClubService::birthdays(),
        ]);
    }

    public static function broadcast(Request $req): void
    {
        FeatureGate::require('customer_club');
        FeatureGate::require('sms');
        $b = $req->body;
        try {
            $result = CustomerClubService::broadcast(
                (string) ($b['message'] ?? ''),
                (string) ($b['audience'] ?? 'all'),
                is_array($b['ids'] ?? null) ? $b['ids'] : []
            );
            Response::json($result);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage());
        }
    }
}
