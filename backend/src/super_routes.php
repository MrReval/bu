<?php

declare(strict_types=1);

use Salon\Controllers\SuperAdmin\AuthController;
use Salon\Controllers\SuperAdmin\DashboardController;
use Salon\Controllers\SuperAdmin\PackageController;
use Salon\Controllers\SuperAdmin\SiteController;
use Salon\Controllers\SuperAdmin\SmsController;
use Salon\Router;

return function (Router $router): void {
    $platform = [Router::PLATFORM];

    $router->post('/api/v1/super/auth/login', [AuthController::class, 'login']);
    $router->get('/api/v1/super/auth/me', [AuthController::class, 'me'], $platform);

    $router->get('/api/v1/super/dashboard', [DashboardController::class, 'stats'], $platform);

    $router->get('/api/v1/super/sites', [SiteController::class, 'index'], $platform);
    $router->get('/api/v1/super/sites/{id}', [SiteController::class, 'show'], $platform);
    $router->post('/api/v1/super/sites', [SiteController::class, 'store'], $platform);
    $router->patch('/api/v1/super/sites/{id}', [SiteController::class, 'update'], $platform);
    $router->delete('/api/v1/super/sites/{id}', [SiteController::class, 'destroy'], $platform);
    $router->post('/api/v1/super/sites/{id}/reset-password', [SiteController::class, 'resetPassword'], $platform);

    $router->get('/api/v1/super/features', [PackageController::class, 'features'], $platform);
    $router->get('/api/v1/super/packages', [PackageController::class, 'index'], $platform);
    $router->post('/api/v1/super/packages', [PackageController::class, 'store'], $platform);
    $router->patch('/api/v1/super/packages/{id}', [PackageController::class, 'update'], $platform);
    $router->delete('/api/v1/super/packages/{id}', [PackageController::class, 'destroy'], $platform);

    $router->get('/api/v1/super/sms', [SmsController::class, 'get'], $platform);
    $router->patch('/api/v1/super/sms', [SmsController::class, 'update'], $platform);
    $router->post('/api/v1/super/sms/test', [SmsController::class, 'test'], $platform);
};
