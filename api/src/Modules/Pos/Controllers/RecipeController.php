<?php
declare(strict_types=1);

namespace App\Modules\Pos\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use PDO;
use Exception;

class RecipeController {
    public function getByProduct(array $params): void {
        $tenantId = TenantContext::id();
        $productId = (int)($params['id'] ?? 0);
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT pr.*, pi.name as ingredient_name, pi.code as ingredient_code, pi.unit as base_unit, pi.stock as current_stock, pi.cost_per_unit 
                              FROM pos_product_recipes pr 
                              JOIN pos_ingredients pi ON pr.ingredient_id = pi.id 
                              WHERE pr.product_id = ? AND pr.tenant_id = ? 
                              ORDER BY pr.id ASC');
        $stmt->execute([$productId, $tenantId]);
        $rows = $stmt->fetchAll();

        foreach ($rows as &$r) {
            $r['quantity_needed'] = (float)$r['quantity_needed'];
            $r['current_stock'] = (float)$r['current_stock'];
            $r['cost_per_unit'] = (int)$r['cost_per_unit'];
            $r['estimated_cost'] = (int)round($r['quantity_needed'] * $r['cost_per_unit']);
        }

        Response::success($rows);
    }

    public function save(array $params): void {
        $tenantId = TenantContext::id();
        $productId = (int)($params['id'] ?? 0);
        $body = Request::body();
        $recipes = $body['recipes'] ?? [];

        if (!is_array($recipes)) {
            Response::error('Format resep tidak valid (harus array)', 422);
            return;
        }

        $db = Database::getInstance()->pdo();
        $db->beginTransaction();

        try {
            // Check product exists
            $pStmt = $db->prepare('SELECT id, name FROM products WHERE id = ? AND tenant_id = ?');
            $pStmt->execute([$productId, $tenantId]);
            if (!$pStmt->fetch()) {
                throw new Exception('Produk tidak ditemukan');
            }

            // Remove existing recipes for this product
            $del = $db->prepare('DELETE FROM pos_product_recipes WHERE product_id = ? AND tenant_id = ?');
            $del->execute([$productId, $tenantId]);

            $ins = $db->prepare('INSERT INTO pos_product_recipes (tenant_id, product_id, ingredient_id, quantity_needed, unit) 
                                 VALUES (?, ?, ?, ?, ?)');

            foreach ($recipes as $item) {
                $ingrId = (int)($item['ingredient_id'] ?? 0);
                $qty = (float)($item['quantity_needed'] ?? 0.0);
                $unit = trim((string)($item['unit'] ?? 'pcs'));

                if ($ingrId > 0 && $qty > 0) {
                    $ins->execute([$tenantId, $productId, $ingrId, $qty, $unit]);
                }
            }

            $db->commit();
            Response::success(null, 'Resep BOM produk berhasil disimpan');
        } catch (Exception $e) {
            $db->rollBack();
            Response::error($e->getMessage(), 400);
        }
    }
}
