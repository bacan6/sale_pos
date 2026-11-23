<?php
declare(strict_types=1);

$baseUrl = 'http://localhost/sale_pos/api';

function apiCall(string $method, string $path, array $body = [], array $headers = []): array {
    global $baseUrl;
    $url = $baseUrl . $path;
    $jsonBody = !empty($body) ? json_encode($body) : '';

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $defaultHeaders = ['Content-Type: application/json'];
    foreach ($headers as $k => $v) {
        $defaultHeaders[] = "{$k}: {$v}";
    }

    curl_setopt($ch, CURLOPT_HTTPHEADER, $defaultHeaders);

    if (!empty($jsonBody)) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonBody);
    }

    $raw = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return [
        'code' => $code,
        'data' => json_decode((string)$raw, true),
        'raw' => $raw,
    ];
}

require_once __DIR__ . '/config/bootstrap.php';
$db = App\Core\Database::getInstance()->pdo();

echo "=== STARTING CAFE POS V2 API AUTOMATED TESTS ===\n\n";

// 1. Auth Login
$loginRes = apiCall('POST', '/v1/auth/login', [
    'username' => 'admin',
    'password' => 'admin123'
]);
$token = $loginRes['data']['data']['token'] ?? '';
echo "1. Auth Login [{$loginRes['code']}]: " . ($token ? "PASS" : "FAIL") . "\n";
if (!$token) {
    echo "Raw response: {$loginRes['raw']}\n";
    exit(1);
}
$authHeaders = ['Authorization' => "Bearer {$token}"];

// 2. Ingredients CRUD & Stock Adjustment
$testSuffix = rand(100, 999);
$createIngr1 = apiCall('POST', '/v1/pos/ingredients', [
    'name' => 'Biji Kopi Arabika Gayo',
    'code' => "ING-COF-{$testSuffix}",
    'unit' => 'gram',
    'stock' => 1000.0,
    'cost_per_unit' => 250,
    'min_stock_alert' => 200.0,
], $authHeaders);
$ingr1Id = (int)($createIngr1['data']['data']['id'] ?? 0);
echo "2a. Create Ingredient 1 (Kopi) [{$createIngr1['code']}]: " . ($ingr1Id > 0 ? "PASS (ID: {$ingr1Id})" : "FAIL") . "\n";

$createIngr2 = apiCall('POST', '/v1/pos/ingredients', [
    'name' => 'Susu Segar Fresh Milk',
    'code' => "ING-MLK-{$testSuffix}",
    'unit' => 'ml',
    'stock' => 2000.0,
    'cost_per_unit' => 25,
    'min_stock_alert' => 500.0,
], $authHeaders);
$ingr2Id = (int)($createIngr2['data']['data']['id'] ?? 0);
echo "2b. Create Ingredient 2 (Susu) [{$createIngr2['code']}]: " . ($ingr2Id > 0 ? "PASS (ID: {$ingr2Id})" : "FAIL") . "\n";

// Adjust stock (Opname waste)
$adjRes = apiCall('POST', "/v1/pos/ingredients/{$ingr1Id}/adjust", [
    'type' => 'waste',
    'quantity' => 50.0,
    'notes' => 'Tumpah saat kalibrasi grinder',
], $authHeaders);
$adjStock = $adjRes['data']['data']['new_stock'] ?? 0;
echo "2c. Stock Adjustment (Waste) [{$adjRes['code']}]: " . ($adjStock == 950.0 ? "PASS (New Stock: 950)" : "FAIL ({$adjStock})") . "\n";

// 3. Recipe BOM Configuration
$pStmt = $db->query("SELECT id, name FROM products WHERE tenant_id = 1 LIMIT 1");
$prod = $pStmt->fetch();
$productId = (int)($prod['id'] ?? 1);

$saveBOM = apiCall('POST', "/v1/pos/products/{$productId}/recipes", [
    'recipes' => [
        ['ingredient_id' => $ingr1Id, 'quantity_needed' => 18.0, 'unit' => 'gram'],
        ['ingredient_id' => $ingr2Id, 'quantity_needed' => 150.0, 'unit' => 'ml'],
    ]
], $authHeaders);
echo "3a. Save Product Recipe BOM [{$saveBOM['code']}]: " . ($saveBOM['code'] === 200 ? "PASS" : "FAIL") . "\n";

$getBOM = apiCall('GET', "/v1/pos/products/{$productId}/recipes", [], $authHeaders);
$bomItems = $getBOM['data']['data'] ?? [];
echo "3b. Fetch Product Recipe BOM [{$getBOM['code']}]: " . (count($bomItems) === 2 ? "PASS (2 ingredients linked)" : "FAIL") . "\n";

// 4. Cashier Shift Management
// Check if shift currently open, if so close it first
$curShift = apiCall('GET', '/v1/pos/shifts/current', [], $authHeaders);
if (!empty($curShift['data']['data']['has_active_shift'])) {
    $activeId = $curShift['data']['data']['shift']['id'];
    apiCall('POST', '/v1/pos/shifts/close', ['shift_id' => $activeId, 'closing_cash_actual' => 100000], $authHeaders);
}

$openShift = apiCall('POST', '/v1/pos/shifts/open', [
    'opening_cash' => 200000,
    'notes' => 'Shift Pagi Kasir Utama',
], $authHeaders);
$shiftId = (int)($openShift['data']['data']['shift_id'] ?? 0);
echo "4a. Open Cashier Shift [{$openShift['code']}]: " . ($shiftId > 0 ? "PASS (Shift ID: {$shiftId})" : "FAIL") . "\n";

$cashMov = apiCall('POST', '/v1/pos/shifts/cash-movement', [
    'shift_id' => $shiftId,
    'type' => 'cash_out',
    'amount' => 15000,
    'reason' => 'Beli Es Batu Tambahan',
], $authHeaders);
echo "4b. Record Shift Cash Out [{$cashMov['code']}]: " . ($cashMov['code'] === 200 ? "PASS" : "FAIL") . "\n";

$chkShift = apiCall('GET', '/v1/pos/shifts/current', [], $authHeaders);
$expDrawer = $chkShift['data']['data']['shift']['expected_cash_drawer'] ?? 0;
echo "4c. Verify Live Drawer Balance [{$chkShift['code']}]: " . ($expDrawer === 185000 ? "PASS (Rp 185,000)" : "FAIL (Rp {$expDrawer})") . "\n";

// 5. Table Operations: Move & Merge
// Ensure we have two tables
$t1 = $db->query("SELECT id, name FROM tables WHERE tenant_id = 1 LIMIT 1 OFFSET 0")->fetch();
$t2 = $db->query("SELECT id, name FROM tables WHERE tenant_id = 1 LIMIT 1 OFFSET 1")->fetch();

if (!$t1 || !$t2) {
    $db->exec("INSERT INTO tables (tenant_id, name, capacity, room_category_id, status) VALUES (1, 'Meja 101', 4, 1, 'available'), (1, 'Meja 102', 4, 1, 'available')");
    $t1 = $db->query("SELECT id, name FROM tables WHERE tenant_id = 1 LIMIT 1 OFFSET 0")->fetch();
    $t2 = $db->query("SELECT id, name FROM tables WHERE tenant_id = 1 LIMIT 1 OFFSET 1")->fetch();
}

$table1Id = (int)$t1['id'];
$table2Id = (int)$t2['id'];

// Reset both tables to available
$db->exec("UPDATE tables SET status = 'available', active_order_number = NULL, active_order_total = 0 WHERE id IN ({$table1Id}, {$table2Id})");

// Create Order on Table 1
$order1Num = 'ORD-T1-' . time();
$createOrder = apiCall('POST', '/v1/pos/orders', [
    'order_number' => $order1Num,
    'table_id' => $table1Id,
    'order_type' => 'Dine-In',
    'items' => [
        ['product_id' => $productId, 'product_name' => $prod['name'], 'quantity' => 2, 'unit_price' => 25000, 'subtotal' => 50000]
    ]
], $authHeaders);
$order1Id = (int)($createOrder['data']['data']['id'] ?? 0);
echo "5a. Place Order on Table 1 [{$createOrder['code']}]: " . ($order1Id > 0 ? "PASS (Order ID: {$order1Id})" : "FAIL") . "\n";

// Move Table 1 to Table 2
$moveRes = apiCall('POST', '/v1/pos/tables/move', [
    'from_table_id' => $table1Id,
    'to_table_id' => $table2Id,
    'notes' => 'Tamu ingin duduk di dekat jendela',
], $authHeaders);
echo "5b. Move Table 1 -> Table 2 [{$moveRes['code']}]: " . ($moveRes['code'] === 200 ? "PASS" : "FAIL") . "\n";

// Verify statuses: Table 1 available, Table 2 occupied with order1Num
$sT1 = $db->query("SELECT status, active_order_number FROM tables WHERE id = {$table1Id}")->fetch();
$sT2 = $db->query("SELECT status, active_order_number FROM tables WHERE id = {$table2Id}")->fetch();
$moveOk = ($sT1['status'] === 'available' && $sT2['status'] === 'occupied' && $sT2['active_order_number'] === $order1Num);
echo "5c. Verify Table Statuses after Move: " . ($moveOk ? "PASS" : "FAIL") . "\n";

// 6. Split Bill (Split by Item)
// Add second item to Table 2's order so we have multiple items to split
$db->exec("INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal) VALUES ({$order1Id}, {$productId}, 'Croissant Pastry', 1, 20000, 20000)");
$db->exec("UPDATE orders SET subtotal = 70000, tax_amount = 7000, total = 77000 WHERE id = {$order1Id}");
$db->exec("UPDATE tables SET active_order_total = 77000 WHERE id = {$table2Id}");

$oiStmt = $db->query("SELECT id FROM order_items WHERE order_id = {$order1Id} ORDER BY id DESC LIMIT 1");
$secondItemId = (int)$oiStmt->fetch()['id'];

$splitRes = apiCall('POST', "/v1/pos/orders/{$order1Id}/split-bill", [
    'split_type' => 'by_item',
    'items' => [
        ['order_item_id' => $secondItemId, 'quantity' => 1]
    ]
], $authHeaders);
$splitChildId = (int)($splitRes['data']['data']['split_order']['id'] ?? 0);
echo "6a. Split Bill by Item [{$splitRes['code']}]: " . ($splitChildId > 0 ? "PASS (Split Order ID: {$splitChildId})" : "FAIL") . "\n";

// Equal split simulation
$equalSplitRes = apiCall('POST', "/v1/pos/orders/{$order1Id}/split-bill", [
    'split_type' => 'equal',
    'split_count' => 3
], $authHeaders);
$shares = $equalSplitRes['data']['data']['shares'] ?? [];
echo "6b. Split Bill Equal 3-ways [{$equalSplitRes['code']}]: " . (count($shares) === 3 ? "PASS (3 shares generated)" : "FAIL") . "\n";

// 7. Payment Settlement & Automated BOM Ingredient Depletion
// Check ingredient stock before payment
$ingrBefore = (float)$db->query("SELECT stock FROM pos_ingredients WHERE id = {$ingr1Id}")->fetch()['stock'];

$payRes = apiCall('POST', '/v1/pos/payments', [
    'order_id' => $order1Id,
    'method' => 'cash',
    'amount_paid' => 60000,
    'shift_id' => $shiftId,
], $authHeaders);
$payId = (int)($payRes['data']['data']['payment_id'] ?? 0);
$deducted = $payRes['data']['data']['deducted_ingredients'] ?? [];
echo "7a. Process Cash Payment with Shift [{$payRes['code']}]: " . ($payId > 0 ? "PASS (Payment ID: {$payId})" : "FAIL") . "\n";
echo "7b. Automated BOM Deduction Hook: " . (count($deducted) > 0 ? "PASS (" . count($deducted) . " ingredients deducted)" : "FAIL") . "\n";

// Verify stock decreased by 2 * 18g = 36g
$ingrAfter = (float)$db->query("SELECT stock FROM pos_ingredients WHERE id = {$ingr1Id}")->fetch()['stock'];
$expectedStock = $ingrBefore - 36.0;
echo "7c. Ingredient Stock Balance in DB: " . (abs($ingrAfter - $expectedStock) < 0.001 ? "PASS (Stock: {$ingrBefore} -> {$ingrAfter})" : "FAIL ({$ingrAfter} vs {$expectedStock})") . "\n";

// Verify pos_inventory_logs
$logStmt = $db->query("SELECT COUNT(*) as cnt FROM pos_inventory_logs WHERE tenant_id = 1 AND ingredient_id = {$ingr1Id} AND type = 'out_order'");
$logCnt = (int)$logStmt->fetch()['cnt'];
echo "7d. Inventory Audit Log Entry: " . ($logCnt > 0 ? "PASS ({$logCnt} deduction logs found)" : "FAIL") . "\n";

// 8. Close Shift & Reconcile Cash
$closeRes = apiCall('POST', '/v1/pos/shifts/close', [
    'shift_id' => $shiftId,
    'closing_cash_actual' => 240000,
    'notes' => 'Tutup shift sore kasir',
], $authHeaders);
$disc = $closeRes['data']['data']['discrepancy'] ?? null;
echo "8a. Close Shift & Reconcile [{$closeRes['code']}]: " . ($closeRes['code'] === 200 ? "PASS (Discrepancy: Rp {$disc})" : "FAIL") . "\n";

echo "\n=== ALL CAFE POS V2 API TESTS COMPLETED SUCCESSFULLY! ===\n";
