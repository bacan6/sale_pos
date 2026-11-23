<?php
declare(strict_types=1);

namespace App\Modules\Accounting\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use Exception;
use PDO;

class CoaController {
    public function index(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $type = Request::query('type');
        $search = Request::query('search');

        $sql = 'SELECT a.*, p.name as parent_name,
                       COALESCE((SELECT SUM(debit - credit) FROM accounting_journal_items ji 
                                 JOIN accounting_journal_entries je ON ji.journal_entry_id = je.id 
                                 WHERE ji.account_id = a.id AND je.status = "posted"), 0) as raw_balance
                FROM accounting_accounts a
                LEFT JOIN accounting_accounts p ON a.parent_id = p.id
                WHERE a.tenant_id = ?';
        $params = [$tenantId];

        if ($type) {
            $sql .= ' AND a.type = ?';
            $params[] = $type;
        }

        if ($search) {
            $sql .= ' AND (a.code LIKE ? OR a.name LIKE ?)';
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
        }

        $sql .= ' ORDER BY a.code ASC';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $accounts = $stmt->fetchAll();

        foreach ($accounts as &$acc) {
            $raw = (float)$acc['raw_balance'];
            $acc['current_balance'] = $acc['normal_balance'] === 'credit' ? -$raw : $raw;
        }

        Response::success($accounts);
    }

    public function show(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT a.*, p.name as parent_name 
                              FROM accounting_accounts a
                              LEFT JOIN accounting_accounts p ON a.parent_id = p.id
                              WHERE a.id = ? AND a.tenant_id = ? LIMIT 1');
        $stmt->execute([$id, $tenantId]);
        $acc = $stmt->fetch();

        if (!$acc) {
            Response::error('Akun tidak ditemukan', 404);
        }

        Response::success($acc);
    }

    public function store(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();

        $code = trim((string)($body['code'] ?? ''));
        $name = trim((string)($body['name'] ?? ''));
        $type = (string)($body['type'] ?? 'asset');
        $normalBalance = (string)($body['normal_balance'] ?? ($type === 'liability' || $type === 'equity' || $type === 'revenue' ? 'credit' : 'debit'));
        $parentId = !empty($body['parent_id']) ? (int)$body['parent_id'] : null;

        if ($code === '' || $name === '') {
            Response::error('Kode dan nama akun wajib diisi', 422);
        }

        $validTypes = ['asset', 'liability', 'equity', 'revenue', 'cogs', 'expense'];
        if (!in_array($type, $validTypes, true)) {
            Response::error('Tipe akun tidak valid', 422);
        }

        $db = Database::getInstance()->pdo();

        // Check duplicate code
        $dupStmt = $db->prepare('SELECT id FROM accounting_accounts WHERE tenant_id = ? AND code = ? LIMIT 1');
        $dupStmt->execute([$tenantId, $code]);
        if ($dupStmt->fetch()) {
            Response::error("Kode akun {$code} sudah digunakan oleh akun lain", 422);
        }

        $ins = $db->prepare('INSERT INTO accounting_accounts (tenant_id, code, name, type, normal_balance, parent_id, is_active, is_system) 
                             VALUES (?, ?, ?, ?, ?, ?, 1, 0)');
        $ins->execute([$tenantId, $code, $name, $type, $normalBalance, $parentId]);

        Response::success(['id' => (int)$db->lastInsertId(), 'code' => $code, 'name' => $name], 'Akun berhasil ditambahkan', 201);
    }

    public function update(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $body = Request::body();

        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('SELECT * FROM accounting_accounts WHERE id = ? AND tenant_id = ? LIMIT 1');
        $stmt->execute([$id, $tenantId]);
        $acc = $stmt->fetch();

        if (!$acc) {
            Response::error('Akun tidak ditemukan', 404);
        }

        $name = isset($body['name']) ? trim((string)$body['name']) : $acc['name'];
        $type = $body['type'] ?? $acc['type'];
        $normalBalance = $body['normal_balance'] ?? $acc['normal_balance'];
        $parentId = array_key_exists('parent_id', $body) ? (!empty($body['parent_id']) ? (int)$body['parent_id'] : null) : $acc['parent_id'];
        $isActive = isset($body['is_active']) ? (int)$body['is_active'] : (int)$acc['is_active'];

        $up = $db->prepare('UPDATE accounting_accounts 
                            SET name = ?, type = ?, normal_balance = ?, parent_id = ?, is_active = ? 
                            WHERE id = ? AND tenant_id = ?');
        $up->execute([$name, $type, $normalBalance, $parentId, $isActive, $id, $tenantId]);

        Response::success(null, 'Akun berhasil diperbarui');
    }

    public function destroy(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT * FROM accounting_accounts WHERE id = ? AND tenant_id = ? LIMIT 1');
        $stmt->execute([$id, $tenantId]);
        $acc = $stmt->fetch();

        if (!$acc) {
            Response::error('Akun tidak ditemukan', 404);
        }

        if ((int)$acc['is_system'] === 1) {
            Response::error('Akun sistem dasar tidak dapat dihapus', 422);
        }

        $usage = $db->prepare('SELECT count(*) FROM accounting_journal_items WHERE account_id = ? AND tenant_id = ?');
        $usage->execute([$id, $tenantId]);
        if ((int)$usage->fetchColumn() > 0) {
            // Soft-deactivate if has history
            $db->prepare('UPDATE accounting_accounts SET is_active = 0 WHERE id = ? AND tenant_id = ?')->execute([$id, $tenantId]);
            Response::success(null, 'Akun telah dinonaktifkan karena memiliki riwayat jurnal transaksi');
        }

        $db->prepare('DELETE FROM accounting_accounts WHERE id = ? AND tenant_id = ?')->execute([$id, $tenantId]);
        Response::success(null, 'Akun berhasil dihapus');
    }
}
