<?php
declare(strict_types=1);

use App\Middleware\HttpsEnforce;
use App\Middleware\BearerAuth;
use App\Middleware\PosModuleGuard;
use App\Modules\Pos\Controllers\ProductCategoryController;
use App\Modules\Pos\Controllers\RoomCategoryController;
use App\Modules\Pos\Controllers\ProductController;
use App\Modules\Pos\Controllers\TableController;
use App\Modules\Pos\Controllers\OrderController;
use App\Modules\Pos\Controllers\KitchenTicketController;
use App\Modules\Pos\Controllers\PaymentController;
use App\Modules\Pos\Controllers\SyncController;
use App\Modules\Pos\Controllers\IngredientController;
use App\Modules\Pos\Controllers\RecipeController;
use App\Modules\Pos\Controllers\TableTransferController;
use App\Modules\Pos\Controllers\OrderSplitController;
use App\Modules\Pos\Controllers\ShiftController;

$posAuth = [HttpsEnforce::class, BearerAuth::class, PosModuleGuard::class];

// 1. POS Product Categories
$router->get('/v1/pos/product-categories', [ProductCategoryController::class, 'index'], $posAuth);
$router->get('/v1/pos/product-categories/{id}', [ProductCategoryController::class, 'show'], $posAuth);
$router->post('/v1/pos/product-categories', [ProductCategoryController::class, 'store'], $posAuth);
$router->put('/v1/pos/product-categories/{id}', [ProductCategoryController::class, 'update'], $posAuth);
$router->delete('/v1/pos/product-categories/{id}', [ProductCategoryController::class, 'destroy'], $posAuth);

// Legacy routes alias
$router->get('/v1/product-categories', [ProductCategoryController::class, 'index'], $posAuth);
$router->get('/v1/product-categories/{id}', [ProductCategoryController::class, 'show'], $posAuth);
$router->post('/v1/product-categories', [ProductCategoryController::class, 'store'], $posAuth);
$router->put('/v1/product-categories/{id}', [ProductCategoryController::class, 'update'], $posAuth);
$router->delete('/v1/product-categories/{id}', [ProductCategoryController::class, 'destroy'], $posAuth);

// 2. POS Room/Zone Categories (Zonasi Meja)
$router->get('/v1/pos/room-categories', [RoomCategoryController::class, 'index'], $posAuth);
$router->get('/v1/pos/room-categories/{id}', [RoomCategoryController::class, 'show'], $posAuth);
$router->post('/v1/pos/room-categories', [RoomCategoryController::class, 'store'], $posAuth);
$router->put('/v1/pos/room-categories/{id}', [RoomCategoryController::class, 'update'], $posAuth);
$router->delete('/v1/pos/room-categories/{id}', [RoomCategoryController::class, 'destroy'], $posAuth);

$router->get('/v1/room-categories', [RoomCategoryController::class, 'index'], $posAuth);
$router->get('/v1/room-categories/{id}', [RoomCategoryController::class, 'show'], $posAuth);
$router->post('/v1/room-categories', [RoomCategoryController::class, 'store'], $posAuth);
$router->put('/v1/room-categories/{id}', [RoomCategoryController::class, 'update'], $posAuth);
$router->delete('/v1/room-categories/{id}', [RoomCategoryController::class, 'destroy'], $posAuth);

// 3. POS Products
$router->get('/v1/pos/products', [ProductController::class, 'index'], $posAuth);
$router->get('/v1/pos/products/{id}', [ProductController::class, 'show'], $posAuth);
$router->post('/v1/pos/products', [ProductController::class, 'store'], $posAuth);
$router->put('/v1/pos/products/{id}', [ProductController::class, 'update'], $posAuth);
$router->delete('/v1/pos/products/{id}', [ProductController::class, 'destroy'], $posAuth);

$router->get('/v1/products', [ProductController::class, 'index'], $posAuth);
$router->get('/v1/products/{id}', [ProductController::class, 'show'], $posAuth);
$router->post('/v1/products', [ProductController::class, 'store'], $posAuth);
$router->put('/v1/products/{id}', [ProductController::class, 'update'], $posAuth);
$router->delete('/v1/products/{id}', [ProductController::class, 'destroy'], $posAuth);

// 4. POS Tables
$router->get('/v1/pos/tables', [TableController::class, 'index'], $posAuth);
$router->get('/v1/pos/tables/{id}', [TableController::class, 'show'], $posAuth);
$router->post('/v1/pos/tables', [TableController::class, 'store'], $posAuth);
$router->put('/v1/pos/tables/{id}', [TableController::class, 'update'], $posAuth);
$router->delete('/v1/pos/tables/{id}', [TableController::class, 'destroy'], $posAuth);

$router->get('/v1/tables', [TableController::class, 'index'], $posAuth);
$router->get('/v1/tables/{id}', [TableController::class, 'show'], $posAuth);
$router->post('/v1/tables', [TableController::class, 'store'], $posAuth);
$router->put('/v1/tables/{id}', [TableController::class, 'update'], $posAuth);
$router->delete('/v1/tables/{id}', [TableController::class, 'destroy'], $posAuth);

// 5. POS Orders
$router->get('/v1/pos/orders', [OrderController::class, 'index'], $posAuth);
$router->get('/v1/pos/orders/{id}', [OrderController::class, 'show'], $posAuth);
$router->post('/v1/pos/orders', [OrderController::class, 'store'], $posAuth);
$router->put('/v1/pos/orders/{id}/status', [OrderController::class, 'updateStatus'], $posAuth);

$router->get('/v1/orders', [OrderController::class, 'index'], $posAuth);
$router->get('/v1/orders/{id}', [OrderController::class, 'show'], $posAuth);
$router->post('/v1/orders', [OrderController::class, 'store'], $posAuth);
$router->put('/v1/orders/{id}/status', [OrderController::class, 'updateStatus'], $posAuth);

// 6. POS Kitchen Tickets
$router->get('/v1/pos/kitchen-tickets', [KitchenTicketController::class, 'index'], $posAuth);
$router->post('/v1/pos/kitchen-tickets', [KitchenTicketController::class, 'store'], $posAuth);
$router->put('/v1/pos/kitchen-tickets/{id}/status', [KitchenTicketController::class, 'updateStatus'], $posAuth);

$router->get('/v1/kitchen-tickets', [KitchenTicketController::class, 'index'], $posAuth);
$router->post('/v1/kitchen-tickets', [KitchenTicketController::class, 'store'], $posAuth);
$router->put('/v1/kitchen-tickets/{id}/status', [KitchenTicketController::class, 'updateStatus'], $posAuth);

// 7. POS Payments (Cash, Card, QRIS, & Room Charge)
$router->get('/v1/pos/payments', [PaymentController::class, 'index'], $posAuth);
$router->post('/v1/pos/payments', [PaymentController::class, 'store'], $posAuth);

$router->get('/v1/payments', [PaymentController::class, 'index'], $posAuth);
$router->post('/v1/payments', [PaymentController::class, 'store'], $posAuth);

// 8. POS Device Sync Engine
$router->post('/v1/pos/sync/push', [SyncController::class, 'push'], $posAuth);
$router->get('/v1/pos/sync/pull', [SyncController::class, 'pull'], $posAuth);
$router->post('/v1/sync/push', [SyncController::class, 'push'], $posAuth);
$router->get('/v1/sync/pull', [SyncController::class, 'pull'], $posAuth);

// 9. Cafe v2: Ingredients & Inventory BOM
$router->get('/v1/pos/ingredients', [IngredientController::class, 'index'], $posAuth);
$router->get('/v1/pos/ingredients/{id}', [IngredientController::class, 'show'], $posAuth);
$router->post('/v1/pos/ingredients', [IngredientController::class, 'store'], $posAuth);
$router->put('/v1/pos/ingredients/{id}', [IngredientController::class, 'update'], $posAuth);
$router->delete('/v1/pos/ingredients/{id}', [IngredientController::class, 'destroy'], $posAuth);
$router->post('/v1/pos/ingredients/{id}/adjust', [IngredientController::class, 'adjust'], $posAuth);
$router->get('/v1/pos/inventory-logs', [IngredientController::class, 'inventoryLogs'], $posAuth);

// 10. Cafe v2: Product Recipes (BOM)
$router->get('/v1/pos/products/{id}/recipes', [RecipeController::class, 'getByProduct'], $posAuth);
$router->post('/v1/pos/products/{id}/recipes', [RecipeController::class, 'save'], $posAuth);

// 11. Cafe v2: Table Operations (Move & Merge)
$router->post('/v1/pos/tables/move', [TableTransferController::class, 'move'], $posAuth);
$router->post('/v1/pos/tables/merge', [TableTransferController::class, 'merge'], $posAuth);

// 12. Cafe v2: Order Split Bill
$router->post('/v1/pos/orders/{id}/split-bill', [OrderSplitController::class, 'splitBill'], $posAuth);

// 13. Cafe v2: Cashier Shift & Cash Drawer Management
$router->get('/v1/pos/shifts/current', [ShiftController::class, 'current'], $posAuth);
$router->post('/v1/pos/shifts/open', [ShiftController::class, 'open'], $posAuth);
$router->post('/v1/pos/shifts/cash-movement', [ShiftController::class, 'cashMovement'], $posAuth);
$router->post('/v1/pos/shifts/close', [ShiftController::class, 'close'], $posAuth);
$router->get('/v1/pos/shifts', [ShiftController::class, 'index'], $posAuth);

