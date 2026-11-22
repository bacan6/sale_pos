<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use PDO;

class ProductCategoryController {
    public function index(): void {
        $db = Database::getInstance()->pdo();
        $stmt = $db->query('SELECT * FROM product_categories ORDER BY sort_order ASC, name ASC');
        $data = $stmt->fetchAll();
        Response::success($data);
    }

    public function show(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('SELECT * FROM product_categories WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        if (!$row) {
            Response::error('Kategori produk tidak ditemukan', 404);
        }

        Response::success($row);
    }

    public function store(): void {
        $body = Request::body();
        $name = trim((string)($body['name'] ?? ''));
        $code = trim((string)($body['code'] ?? ''));
        $sortOrder = (int)($body['sort_order'] ?? 0);
        $isActive = isset($body['is_active']) ? (int)$body['is_active'] : 1;

        if ($name === '') {
            Response::error('Nama kategori wajib diisi', 422);
        }

        $db = Database::getInstance()->pdo();
        $check = $db->prepare('SELECT id FROM product_categories WHERE name = ? LIMIT 1');
        $check->execute([$name]);
        if ($check->fetch()) {
            Response::error('Nama kategori sudah ada', 409);
        }

        $stmt = $db->prepare('INSERT INTO product_categories (name, code, sort_order, is_active) VALUES (?, ?, ?, ?)');
        $stmt->execute([$name, $code ?: null, $sortOrder, $isActive]);
        $id = (int)$db->lastInsertId();

        Response::success(['id' => $id, 'name' => $name], 'Kategori produk berhasil ditambahkan', 201);
    }

    public function update(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $body = Request::body();

        $db = Database::getInstance()->pdo();
        $check = $db->prepare('SELECT id FROM product_categories WHERE id = ? LIMIT 1');
        $check->execute([$id]);
        if (!$check->fetch()) {
            Response::error('Kategori produk tidak ditemukan', 404);
        }

        $fields = [];
        $values = [];

        if (isset($body['name'])) {
            $name = trim((string)$body['name']);
            if ($name === '') {
                Response::error('Nama kategori tidak boleh kosong', 422);
            }
            $dup = $db->prepare('SELECT id FROM product_categories WHERE name = ? AND id != ? LIMIT 1');
            $dup->execute([$name, $id]);
            if ($dup->fetch()) {
                Response::error('Nama kategori sudah digunakan', 409);
            }
            $fields[] = '`name` = ?';
            $values[] = $name;
        }

        if (array_key_exists('code', $body)) {
            $fields[] = '`code` = ?';
            $values[] = $body['code'] !== null ? trim((string)$body['code']) : null;
        }

        if (isset($body['sort_order'])) {
            $fields[] = '`sort_order` = ?';
            $values[] = (int)$body['sort_order'];
        }

        if (isset($body['is_active'])) {
            $fields[] = '`is_active` = ?';
            $values[] = (int)$body['is_active'];
        }

        if (empty($fields)) {
            Response::error('Tidak ada perubahan data', 422);
        }

        $values[] = $id;
        $sql = 'UPDATE product_categories SET ' . implode(', ', $fields) . ' WHERE id = ?';
        $stmt = $db->prepare($sql);
        $stmt->execute($values);

        Response::success(['id' => $id], 'Kategori produk berhasil diperbarui');
    }

    public function destroy(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $db = Database::getInstance()->pdo();

        $prodCheck = $db->prepare('SELECT COUNT(*) as cnt FROM products WHERE category_id = ?');
        $prodCheck->execute([$id]);
        $cnt = (int)$prodCheck->fetch()['cnt'];
        if ($cnt > 0) {
            Response::error("Kategori tidak dapat dihapus karena masih digunakan oleh {$cnt} produk", 400);
        }

        $stmt = $db->prepare('DELETE FROM product_categories WHERE id = ?');
        $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            Response::error('Kategori produk tidak ditemukan', 404);
        }

        Response::success(['id' => $id], 'Kategori produk berhasil dihapus');
    }
}
