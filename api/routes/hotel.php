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
use App\Modules\Hotel\Controllers\HotelServiceCatalogController;
use App\Modules\Hotel\Controllers\HotelGuestController;
use App\Modules\Hotel\Controllers\HotelCalendarController;
use App\Modules\Hotel\Controllers\HotelLostFoundController;
use App\Modules\Hotel\Controllers\HotelShiftHandoverController;

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

// 3. Hotel Bookings & Front Desk (v1 + v2 Lifecycle)
$router->get('/v1/hotel/bookings', [HotelBookingController::class, 'index'], $hotelAuth);
$router->get('/v1/hotel/bookings/{id}', [HotelBookingController::class, 'show'], $hotelAuth);
$router->post('/v1/hotel/bookings', [HotelBookingController::class, 'store'], $hotelAuth);
$router->post('/v1/hotel/bookings/{id}/check-in', [HotelBookingController::class, 'checkIn'], $hotelAuth);
$router->post('/v1/hotel/bookings/{id}/check-out', [HotelBookingController::class, 'checkOut'], $hotelAuth);
$router->post('/v1/hotel/bookings/{id}/cancel', [HotelBookingController::class, 'cancel'], $hotelAuth);
$router->post('/v1/hotel/bookings/{id}/transfer-room', [HotelBookingController::class, 'transferRoom'], $hotelAuth);
$router->post('/v1/hotel/bookings/{id}/extend-stay', [HotelBookingController::class, 'extendStay'], $hotelAuth);
$router->post('/v1/hotel/bookings/{id}/early-late-charge', [HotelBookingController::class, 'earlyLateCharge'], $hotelAuth);

// 4. Hotel Folios & Room Billing (v1 + v2 Add-ons & Refunds)
$router->get('/v1/hotel/folios/{id}', [HotelFolioController::class, 'show'], $hotelAuth);
$router->post('/v1/hotel/folios/{id}/items', [HotelFolioController::class, 'addItem'], $hotelAuth);
$router->post('/v1/hotel/folios/{id}/add-service', [HotelFolioController::class, 'addServiceItem'], $hotelAuth);
$router->post('/v1/hotel/folios/{id}/refund-deposit', [HotelFolioController::class, 'refundDeposit'], $hotelAuth);
$router->post('/v1/hotel/folios/{id}/settle', [HotelFolioController::class, 'settle'], $hotelAuth);

// 5. Hotel Housekeeping & Maintenance
$router->get('/v1/hotel/housekeeping', [HotelHousekeepingController::class, 'index'], $hotelAuth);
$router->post('/v1/hotel/housekeeping/tasks', [HotelHousekeepingController::class, 'createTask'], $hotelAuth);
$router->put('/v1/hotel/housekeeping/tasks/{id}/status', [HotelHousekeepingController::class, 'updateTaskStatus'], $hotelAuth);
$router->post('/v1/hotel/housekeeping/rooms/{id}/quick-clean', [HotelHousekeepingController::class, 'quickClean'], $hotelAuth);

// 6. Hotel Night Audit & Performance Metrics
$router->get('/v1/hotel/night-audit', [HotelNightAuditController::class, 'overview'], $hotelAuth);
$router->post('/v1/hotel/night-audit/run', [HotelNightAuditController::class, 'runAudit'], $hotelAuth);

// 7. Hotel Services Catalog (v2)
$router->get('/v1/hotel/services', [HotelServiceCatalogController::class, 'index'], $hotelAuth);
$router->post('/v1/hotel/services', [HotelServiceCatalogController::class, 'store'], $hotelAuth);
$router->put('/v1/hotel/services/{id}', [HotelServiceCatalogController::class, 'update'], $hotelAuth);
$router->delete('/v1/hotel/services/{id}', [HotelServiceCatalogController::class, 'destroy'], $hotelAuth);

// 8. Guest CRM & History (v2)
$router->get('/v1/hotel/guests', [HotelGuestController::class, 'index'], $hotelAuth);
$router->get('/v1/hotel/guests/{id}', [HotelGuestController::class, 'show'], $hotelAuth);
$router->put('/v1/hotel/guests/{id}', [HotelGuestController::class, 'update'], $hotelAuth);

// 9. Reservation Timeline / Calendar Gantt (v2)
$router->get('/v1/hotel/calendar/timeline', [HotelCalendarController::class, 'timeline'], $hotelAuth);

// 10. Lost & Found Registry (v2)
$router->get('/v1/hotel/lost-and-found', [HotelLostFoundController::class, 'index'], $hotelAuth);
$router->post('/v1/hotel/lost-and-found', [HotelLostFoundController::class, 'store'], $hotelAuth);
$router->put('/v1/hotel/lost-and-found/{id}', [HotelLostFoundController::class, 'updateStatus'], $hotelAuth);

// 11. Front Desk Shift Handover (v2)
$router->get('/v1/hotel/shifts', [HotelShiftHandoverController::class, 'index'], $hotelAuth);
$router->get('/v1/hotel/shifts/current-summary', [HotelShiftHandoverController::class, 'currentSummary'], $hotelAuth);
$router->post('/v1/hotel/shifts/open', [HotelShiftHandoverController::class, 'openShift'], $hotelAuth);
$router->post('/v1/hotel/shifts/{id}/close', [HotelShiftHandoverController::class, 'closeShift'], $hotelAuth);
