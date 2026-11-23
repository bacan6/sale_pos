<?php
declare(strict_types=1);

use App\Middleware\HttpsEnforce;
use App\Middleware\BearerAuth;
use App\Middleware\ParkingModuleGuard;
use App\Modules\Parking\Controllers\ParkingRateController;
use App\Modules\Parking\Controllers\ParkingGateController;
use App\Modules\Parking\Controllers\ParkingTicketController;
use App\Modules\Parking\Controllers\SmartLockController;

$parkingAuth = [HttpsEnforce::class, BearerAuth::class, ParkingModuleGuard::class];

// 1. Parking Rates & Tariff Configurations
$router->get('/v1/parking/rates', [ParkingRateController::class, 'index'], $parkingAuth);
$router->get('/v1/parking/rates/{id}', [ParkingRateController::class, 'show'], $parkingAuth);
$router->post('/v1/parking/rates', [ParkingRateController::class, 'store'], $parkingAuth);
$router->put('/v1/parking/rates/{id}', [ParkingRateController::class, 'update'], $parkingAuth);
$router->delete('/v1/parking/rates/{id}', [ParkingRateController::class, 'destroy'], $parkingAuth);

// 2. Parking Gates & Barrier Hardware Pulse
$router->get('/v1/parking/gates', [ParkingGateController::class, 'index'], $parkingAuth);
$router->get('/v1/parking/gates/{id}', [ParkingGateController::class, 'show'], $parkingAuth);
$router->post('/v1/parking/gates', [ParkingGateController::class, 'store'], $parkingAuth);
$router->put('/v1/parking/gates/{id}', [ParkingGateController::class, 'update'], $parkingAuth);
$router->post('/v1/parking/gates/{id}/pulse', [ParkingGateController::class, 'pulseGate'], $parkingAuth);

// 3. Parking Tickets & Cashier Session Check-in / Check-out
$router->get('/v1/parking/tickets', [ParkingTicketController::class, 'index'], $parkingAuth);
$router->get('/v1/parking/tickets/{id}', [ParkingTicketController::class, 'show'], $parkingAuth);
$router->post('/v1/parking/tickets/check-in', [ParkingTicketController::class, 'checkIn'], $parkingAuth);
$router->post('/v1/parking/tickets/{id}/check-out', [ParkingTicketController::class, 'checkOut'], $parkingAuth);

// 4. Smart Locks & IoT Access Control
$router->get('/v1/parking/smart-locks', [SmartLockController::class, 'index'], $parkingAuth);
$router->get('/v1/parking/smart-locks/logs', [SmartLockController::class, 'accessLogs'], $parkingAuth);
$router->get('/v1/parking/smart-locks/{id}', [SmartLockController::class, 'show'], $parkingAuth);
$router->post('/v1/parking/smart-locks', [SmartLockController::class, 'store'], $parkingAuth);
$router->put('/v1/parking/smart-locks/{id}', [SmartLockController::class, 'update'], $parkingAuth);
$router->post('/v1/parking/smart-locks/{id}/unlock', [SmartLockController::class, 'remoteUnlock'], $parkingAuth);
$router->post('/v1/parking/smart-locks/{id}/generate-passcode', [SmartLockController::class, 'generatePasscode'], $parkingAuth);
