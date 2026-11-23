<?php
declare(strict_types=1);

use App\Middleware\HttpsEnforce;
use App\Middleware\PlatformAdminAuth;
use App\Middleware\BearerAuth;
use App\Controllers\AuthController;
use App\Controllers\BillingSimulationController;
use App\Controllers\SaasRegistrationController;
use App\Controllers\PlatformAdminController;
use App\Controllers\UserController;
use App\Modules\Pos\Controllers\DeviceProvisioningController;

// Middleware Stacks
$adminAuth  = [HttpsEnforce::class, PlatformAdminAuth::class];
$bearerAuth = [HttpsEnforce::class, BearerAuth::class];

// 1. Public Health Check
$router->get('/health', function() {
    App\Core\Response::success([
        'uptime' => 'ok',
        'timestamp' => time(),
        'platform' => 'Multi-Business SaaS Gateway (Hotel PMS, Cafe POS, Laundry & Back-Office Accounting)',
        'modules' => ['pos', 'hotel', 'accounting', 'laundry'],
    ], 'API Gateway Siap Digunakan');
});

// 2. Auth Endpoints
$router->post('/v1/auth/signup', [AuthController::class, 'signup'], [HttpsEnforce::class]);
$router->post('/v1/auth/login', [AuthController::class, 'login'], [HttpsEnforce::class]);
$router->post('/v1/auth/logout', [AuthController::class, 'logout'], [HttpsEnforce::class]);
$router->get('/v1/auth/me', [AuthController::class, 'me'], $bearerAuth);

// 3. SaaS Billing & Lifecycle Simulation
$router->post('/v1/billing/simulate-activation', [BillingSimulationController::class, 'simulateActivation'], $bearerAuth);
$router->post('/v1/billing/simulate-recurring', [BillingSimulationController::class, 'simulateRecurring'], $bearerAuth);
$router->post('/v1/billing/simulate-status', [BillingSimulationController::class, 'simulateStatus'], $bearerAuth);
$router->post('/v1/billing/simulate-plan', [BillingSimulationController::class, 'simulatePlanChange'], $bearerAuth);
$router->get('/v1/billing/invoices', [BillingSimulationController::class, 'invoices'], $bearerAuth);

// 4. Public SaaS Onboarding
$router->post('/v1/saas/register', [SaasRegistrationController::class, 'register'], [HttpsEnforce::class]);

// 5. Platform Super Admin
$router->get('/v1/admin/tenants', [PlatformAdminController::class, 'indexTenants'], $adminAuth);
$router->get('/v1/admin/tenants/{id}', [PlatformAdminController::class, 'showTenant'], $adminAuth);
$router->put('/v1/admin/tenants/{id}/status', [PlatformAdminController::class, 'updateStatus'], $adminAuth);
$router->post('/v1/admin/tenants/{id}/subscription', [PlatformAdminController::class, 'updateSubscription'], $adminAuth);
$router->post('/v1/admin/tenants/{id}/simulate-billing', [BillingSimulationController::class, 'simulateForAdmin'], $adminAuth);

// 6. Tenant Users
$router->get('/v1/users', [UserController::class, 'index'], $bearerAuth);
$router->get('/v1/users/{id}', [UserController::class, 'show'], $bearerAuth);
$router->post('/v1/users', [UserController::class, 'store'], $bearerAuth);
$router->put('/v1/users/{id}', [UserController::class, 'update'], $bearerAuth);

// 7. Device Management
$router->get('/v1/devices', [DeviceProvisioningController::class, 'index'], $bearerAuth);
$router->post('/v1/devices', [DeviceProvisioningController::class, 'store'], $bearerAuth);
$router->delete('/v1/devices/{id}', [DeviceProvisioningController::class, 'destroy'], $bearerAuth);
