<?php
declare(strict_types=1);

namespace App\Modules\Accounting\Controllers;

use App\Core\AuthContext;
use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use Exception;
use PDO;

class PeriodClosingController {
    public function index(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT p.*, u.full_name as closed_by_name 
                              FROM accounting_periods p 
                              LEFT JOIN users u ON p.closed_by = u.id 
                              WHERE p.tenant_id = ? 
                              ORDER BY p.start_date DESC');
        $stmt->execute([$tenantId]);
        Response::success($stmt->fetchAll());
    }

    public function store(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();
        $db = Database::getInstance()->pdo();

        $name = trim((string)($body['period_name'] ?? ''));
        $startDate = trim((string)($body['start_date'] ?? ''));
        $endDate = trim((string)($body['end_date'] ?? ''));

        if ($name === '' || $startDate === '' || $endDate === '') {
            Response::error('Nama periode, tanggal mulai, dan tanggal akhir wajib diisi', 422);
        }

        if ($startDate > $endDate) {
            Response::error('Tanggal mulai tidak boleh lebih besar dari tanggal akhir', 422);
        }

        // Check overlapping periods
        $check = $db->prepare('SELECT id FROM accounting_periods 
                               WHERE tenant_id = ? AND NOT (end_date < ? OR start_date > ?) LIMIT 1');
        $check->execute([$tenantId, $startDate, $endDate]);
        if ($check->fetch()) {
            Response::error('Periode baru tumpang tindih dengan rentang tanggal periode yang sudah ada', 422);
        }

        $ins = $db->prepare('INSERT INTO accounting_periods (tenant_id, period_name, start_date, end_date, status) 
                             VALUES (?, ?, ?, ?, "open")');
        $ins->execute([$tenantId, $name, $startDate, $endDate]);

        Response::success(['id' => (int)$db->lastInsertId()], 'Periode akuntansi baru berhasil dibuka', 201);
    }

    public function close(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $userId = AuthContext::id() ?: null;
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT * FROM accounting_periods WHERE id = ? AND tenant_id = ? LIMIT 1');
        $stmt->execute([$id, $tenantId]);
        $period = $stmt->fetch();

        if (!$period) {
            Response::error('Periode tidak ditemukan', 404);
        }

        if ($period['status'] === 'closed') {
            Response::error('Periode ini sudah ditutup sebelumnya', 422);
        }

        // Check trial balance equality in this period
        $tbStmt = $db->prepare('SELECT 
            COALESCE(SUM(ji.debit), 0) as total_debit,
            COALESCE(SUM(ji.credit), 0) as total_credit
            FROM accounting_journal_items ji
            JOIN accounting_journal_entries je ON ji.journal_entry_id = je.id
            WHERE ji.tenant_id = ? AND je.status = "posted" AND je.entry_date BETWEEN ? AND ?');
        $tbStmt->execute([$tenantId, $period['start_date'], $period['end_date']]);
        $res = $tbStmt->fetch();

        $diff = abs((float)$res['total_debit'] - (float)$res['total_credit']);
        if ($diff > 0.01) {
            Response::error("Tidak dapat menutup buku: Jurnal dalam periode ini belum seimbang (Selisih: Rp " . number_format($diff, 2) . ")", 422);
        }

        $db->prepare('UPDATE accounting_periods SET status = "closed", closed_at = NOW(), closed_by = ? WHERE id = ? AND tenant_id = ?')
           ->execute([$userId, $id, $tenantId]);

        Response::success(null, "Periode akuntansi {$period['period_name']} berhasil ditutup buku. Jurnal dalam periode ini telah dikunci.");
    }
}
