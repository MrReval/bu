<?php

declare(strict_types=1);

namespace Salon\Controllers;

use Salon\Http\Request;
use Salon\Http\Response;
use Salon\Services\AccountingService;
use Salon\Tenant\FeatureGate;

final class AccountingController
{
    public static function summary(Request $req): void
    {
        FeatureGate::require('accounting');
        $from = !empty($req->query['from']) ? (string) $req->query['from'] : null;
        $to = !empty($req->query['to']) ? (string) $req->query['to'] : null;
        $staffId = !empty($req->query['staff_id']) ? (int) $req->query['staff_id'] : null;
        Response::json(AccountingService::summary($from, $to, $staffId));
    }
}
