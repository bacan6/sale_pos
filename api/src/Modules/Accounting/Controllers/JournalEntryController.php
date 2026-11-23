<?php
declare(strict_types=1);

namespace App\Modules\Accounting\Controllers;

use App\Core\AuthContext;
use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use App\Modules\Accounting\Services\AccountingPostingService;
use Exception;
use PDO;

class JournalEntryController {
    public function index(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $startDate = Request::query('start_date');
        $endDate = Request::query('end_date');
        $refType = Request::query('reference_type');
        $status = Request::query('status') ?: 'posted';
        $limit = min(200, max(1, (int)(Request::query('limit') ?: 50)));

        $sql = 'SELECT je.*, u.full_name as creator_name,
                       (SELECT count(*) FROM accounting_journal_items ji WHERE ji.journal_entry_id = je.id) as items_count
                FROM accounting_journal_entries je
                LEFT JOIN users u ON je.created_by = u.id
                WHERE je.tenant_id = ?';
        $params = [$tenantId];

        if ($startDate) {
            $sql .= ' AND je.entry_date >= ?';
            $params[] = $startDate;
        }
        if ($endDate) {
            $sql .= ' AND je.entry_date <= ?';
            $params[] = $endDate;
        }
        if ($refType) {
            $sql .= ' AND je.reference_type = ?';
            $params[] = $refType;
        }
        if ($status && $status !== 'all') {
            $sql .= ' AND je.status = ?';
            $params[] = $status;
        }

        $sql .= ' ORDER BY je.entry_date DESC, je.id DESC LIMIT ' . $limit;

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $entries = $stmt->fetchAll();

        Response::success($entries);
    }

    public function show(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT je.*, u.full_name as creator_name 
                              FROM accounting_journal_entries je
                              LEFT JOIN users u ON je.created_by = u.id
                              WHERE je.id = ? AND je.tenant_id = ? LIMIT 1');
        $stmt->execute([$id, $tenantId]);
        $entry = $stmt->fetch();

        if (!$entry) {
            Response::error('Jurnal transaksi tidak ditemukan', 404);
        }

        $itemStmt = $db->prepare('SELECT ji.*, a.code as account_code, a.name as account_name, a.type as account_type 
                                  FROM accounting_journal_items ji
                                  JOIN accounting_accounts a ON ji.account_id = a.id
                                  WHERE ji.journal_entry_id = ? AND ji.tenant_id = ? 
                                  ORDER BY ji.id ASC');
        $itemStmt->execute([$id, $tenantId]);
        $entry['items'] = $itemStmt->fetchAll();

        Response::success($entry);
    }

    public function store(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();
        $db = Database::getInstance()->pdo();

        $entryDate = trim((string)($body['entry_date'] ?? date('Y-m-d')));
        $notes = trim((string)($body['notes'] ?? 'Jurnal Penyesuaian Manual'));
        $referenceType = (string)($body['reference_type'] ?? 'manual');
        $referenceId = !empty($body['reference_id']) ? (int)$body['reference_id'] : null;
        $items = $body['items'] ?? [];
        $userId = AuthContext::id() ?: null;

        // Verify period is not closed
        $pCheck = $db->prepare('SELECT status FROM accounting_periods 
                                WHERE tenant_id = ? AND ? BETWEEN start_date AND end_date LIMIT 1');
        $pCheck->execute([$tenantId, $entryDate]);
        $pStatus = $pCheck->fetchColumn();
        if ($pStatus === 'closed') {
            Response::error("Periode akuntansi untuk tanggal {$entryDate} telah ditutup buku. Transaksi tidak dapat ditambahkan.", 422);
        }

        $db->beginTransaction();
        try {
            $created = AccountingPostingService::createJournalEntry(
                $db,
                $tenantId,
                $entryDate,
                $referenceType,
                $referenceId,
                $notes,
                $items,
                $userId
            );
            $db->commit();
            Response::success($created, 'Jurnal umum berhasil dicatat dan diposting', 201);
        } catch (Exception $e) {
            $db->rollBack();
            Response::error($e->getMessage(), 422);
        }
    }

    public function void(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT * FROM accounting_journal_entries WHERE id = ? AND tenant_id = ? LIMIT 1');
        $stmt->execute([$id, $tenantId]);
        $entry = $stmt->fetch();

        if (!$entry) {
            Response::error('Jurnal transaksi tidak ditemukan', 404);
        }

        if ($entry['status'] === 'void') {
            Response::error('Jurnal sudah dalam status void', 422);
        }

        $pCheck = $db->prepare('SELECT status FROM accounting_periods 
                                WHERE tenant_id = ? AND ? BETWEEN start_date AND end_date LIMIT 1');
        $pCheck->execute([$tenantId, $entry['entry_date']]);
        if ($pCheck->fetchColumn() === 'closed') {
            Response::error('Periode akuntansi tanggal jurnal ini telah ditutup buku', 422);
        }

        $db->prepare('UPDATE accounting_journal_entries SET status = "void" WHERE id = ? AND tenant_id = ?')
           ->execute([$id, $tenantId]);

        Response::success(null, 'Jurnal transaksi berhasil di-void (dibatalkan)');
    }
}
