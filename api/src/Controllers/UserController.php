<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use PDO;

class UserController {
    public function index(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('SELECT id, username, full_name, role, is_active, created_at, updated_at 
                              FROM users 
                              WHERE tenant_id = ? 
                              ORDER BY id ASC');
        $stmt->execute([$tenantId]);
        $data = $stmt->fetchAll();
        Response::success($data);
    }

    public function show(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('SELECT id, username, full_name, role, is_active, created_at, updated_at 
                              FROM users 
                              WHERE id = ? AND tenant_id = ? LIMIT 1');
        $stmt->execute([$id, $tenantId]);
        $row = $stmt->fetch();

        if (!$row) {
            Response::error('Pengguna tidak ditemukan', 404);
        }

        Response::success($row);
    }

    public function store(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();
        $username = trim((string)($body['username'] ?? ''));
        $password = (string)($body['password'] ?? '');
        $fullName = trim((string)($body['full_name'] ?? ''));
        $role = (string)($body['role'] ?? 'cashier');
        $isActive = isset($body['is_active']) ? (int)$body['is_active'] : 1;

        if ($username === '' || $password === '' || $fullName === '') {
            Response::error('Username, password, dan nama lengkap wajib diisi', 422);
        }

        $validRoles = ['admin', 'cashier', 'waitstaff', 'kitchen'];
        if (!in_array($role, $validRoles, true)) {
            Response::error('Role pengguna tidak valid', 422);
        }

        $db = Database::getInstance()->pdo();
        $check = $db->prepare('SELECT id FROM users WHERE username = ? AND tenant_id = ? LIMIT 1');
        $check->execute([$username, $tenantId]);
        if ($check->fetch()) {
            Response::error('Username sudah digunakan pada tenant ini', 409);
        }

        $hash = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $db->prepare('INSERT INTO users (tenant_id, username, password_hash, full_name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([$tenantId, $username, $hash, $fullName, $role, $isActive]);
        $id = (int)$db->lastInsertId();

        Response::success(['id' => $id, 'username' => $username, 'role' => $role], 'Pengguna berhasil didaftarkan', 201);
    }

    public function update(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $body = Request::body();
        $db = Database::getInstance()->pdo();

        $check = $db->prepare('SELECT id FROM users WHERE id = ? AND tenant_id = ? LIMIT 1');
        $check->execute([$id, $tenantId]);
        if (!$check->fetch()) {
            Response::error('Pengguna tidak ditemukan', 404);
        }

        $fields = [];
        $values = [];

        if (isset($body['full_name'])) {
            $fields[] = '`full_name` = ?';
            $values[] = trim((string)$body['full_name']);
        }

        if (isset($body['role'])) {
            $role = (string)$body['role'];
            $validRoles = ['admin', 'cashier', 'waitstaff', 'kitchen'];
            if (!in_array($role, $validRoles, true)) Response::error('Role tidak valid', 422);
            $fields[] = '`role` = ?';
            $values[] = $role;
        }

        if (isset($body['password']) && trim((string)$body['password']) !== '') {
            $fields[] = '`password_hash` = ?';
            $values[] = password_hash((string)$body['password'], PASSWORD_BCRYPT);
        }

        if (isset($body['is_active'])) {
            $fields[] = '`is_active` = ?';
            $values[] = (int)$body['is_active'];
        }

        if (empty($fields)) {
            Response::error('Tidak ada data yang diperbarui', 422);
        }

        $values[] = $id;
        $values[] = $tenantId;
        $sql = 'UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ? AND tenant_id = ?';
        $stmt = $db->prepare($sql);
        $stmt->execute($values);

        Response::success(['id' => $id], 'Pengguna berhasil diperbarui');
    }
}
