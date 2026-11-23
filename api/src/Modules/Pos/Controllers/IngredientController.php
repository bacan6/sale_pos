<?php
declare(strict_types=1);

namespace App\Modules\Pos\Controllers;

use App\Core\AuthContext;
use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use PDO;
use Exception;

class IngredientController {
    public function index(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();
        $activeOnly = Request::query('active_only');

        $sql = 'SELECT * FROM pos_ingredients WHERE tenant_id = ?';
        $params = [$tenantId];

        if ($activeOnly === '1') {
            $sql .= ' AND is_active = 1';
        }

        $sql .= ' ORDER BY name ASC';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        foreach ($rows as &$r) {
            $r['stock'] = (float)$r['stock'];
            $r['min_stock_alert'] = (float)$r['min_stock_alert'];
            $r['cost_per_unit'] = (int)$r['cost_per_unit'];
            $r['is_low_stock'] = $r['stock'] <= $r['min_stock_alert'];
        }

        Response::success($rows);
    }

    public function show(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT * FROM pos_ingredients WHERE id = ? AND tenant_id = ? LIMIT 1');
        $stmt->execute([$id, $tenantId]);
        $row = $stmt->fetch();

        if (!$row) {
            Response::error('Bahan baku tidak ditemukan', 404);
            return;
        }

        $row['stock'] = (float)$row['stock'];
        $row['min_stock_alert'] = (float)$row['min_stock_alert'];
        $row['cost_per_unit'] = (int)$row['cost_per_unit'];
        $row['is_low_stock'] = $row['stock'] <= $row['min_stock_alert'];

        Response::success($row);
    }

    public function store(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();
        $name = trim((string)($body['name'] ?? ''));
        $code = trim((string)($body['code'] ?? ''));
        $unit = trim((string)($body['unit'] ?? 'pcs'));
        $stock = (float)($body['stock'] ?? 0.0);
        $costPerUnit = (int)($body['cost_per_unit'] ?? 0);
        $minStockAlert = (float)($body['min_stock_alert'] ?? 10.0);

        if ($name === '') {
            Response::error('Nama bahan baku wajib diisi', 422);
            return;
        }

        if ($code === '') {
            $code = 'ING-' . strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $name), 0, 4)) . '-' . rand(100, 999);
        }

        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('INSERT INTO pos_ingredients (tenant_id, code, name, unit, stock, cost_per_unit, min_stock_alert, is_active) 
                              VALUES (?, ?, ?, ?, ?, ?, ?, 1)');
        $stmt->execute([$tenantId, $code, $name, $unit, $stock, $costPerUnit, $minStockAlert]);
        $id = (int)$db->lastInsertId();

        if ($stock > 0) {
            $logStmt = $db->prepare('INSERT INTO pos_inventory_logs (tenant_id, ingredient_id, type, quantity, balance_after, reference_id, notes, user_id) 
                                     VALUES (?, ?, "opname_adjustment", ?, ?, "INITIAL", "Saldo awal bahan", ?)');
            $userId = AuthContext::id() ?: null;
            $logStmt->execute([$tenantId, $id, $stock, $stock, $userId]);
        }

        Response::success(['id' => $id, 'code' => $code, 'name' => $name, 'stock' => $stock], 'Bahan baku berhasil ditambahkan', 201);
    }

    public function update(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $body = Request::body();

        $name = trim((string)($body['name'] ?? ''));
        $code = trim((string)($body['code'] ?? ''));
        $unit = trim((string)($body['unit'] ?? 'pcs'));
        $costPerUnit = (int)($body['cost_per_unit'] ?? 0);
        $minStockAlert = (float)($body['min_stock_alert'] ?? 10.0);
        $isActive = isset($body['is_active']) ? (int)(bool)$body['is_active'] : 1;

        if ($name === '') {
            Response::error('Nama bahan baku wajib diisi', 422);
            return;
        }

        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('UPDATE pos_ingredients 
                              SET name = ?, code = ?, unit = ?, cost_per_unit = ?, min_stock_alert = ?, is_active = ? 
                              WHERE id = ? AND tenant_id = ?');
        $stmt->execute([$name, $code, $unit, $costPerUnit, $minStockAlert, $isActive, $id, $tenantId]);

        Response::success(null, 'Data bahan baku berhasil diperbarui');
    }

    public function destroy(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('UPDATE pos_ingredients SET is_active = 0 WHERE id = ? AND tenant_id = ?');
        $stmt->execute([$id, $tenantId]);

        Response::success(null, 'Bahan baku berhasil dinonaktifkan');
    }

    public function adjust(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $body = Request::body();

        $type = (string)($body['type'] ?? 'opname_adjustment');
        $quantity = (float)($body['quantity'] ?? 0.0);
        $notes = trim((string)($body['notes'] ?? ''));
        $referenceId = trim((string)($body['reference_id'] ?? 'MANUAL'));

        $validTypes = ['in_purchase', 'waste', 'opname_adjustment'];
        if (!in_array($type, $validTypes, true)) {
            Response::error('Tipe mutasi stok tidak valid', 422);
            return;
        }

        $db = Database::getInstance()->pdo();
        $db->beginTransaction();

        try {
            $stmt = $db->prepare('SELECT id, stock FROM pos_ingredients WHERE id = ? AND tenant_id = ? FOR UPDATE');
            $stmt->execute([$id, $tenantId]);
            $ingr = $stmt->fetch();

            if (!$ingr) {
                throw new Exception('Bahan baku tidak ditemukan');
            }

            $currentStock = (float)$ingr['stock'];
            if ($type === 'opname_adjustment') {
                $diff = $quantity - $currentStock;
                $newStock = $quantity;
                $logQty = $diff;
            } elseif ($type === 'in_purchase') {
                $newStock = $currentStock + $quantity;
                $logQty = $quantity;
            } else { // waste
                $newStock = $currentStock - $quantity;
                $logQty = -$quantity;
            }

            $upd = $db->prepare('UPDATE pos_ingredients SET stock = ? WHERE id = ? AND tenant_id = ?');
            $upd->execute([$newStock, $id, $tenantId]);

            $userId = AuthContext::id() ?: null;
            $log = $db->prepare('INSERT INTO pos_inventory_logs (tenant_id, ingredient_id, type, quantity, balance_after, reference_id, notes, user_id) 
                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
            $log->execute([$tenantId, $id, $type, $logQty, $newStock, $referenceId, $notes, $userId]);

            $db->commit();
            Response::success([
                'ingredient_id' => $id,
                'previous_stock' => $currentStock,
                'new_stock' => $newStock,
                'type' => $type
            ], 'Stok berhasil disesuaikan');
        } catch (Exception $e) {
            $db->rollBack();
            Response::error($e->getMessage(), 400);
        }
    }

    public function inventoryLogs(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();
        $ingredientId = Request::query('ingredient_id');
        $type = Request::query('type');

        $sql = 'SELECT l.*, pi.name as ingredient_name, pi.unit, u.full_name as user_name 
                FROM pos_inventory_logs l 
                JOIN pos_ingredients pi ON l.ingredient_id = pi.id 
                LEFT JOIN users u ON l.user_id = u.id 
                WHERE l.tenant_id = ?';
        $params = [$tenantId];

        if ($ingredientId !== null && $ingredientId !== '') {
            $sql .= ' AND l.ingredient_id = ?';
            $params[] = (int)$ingredientId;
        }

        if ($type !== null && $type !== '') {
            $sql .= ' AND l.type = ?';
            $params[] = $type;
        }

        $sql .= ' ORDER BY l.id DESC LIMIT 200';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        foreach ($rows as &$r) {
            $r['quantity'] = (float)$r['quantity'];
            $r['balance_after'] = (float)$r['balance_after'];
        }

        Response::success($rows);
    }
}
