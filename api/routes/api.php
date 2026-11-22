<?php
declare(strict_types=1);

use App\Middleware\HmacAuth;
use App\Middleware\HttpsEnforce;
use App\Controllers\ProductCategoryController;
use App\Controllers\RoomCategoryController;
use App\Controllers\ProductController;
use App\Controllers\TableController;
use App\Controllers\UserController;
use App\Controllers\OrderController;
use App\Controllers\KitchenTicketController;
use App\Controllers\PaymentController;
use App\Controllers\SyncController;

$auth = [HttpsEnforce::class, HmacAuth::class];

// Public Health Check
$router->get('/health', function() {
    App\Core\Response::success(['uptime' => 'ok', 'timestamp' => time()], 'API Kopi Senja POS Siap Digunakan');
});

// Product Categories (Pengelolaan Kategori Produk)
$router->get('/v1/product-categories', [ProductCategoryController::class, 'index'], $auth);
$router->get('/v1/product-categories/{id}', [ProductCategoryController::class, 'show'], $auth);
$router->post('/v1/product-categories', [ProductCategoryController::class, 'store'], $auth);
$router->put('/v1/product-categories/{id}', [ProductCategoryController::class, 'update'], $auth);
$router->delete('/v1/product-categories/{id}', [ProductCategoryController::class, 'destroy'], $auth);

// Room Categories (Pengelolaan Kategori Ruangan / Zonasi Meja)
$router->get('/v1/room-categories', [RoomCategoryController::class, 'index'], $auth);
$router->get('/v1/room-categories/{id}', [RoomCategoryController::class, 'show'], $auth);
$router->post('/v1/room-categories', [RoomCategoryController::class, 'store'], $auth);
$router->put('/v1/room-categories/{id}', [RoomCategoryController::class, 'update'], $auth);
$router->delete('/v1/room-categories/{id}', [RoomCategoryController::class, 'destroy'], $auth);

// Products (Katalog Menu & Harga)
$router->get('/v1/products', [ProductController::class, 'index'], $auth);
$router->get('/v1/products/{id}', [ProductController::class, 'show'], $auth);
$router->post('/v1/products', [ProductController::class, 'store'], $auth);
$router->put('/v1/products/{id}', [ProductController::class, 'update'], $auth);
$router->delete('/v1/products/{id}', [ProductController::class, 'destroy'], $auth);

// Tables (Denah Meja & Kapasitas)
$router->get('/v1/tables', [TableController::class, 'index'], $auth);
$router->get('/v1/tables/{id}', [TableController::class, 'show'], $auth);
$router->post('/v1/tables', [TableController::class, 'store'], $auth);
$router->put('/v1/tables/{id}', [TableController::class, 'update'], $auth);
$router->delete('/v1/tables/{id}', [TableController::class, 'destroy'], $auth);

// Users (Staf, Kasir, Pramuniaga)
$router->get('/v1/users', [UserController::class, 'index'], $auth);
$router->get('/v1/users/{id}', [UserController::class, 'show'], $auth);
$router->post('/v1/users', [UserController::class, 'store'], $auth);
$router->put('/v1/users/{id}', [UserController::class, 'update'], $auth);

// Orders (Transaksi Kasir & Waitstaff)
$router->get('/v1/orders', [OrderController::class, 'index'], $auth);
$router->get('/v1/orders/{id}', [OrderController::class, 'show'], $auth);
$router->post('/v1/orders', [OrderController::class, 'store'], $auth);
$router->put('/v1/orders/{id}/status', [OrderController::class, 'updateStatus'], $auth);

// Kitchen Tickets (KDS & Antrian Dapur)
$router->get('/v1/kitchen-tickets', [KitchenTicketController::class, 'index'], $auth);
$router->post('/v1/kitchen-tickets', [KitchenTicketController::class, 'store'], $auth);
$router->put('/v1/kitchen-tickets/{id}/status', [KitchenTicketController::class, 'updateStatus'], $auth);

// Payments (Pembayaran Kasir)
$router->get('/v1/payments', [PaymentController::class, 'index'], $auth);
$router->post('/v1/payments', [PaymentController::class, 'store'], $auth);

// Periodic Sync Engine (Push & Pull berkala)
$router->post('/v1/sync/push', [SyncController::class, 'push'], $auth);
$router->get('/v1/sync/pull', [SyncController::class, 'pull'], $auth);
