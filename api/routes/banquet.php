<?php
declare(strict_types=1);

use App\Middleware\HttpsEnforce;
use App\Middleware\BearerAuth;
use App\Middleware\BanquetModuleGuard;
use App\Modules\Banquet\Controllers\BanquetRoomController;
use App\Modules\Banquet\Controllers\BanquetPackageController;
use App\Modules\Banquet\Controllers\BanquetBookingController;

$banquetAuth = [HttpsEnforce::class, BearerAuth::class, BanquetModuleGuard::class];

// 1. Banquet Rooms / Event Spaces
$router->get('/v1/banquet/rooms', [BanquetRoomController::class, 'index'], $banquetAuth);
$router->get('/v1/banquet/rooms/{id}', [BanquetRoomController::class, 'show'], $banquetAuth);
$router->post('/v1/banquet/rooms', [BanquetRoomController::class, 'store'], $banquetAuth);
$router->put('/v1/banquet/rooms/{id}', [BanquetRoomController::class, 'update'], $banquetAuth);
$router->delete('/v1/banquet/rooms/{id}', [BanquetRoomController::class, 'destroy'], $banquetAuth);

// 2. Banquet Packages & Equipment
$router->get('/v1/banquet/packages', [BanquetPackageController::class, 'index'], $banquetAuth);
$router->get('/v1/banquet/packages/{id}', [BanquetPackageController::class, 'show'], $banquetAuth);
$router->post('/v1/banquet/packages', [BanquetPackageController::class, 'store'], $banquetAuth);
$router->put('/v1/banquet/packages/{id}', [BanquetPackageController::class, 'update'], $banquetAuth);
$router->delete('/v1/banquet/packages/{id}', [BanquetPackageController::class, 'destroy'], $banquetAuth);

// 3. Banquet Bookings (BEO) & Schedule Conflict Check
$router->get('/v1/banquet/bookings', [BanquetBookingController::class, 'index'], $banquetAuth);
$router->get('/v1/banquet/bookings/{id}', [BanquetBookingController::class, 'show'], $banquetAuth);
$router->post('/v1/banquet/bookings', [BanquetBookingController::class, 'store'], $banquetAuth);
$router->put('/v1/banquet/bookings/{id}/status', [BanquetBookingController::class, 'updateStatus'], $banquetAuth);
$router->post('/v1/banquet/bookings/{id}/payments', [BanquetBookingController::class, 'recordPayment'], $banquetAuth);
$router->post('/v1/banquet/check-conflict', [BanquetBookingController::class, 'checkConflict'], $banquetAuth);
$router->get('/v1/banquet/timeline', [BanquetBookingController::class, 'timeline'], $banquetAuth);
