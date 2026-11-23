<?php
declare(strict_types=1);

use App\Middleware\HttpsEnforce;
use App\Middleware\BearerAuth;
use App\Middleware\LaundryModuleGuard;
use App\Modules\Laundry\Controllers\LaundryServiceController;
use App\Modules\Laundry\Controllers\LaundryPerfumeController;
use App\Modules\Laundry\Controllers\LaundryRackController;
use App\Modules\Laundry\Controllers\LaundryOrderController;
use App\Modules\Laundry\Controllers\LaundryPaymentController;
use App\Modules\Laundry\Controllers\LaundryTrackingController;

$laundryAuth = [HttpsEnforce::class, BearerAuth::class, LaundryModuleGuard::class];

// 1. Public Order Tracking (Untuk Pelanggan dengan Kode Nota/Tracking)
$router->get('/v1/laundry/track/{code}', [LaundryTrackingController::class, 'track'], [HttpsEnforce::class]);

// 2. Master Services (Katalog Kiloan & Satuan)
$router->get('/v1/laundry/services', [LaundryServiceController::class, 'index'], $laundryAuth);
$router->get('/v1/laundry/services/{id}', [LaundryServiceController::class, 'show'], $laundryAuth);
$router->post('/v1/laundry/services', [LaundryServiceController::class, 'store'], $laundryAuth);
$router->put('/v1/laundry/services/{id}', [LaundryServiceController::class, 'update'], $laundryAuth);
$router->delete('/v1/laundry/services/{id}', [LaundryServiceController::class, 'destroy'], $laundryAuth);

// 3. Master Fragrance / Perfumes
$router->get('/v1/laundry/perfumes', [LaundryPerfumeController::class, 'index'], $laundryAuth);
$router->post('/v1/laundry/perfumes', [LaundryPerfumeController::class, 'store'], $laundryAuth);
$router->put('/v1/laundry/perfumes/{id}', [LaundryPerfumeController::class, 'update'], $laundryAuth);
$router->delete('/v1/laundry/perfumes/{id}', [LaundryPerfumeController::class, 'destroy'], $laundryAuth);

// 4. Master Storage Racks
$router->get('/v1/laundry/racks', [LaundryRackController::class, 'index'], $laundryAuth);
$router->post('/v1/laundry/racks', [LaundryRackController::class, 'store'], $laundryAuth);
$router->put('/v1/laundry/racks/{id}', [LaundryRackController::class, 'update'], $laundryAuth);
$router->delete('/v1/laundry/racks/{id}', [LaundryRackController::class, 'destroy'], $laundryAuth);

// 5. Laundry Orders (Intake, Workstation Pipeline & Rack Assignment)
$router->get('/v1/laundry/orders', [LaundryOrderController::class, 'index'], $laundryAuth);
$router->get('/v1/laundry/orders/{id}', [LaundryOrderController::class, 'show'], $laundryAuth);
$router->post('/v1/laundry/orders', [LaundryOrderController::class, 'store'], $laundryAuth);
$router->put('/v1/laundry/orders/{id}/status', [LaundryOrderController::class, 'updateStatus'], $laundryAuth);
$router->put('/v1/laundry/orders/{id}/rack', [LaundryOrderController::class, 'assignRack'], $laundryAuth);

// 6. Laundry Payments & Settlements
$router->post('/v1/laundry/payments', [LaundryPaymentController::class, 'store'], $laundryAuth);
