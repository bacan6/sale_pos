<?php
declare(strict_types=1);

use App\Middleware\HmacAuth;
use App\Middleware\HttpsEnforce;
use App\Middleware\PlatformAdminAuth;
use App\Middleware\TenantMiddleware;
use App\Controllers\SaasRegistrationController;
use App\Controllers\PlatformAdminController;
use App\Controllers\DeviceProvisioningController;
use App\Controllers\ProductCategoryController;
use App\Controllers\RoomCategoryController;
use App\Controllers\ProductController;
use App\Controllers\TableController;
use App\Controllers\UserController;
use App\Controllers\OrderController;
use App\Controllers\KitchenTicketController;
use App\Controllers\PaymentController;
use App\Controllers\SyncController;

// Middleware Stacks
$adminAuth = [HttpsEnforce::class, PlatformAdminAuth::class];
$tenantAuth = [HttpsEnforce::class, HmacAuth::class, TenantMiddleware::class];

// 1. Public Endpoints
$router->get('/health', function() {
    App\Core\Response::success([
        'uptime' => 'ok',
        'timestamp' => time(),
        'platform' => 'Cafe POS Multi-Tenant SaaS',
    ], 'API Gateway Kopi Senja SaaS Siap Digunakan');
});

// 2. Public SaaS Onboarding (Tenant Self-Registration)
$router->post('/v1/saas/register', [SaasRegistrationController::class, 'register'], [HttpsEnforce::class]);

// 3. Platform Super Admin (Master Secret Protected)
$router->get('/v1/admin/tenants', [PlatformAdminController::class, 'indexTenants'], $adminAuth);
$router->get('/v1/admin/tenants/{id}', [PlatformAdminController::class, 'showTenant'], $adminAuth);
$router->put('/v1/admin/tenants/{id}/status', [PlatformAdminController::class, 'updateStatus'], $adminAuth);
$router->post('/v1/admin/tenants/{id}/subscription', [PlatformAdminController::class, 'updateSubscription'], $adminAuth);

// 4. Tenant Device Management (POS Provisioning)
$router->get('/v1/devices', [DeviceProvisioningController::class, 'index'], $tenantAuth);
$router->post('/v1/devices', [DeviceProvisioningController::class, 'store'], $tenantAuth);
$router->delete('/v1/devices/{id}', [DeviceProvisioningController::class, 'destroy'], $tenantAuth);

// 5. Tenant Product Categories
$router->get('/v1/product-categories', [ProductCategoryController::class, 'index'], $tenantAuth);
$router->get('/v1/product-categories/{id}', [ProductCategoryController::class, 'show'], $tenantAuth);
$router->post('/v1/product-categories', [ProductCategoryController::class, 'store'], $tenantAuth);
$router->put('/v1/product-categories/{id}', [ProductCategoryController::class, 'update'], $tenantAuth);
$router->delete('/v1/product-categories/{id}', [ProductCategoryController::class, 'destroy'], $tenantAuth);

// 6. Tenant Room Categories (Zonasi Ruangan)
$router->get('/v1/room-categories', [RoomCategoryController::class, 'index'], $tenantAuth);
$router->get('/v1/room-categories/{id}', [RoomCategoryController::class, 'show'], $tenantAuth);
$router->post('/v1/room-categories', [RoomCategoryController::class, 'store'], $tenantAuth);
$router->put('/v1/room-categories/{id}', [RoomCategoryController::class, 'update'], $tenantAuth);
$router->delete('/v1/room-categories/{id}', [RoomCategoryController::class, 'destroy'], $tenantAuth);

// 7. Tenant Products (Menu & Harga)
$router->get('/v1/products', [ProductController::class, 'index'], $tenantAuth);
$router->get('/v1/products/{id}', [ProductController::class, 'show'], $tenantAuth);
$router->post('/v1/products', [ProductController::class, 'store'], $tenantAuth);
$router->put('/v1/products/{id}', [ProductController::class, 'update'], $tenantAuth);
$router->delete('/v1/products/{id}', [ProductController::class, 'destroy'], $tenantAuth);

// 8. Tenant Tables (Meja & Denah)
$router->get('/v1/tables', [TableController::class, 'index'], $tenantAuth);
$router->get('/v1/tables/{id}', [TableController::class, 'show'], $tenantAuth);
$router->post('/v1/tables', [TableController::class, 'store'], $tenantAuth);
$router->put('/v1/tables/{id}', [TableController::class, 'update'], $tenantAuth);
$router->delete('/v1/tables/{id}', [TableController::class, 'destroy'], $tenantAuth);

// 9. Tenant Users (Staff & Kasir)
$router->get('/v1/users', [UserController::class, 'index'], $tenantAuth);
$router->get('/v1/users/{id}', [UserController::class, 'show'], $tenantAuth);
$router->post('/v1/users', [UserController::class, 'store'], $tenantAuth);
$router->put('/v1/users/{id}', [UserController::class, 'update'], $tenantAuth);

// 10. Tenant Orders (Transaksi Kasir & Waitstaff)
$router->get('/v1/orders', [OrderController::class, 'index'], $tenantAuth);
$router->get('/v1/orders/{id}', [OrderController::class, 'show'], $tenantAuth);
$router->post('/v1/orders', [OrderController::class, 'store'], $tenantAuth);
$router->put('/v1/orders/{id}/status', [OrderController::class, 'updateStatus'], $tenantAuth);

// 11. Tenant Kitchen Tickets (KDS & Antrian Dapur)
$router->get('/v1/kitchen-tickets', [KitchenTicketController::class, 'index'], $tenantAuth);
$router->post('/v1/kitchen-tickets', [KitchenTicketController::class, 'store'], $tenantAuth);
$router->put('/v1/kitchen-tickets/{id}/status', [KitchenTicketController::class, 'updateStatus'], $tenantAuth);

// 12. Tenant Payments (Pembayaran Kasir)
$router->get('/v1/payments', [PaymentController::class, 'index'], $tenantAuth);
$router->post('/v1/payments', [PaymentController::class, 'store'], $tenantAuth);

// 13. Tenant Periodic Sync Engine (Push & Pull berkala)
$router->post('/v1/sync/push', [SyncController::class, 'push'], $tenantAuth);
$router->get('/v1/sync/pull', [SyncController::class, 'pull'], $tenantAuth);
