<?php

declare(strict_types=1);

use Salon\Controllers\SuperAdmin\AuthController;
use Salon\Controllers\SuperAdmin\DashboardController;
use Salon\Controllers\SuperAdmin\LeadController;
use Salon\Controllers\SuperAdmin\MonitoringController;
use Salon\Controllers\SuperAdmin\PackageController;
use Salon\Controllers\SuperAdmin\SiteController;
use Salon\Controllers\SuperAdmin\SmsController;
use Salon\Controllers\SuperAdmin\StaffController;
use Salon\Router;

return function (Router $router): void {
    $platform = [Router::PLATFORM];
    $super = [Router::PLATFORM_SUPER];

    $router->post('/api/v1/super/auth/login', [AuthController::class, 'login']);
    $router->get('/api/v1/super/auth/me', [AuthController::class, 'me'], $platform);

    // فقط سوپرادمین کامل
    $router->get('/api/v1/super/dashboard', [DashboardController::class, 'stats'], $super);

    $router->get('/api/v1/super/sites', [SiteController::class, 'index'], $super);
    $router->get('/api/v1/super/sites/{id}', [SiteController::class, 'show'], $super);
    $router->post('/api/v1/super/sites', [SiteController::class, 'store'], $super);
    $router->patch('/api/v1/super/sites/{id}', [SiteController::class, 'update'], $super);
    $router->delete('/api/v1/super/sites/{id}', [SiteController::class, 'destroy'], $super);
    $router->post('/api/v1/super/sites/{id}/reset-password', [SiteController::class, 'resetPassword'], $super);

    $router->get('/api/v1/super/features', [PackageController::class, 'features'], $super);
    $router->get('/api/v1/super/packages', [PackageController::class, 'index'], $super);
    $router->post('/api/v1/super/packages', [PackageController::class, 'store'], $super);
    $router->patch('/api/v1/super/packages/{id}', [PackageController::class, 'update'], $super);
    $router->delete('/api/v1/super/packages/{id}', [PackageController::class, 'destroy'], $super);

    $router->get('/api/v1/super/sms', [SmsController::class, 'get'], $super);
    $router->patch('/api/v1/super/sms', [SmsController::class, 'update'], $super);
    $router->post('/api/v1/super/sms/test', [SmsController::class, 'test'], $super);

    $router->get('/api/v1/super/system', [MonitoringController::class, 'system'], $super);
    $router->get('/api/v1/super/logs', [MonitoringController::class, 'logs'], $super);
    $router->delete('/api/v1/super/logs', [MonitoringController::class, 'clearLogs'], $super);

    // مدیریت اکانت کارمندان (فقط سوپرادمین)
    $router->get('/api/v1/super/staff', [StaffController::class, 'index'], $super);
    $router->post('/api/v1/super/staff', [StaffController::class, 'store'], $super);
    $router->patch('/api/v1/super/staff/{id}', [StaffController::class, 'update'], $super);
    $router->delete('/api/v1/super/staff/{id}', [StaffController::class, 'destroy'], $super);

    // سرنخ‌ها: سوپرادمین و کارمند
    $router->get('/api/v1/super/leads', [LeadController::class, 'index'], $platform);
    $router->post('/api/v1/super/leads', [LeadController::class, 'store'], $platform);
    $router->patch('/api/v1/super/leads/{id}', [LeadController::class, 'update'], $platform);
    $router->delete('/api/v1/super/leads/{id}', [LeadController::class, 'destroy'], $platform);
};
