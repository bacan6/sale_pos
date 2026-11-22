<?php
declare(strict_types=1);

use App\Middleware\HttpsEnforce;
use App\Middleware\BearerAuth;
use App\Middleware\HotelModuleGuard;
use App\Modules\Hotel\Controllers\HotelRoomTypeController;
use App\Modules\Hotel\Controllers\HotelRoomController;
use App\Modules\Hotel\Controllers\HotelBookingController;
use App\Modules\Hotel\Controllers\HotelFolioController;
use App\Modules\Hotel\Controllers\HotelHousekeepingController;
use App\Modules\Hotel\Controllers\HotelNightAuditController;

$hotelAuth = [HttpsEnforce::class, BearerAuth::class, HotelModuleGuard::class];

// 1. Hotel Room Types
$router->get('/v1/hotel/room-types', [HotelRoomTypeController::class, 'index'], $hotelAuth);
$router->get('/v1/hotel/room-types/{id}', [HotelRoomTypeController::class, 'show'], $hotelAuth);
$router->post('/v1/hotel/room-types', [HotelRoomTypeController::class, 'store'], $hotelAuth);
$router->put('/v1/hotel/room-types/{id}', [HotelRoomTypeController::class, 'update'], $hotelAuth);
$router->delete('/v1/hotel/room-types/{id}', [HotelRoomTypeController::class, 'destroy'], $hotelAuth);

// 2. Hotel Rooms (Inventory & Status)
$router->get('/v1/hotel/rooms', [HotelRoomController::class, 'index'], $hotelAuth);
$router->get('/v1/hotel/rooms/{id}', [HotelRoomController::class, 'show'], $hotelAuth);
$router->post('/v1/hotel/rooms', [HotelRoomController::class, 'store'], $hotelAuth);
$router->put('/v1/hotel/rooms/{id}', [HotelRoomController::class, 'update'], $hotelAuth);
$router->put('/v1/hotel/rooms/{id}/status', [HotelRoomController::class, 'updateStatus'], $hotelAuth);
$router->delete('/v1/hotel/rooms/{id}', [HotelRoomController::class, 'destroy'], $hotelAuth);

// 3. Hotel Bookings & Front Desk
$router->get('/v1/hotel/bookings', [HotelBookingController::class, 'index'], $hotelAuth);
$router->get('/v1/hotel/bookings/{id}', [HotelBookingController::class, 'show'], $hotelAuth);
$router->post('/v1/hotel/bookings', [HotelBookingController::class, 'store'], $hotelAuth);
$router->post('/v1/hotel/bookings/{id}/check-in', [HotelBookingController::class, 'checkIn'], $hotelAuth);
$router->post('/v1/hotel/bookings/{id}/check-out', [HotelBookingController::class, 'checkOut'], $hotelAuth);
$router->post('/v1/hotel/bookings/{id}/cancel', [HotelBookingController::class, 'cancel'], $hotelAuth);

// 4. Hotel Folios & Room Billing
$router->get('/v1/hotel/folios/{id}', [HotelFolioController::class, 'show'], $hotelAuth);
$router->post('/v1/hotel/folios/{id}/items', [HotelFolioController::class, 'addItem'], $hotelAuth);
$router->post('/v1/hotel/folios/{id}/settle', [HotelFolioController::class, 'settle'], $hotelAuth);

// 5. Hotel Housekeeping & Maintenance
$router->get('/v1/hotel/housekeeping', [HotelHousekeepingController::class, 'index'], $hotelAuth);
$router->post('/v1/hotel/housekeeping/tasks', [HotelHousekeepingController::class, 'createTask'], $hotelAuth);
$router->put('/v1/hotel/housekeeping/tasks/{id}/status', [HotelHousekeepingController::class, 'updateTaskStatus'], $hotelAuth);
$router->post('/v1/hotel/housekeeping/rooms/{id}/quick-clean', [HotelHousekeepingController::class, 'quickClean'], $hotelAuth);

// 6. Hotel Night Audit & Performance Metrics
$router->get('/v1/hotel/night-audit', [HotelNightAuditController::class, 'overview'], $hotelAuth);
$router->post('/v1/hotel/night-audit/run', [HotelNightAuditController::class, 'runAudit'], $hotelAuth);
