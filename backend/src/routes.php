<?php

declare(strict_types=1);

use Salon\Controllers\AdminController;
use Salon\Controllers\AppointmentController;
use Salon\Controllers\AuthController;
use Salon\Controllers\IntegrationController;
use Salon\Controllers\PaymentController;
use Salon\Controllers\PublicController;
use Salon\Router;

return function (Router $router): void {
    $router->get('/api/v1/settings/public', [PublicController::class, 'settings']);
    $router->get('/api/v1/landing/sections', [PublicController::class, 'landingSections']);
    $router->get('/api/v1/services', [PublicController::class, 'services']);
    $router->get('/api/v1/staff', [PublicController::class, 'staff']);
    $router->get('/api/v1/staff/{id}', [PublicController::class, 'staffDetail']);
    $router->get('/api/v1/gallery', [PublicController::class, 'gallery']);
    $router->get('/api/v1/availability', [PublicController::class, 'availability']);

    $router->post('/api/v1/auth/register', [AuthController::class, 'register']);
    $router->post('/api/v1/auth/login', [AuthController::class, 'login']);
    $router->get('/api/v1/auth/me', [AuthController::class, 'me'], ['customer', 'staff', 'manager', 'super_admin']);

    $router->post('/api/v1/appointments', [AppointmentController::class, 'create']);
    $router->get('/api/v1/me/appointments', [AppointmentController::class, 'myAppointments'], ['customer']);
    $router->patch('/api/v1/appointments/{id}/cancel', [AppointmentController::class, 'cancel'], ['customer', 'staff', 'manager', 'super_admin']);

    // پرداخت بیعانه (زیبال)
    $router->post('/api/v1/payments/deposit/{id}', [PaymentController::class, 'startDeposit']);
    $router->get('/api/v1/payments/callback', [PaymentController::class, 'callback']);

    $admin = ['manager', 'super_admin'];
    $staffAdmin = ['staff', 'manager', 'super_admin'];

    $router->get('/api/v1/admin/dashboard', [AdminController::class, 'dashboard'], $staffAdmin);
    $router->get('/api/v1/admin/appointments', [AdminController::class, 'appointments'], $staffAdmin);
    $router->get('/api/v1/admin/appointments/{id}', [AdminController::class, 'appointmentDetail'], $staffAdmin);
    $router->patch('/api/v1/admin/appointments/{id}/status', [AdminController::class, 'updateAppointmentStatus'], $staffAdmin);
    $router->post('/api/v1/admin/appointments', [AdminController::class, 'createAppointment'], $admin);

    $router->get('/api/v1/admin/settings', [AdminController::class, 'getSettings'], $admin);
    $router->patch('/api/v1/admin/settings', [AdminController::class, 'updateSettings'], $admin);
    $router->get('/api/v1/admin/landing/sections', [AdminController::class, 'landingSections'], $admin);
    $router->patch('/api/v1/admin/landing/sections/{id}', [AdminController::class, 'updateLandingSection'], $admin);

    $router->get('/api/v1/admin/services', [AdminController::class, 'services'], $admin);
    $router->post('/api/v1/admin/services', [AdminController::class, 'saveService'], $admin);
    $router->put('/api/v1/admin/services/{id}', [AdminController::class, 'saveService'], $admin);
    $router->delete('/api/v1/admin/services/{id}', [AdminController::class, 'deleteService'], $admin);
    $router->post('/api/v1/admin/categories', [AdminController::class, 'saveCategory'], $admin);
    $router->put('/api/v1/admin/categories/{id}', [AdminController::class, 'saveCategory'], $admin);

    $router->get('/api/v1/admin/staff', [AdminController::class, 'staffList'], $staffAdmin);
    $router->post('/api/v1/admin/staff', [AdminController::class, 'saveStaff'], $admin);
    $router->put('/api/v1/admin/staff/{id}', [AdminController::class, 'saveStaff'], $staffAdmin);

    $router->get('/api/v1/admin/gallery', [AdminController::class, 'galleryList'], $admin);
    $router->post('/api/v1/admin/gallery', [AdminController::class, 'uploadGallery'], $admin);
    $router->delete('/api/v1/admin/gallery/{id}', [AdminController::class, 'deleteGallery'], $admin);
    $router->post('/api/v1/admin/settings/hero-image', [AdminController::class, 'uploadHero'], $admin);
    $router->post('/api/v1/admin/settings/logo', [AdminController::class, 'uploadLogo'], $admin);

    $router->get('/api/v1/admin/staff/{id}/portfolio', [AdminController::class, 'staffPortfolio'], $staffAdmin);
    $router->post('/api/v1/admin/staff/{id}/portfolio', [AdminController::class, 'uploadStaffPortfolio'], $staffAdmin);
    $router->patch('/api/v1/admin/staff/{id}/portfolio/{itemId}', [AdminController::class, 'updateStaffPortfolio'], $staffAdmin);
    $router->delete('/api/v1/admin/staff/{id}/portfolio/{itemId}', [AdminController::class, 'deleteStaffPortfolio'], $staffAdmin);
    $router->post('/api/v1/admin/staff/{id}/avatar', [AdminController::class, 'uploadStaffAvatar'], $staffAdmin);

    $router->get('/api/v1/admin/customers', [AdminController::class, 'customers'], $admin);
    $router->get('/api/v1/admin/notifications', [AdminController::class, 'notifications'], $staffAdmin);
    $router->patch('/api/v1/admin/notifications/{id}/read', [AdminController::class, 'markNotificationRead'], $staffAdmin);
    $router->post('/api/v1/admin/notifications/read-all', [AdminController::class, 'markAllNotificationsRead'], $staffAdmin);

    $router->get('/api/v1/admin/system/info', [AdminController::class, 'systemInfo'], $admin);
    $router->get('/api/v1/admin/system/update/status', [AdminController::class, 'updateStatus'], $admin);
    $router->post('/api/v1/admin/system/update/start', [AdminController::class, 'startUpdate'], $admin);

    // یکپارچه‌سازی‌ها: پیامک و درگاه پرداخت (وابسته به فیچر پکیج)
    $router->get('/api/v1/admin/sms', [IntegrationController::class, 'getSms'], $admin);
    $router->patch('/api/v1/admin/sms', [IntegrationController::class, 'updateSms'], $admin);
    $router->post('/api/v1/admin/sms/test', [IntegrationController::class, 'testSms'], $admin);
    $router->get('/api/v1/admin/payment', [IntegrationController::class, 'getPayment'], $admin);
    $router->patch('/api/v1/admin/payment', [IntegrationController::class, 'updatePayment'], $admin);
};
