<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use PDO;

class ProductController {
    public function index(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();
        $categoryId = Request::query('category_id');
        $availableOnly = Request::query('available_only');

        $sql = 'SELECT p.*, pc.name as category_name 
                FROM products p 
                JOIN product_categories pc ON p.category_id = pc.id 
                WHERE p.tenant_id = ?';
        $values = [$tenantId];

        if ($categoryId !== null) {
            $sql .= ' AND p.category_id = ?';
            $values[] = (int)$categoryId;
        }

        if ($availableOnly === '1') {
            $sql .= ' AND p.is_available = 1';
        }

        $sql .= ' ORDER BY p.category_id ASC, p.id ASC';

        $stmt = $db->prepare($sql);
        $stmt->execute($values);
        $rows = $stmt->fetchAll();

        foreach ($rows as &$row) {
            $row['options'] = !empty($row['options_json']) ? json_decode($row['options_json'], true) : [];
            unset($row['options_json']);
        }

        Response::success($rows);
    }

    public function show(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('SELECT p.*, pc.name as category_name 
                              FROM products p 
                              JOIN product_categories pc ON p.category_id = pc.id 
                              WHERE p.id = ? AND p.tenant_id = ? LIMIT 1');
        $stmt->execute([$id, $tenantId]);
        $row = $stmt->fetch();

        if (!$row) {
            Response::error('Produk tidak ditemukan', 404);
        }

        $row['options'] = !empty($row['options_json']) ? json_decode($row['options_json'], true) : [];
        unset($row['options_json']);

        Response::success($row);
    }

    public function store(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();
        $code = trim((string)($body['code'] ?? ''));
        $name = trim((string)($body['name'] ?? ''));
        $categoryId = (int)($body['category_id'] ?? 0);
        $price = (int)($body['price'] ?? 0);
        $cost = (int)($body['cost'] ?? 0);
        $stock = (int)($body['stock'] ?? 0);
        $isAvailable = isset($body['is_available']) ? (int)$body['is_available'] : 1;
        $image = (string)($body['image'] ?? '');
        $description = (string)($body['description'] ?? '');
        $options = isset($body['options']) && is_array($body['options']) ? json_encode($body['options']) : null;

        if ($code === '' || $name === '' || $categoryId <= 0) {
            Response::error('Kode produk, nama produk, dan kategori wajib diisi', 422);
        }

        $db = Database::getInstance()->pdo();

        $catCheck = $db->prepare('SELECT id FROM product_categories WHERE id = ? AND tenant_id = ? LIMIT 1');
        $catCheck->execute([$categoryId, $tenantId]);
        if (!$catCheck->fetch()) {
            Response::error('Kategori produk tidak valid untuk tenant ini', 400);
        }

        $codeCheck = $db->prepare('SELECT id FROM products WHERE code = ? AND tenant_id = ? LIMIT 1');
        $codeCheck->execute([$code, $tenantId]);
        if ($codeCheck->fetch()) {
            Response::error('Kode produk (SKU) sudah digunakan pada tenant ini', 409);
        }

        $stmt = $db->prepare('INSERT INTO products (tenant_id, code, name, category_id, price, cost, stock, is_available, image, description, options_json) 
                              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$tenantId, $code, $name, $categoryId, $price, $cost, $stock, $isAvailable, $image ?: null, $description ?: null, $options]);

        $id = (int)$db->lastInsertId();
        Response::success(['id' => $id, 'code' => $code, 'name' => $name], 'Produk berhasil ditambahkan', 201);
    }

    public function update(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $body = Request::body();
        $db = Database::getInstance()->pdo();

        $check = $db->prepare('SELECT id FROM products WHERE id = ? AND tenant_id = ? LIMIT 1');
        $check->execute([$id, $tenantId]);
        if (!$check->fetch()) {
            Response::error('Produk tidak ditemukan', 404);
        }

        $fields = [];
        $values = [];

        if (isset($body['code'])) {
            $code = trim((string)$body['code']);
            if ($code === '') Response::error('Kode produk tidak boleh kosong', 422);
            $dup = $db->prepare('SELECT id FROM products WHERE code = ? AND id != ? AND tenant_id = ? LIMIT 1');
            $dup->execute([$code, $id, $tenantId]);
            if ($dup->fetch()) Response::error('Kode produk sudah digunakan', 409);
            $fields[] = '`code` = ?';
            $values[] = $code;
        }

        if (isset($body['name'])) {
            $name = trim((string)$body['name']);
            if ($name === '') Response::error('Nama produk tidak boleh kosong', 422);
            $fields[] = '`name` = ?';
            $values[] = $name;
        }

        if (isset($body['category_id'])) {
            $catId = (int)$body['category_id'];
            $catCheck = $db->prepare('SELECT id FROM product_categories WHERE id = ? AND tenant_id = ? LIMIT 1');
            $catCheck->execute([$catId, $tenantId]);
            if (!$catCheck->fetch()) Response::error('Kategori produk tidak valid', 400);
            $fields[] = '`category_id` = ?';
            $values[] = $catId;
        }

        if (isset($body['price'])) {
            $fields[] = '`price` = ?';
            $values[] = (int)$body['price'];
        }

        if (isset($body['cost'])) {
            $fields[] = '`cost` = ?';
            $values[] = (int)$body['cost'];
        }

        if (isset($body['stock'])) {
            $fields[] = '`stock` = ?';
            $values[] = (int)$body['stock'];
        }

        if (isset($body['is_available'])) {
            $fields[] = '`is_available` = ?';
            $values[] = (int)$body['is_available'];
        }

        if (array_key_exists('image', $body)) {
            $fields[] = '`image` = ?';
            $values[] = $body['image'] !== null ? (string)$body['image'] : null;
        }

        if (array_key_exists('description', $body)) {
            $fields[] = '`description` = ?';
            $values[] = $body['description'] !== null ? (string)$body['description'] : null;
        }

        if (array_key_exists('options', $body)) {
            $fields[] = '`options_json` = ?';
            $values[] = is_array($body['options']) ? json_encode($body['options']) : null;
        }

        if (empty($fields)) {
            Response::error('Tidak ada data yang diperbarui', 422);
        }

        $values[] = $id;
        $values[] = $tenantId;
        $sql = 'UPDATE products SET ' . implode(', ', $fields) . ' WHERE id = ? AND tenant_id = ?';
        $stmt = $db->prepare($sql);
        $stmt->execute($values);

        Response::success(['id' => $id], 'Produk berhasil diperbarui');
    }

    public function destroy(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('DELETE FROM products WHERE id = ? AND tenant_id = ?');
        $stmt->execute([$id, $tenantId]);

        if ($stmt->rowCount() === 0) {
            Response::error('Produk tidak ditemukan', 404);
        }

        Response::success(['id' => $id], 'Produk berhasil dihapus');
    }
}
