<?php
declare(strict_types=1);

namespace App\Modules\Accounting\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use App\Modules\Accounting\Services\AccountingPostingService;
use PDO;

class AccountingSettingsController {
    public function show(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $settings = AccountingPostingService::getSettings($db, $tenantId);

        // Fetch accounts details for labels
        $accStmt = $db->prepare('SELECT id, code, name, type FROM accounting_accounts WHERE tenant_id = ?');
        $accStmt->execute([$tenantId]);
        $accounts = $accStmt->fetchAll();
        $accMap = [];
        foreach ($accounts as $a) {
            $accMap[$a['id']] = $a;
        }

        $formatted = [];
        foreach ($settings as $key => $val) {
            $formatted[$key] = $val;
            if (str_ends_with($key, '_id') && $val !== null && isset($accMap[$val])) {
                $formatted[str_replace('_id', '_account', $key)] = $accMap[$val];
            }
        }

        Response::success($formatted);
    }

    public function update(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();
        $db = Database::getInstance()->pdo();

        $allowedKeys = [
            'cash_account_id',
            'bank_account_id',
            'pos_revenue_account_id',
            'hotel_room_revenue_account_id',
            'hotel_service_revenue_account_id',
            'guest_ledger_account_id',
            'service_charge_account_id',
            'tax_payable_account_id',
            'cash_over_account_id',
            'cash_short_account_id',
            'cogs_account_id',
        ];

        $updates = [];
        $params = [];

        foreach ($allowedKeys as $key) {
            if (array_key_exists($key, $body)) {
                $updates[] = "`{$key}` = ?";
                $params[] = !empty($body[$key]) ? (int)$body[$key] : null;
            }
        }

        if (empty($updates)) {
            Response::error('Tidak ada data pengaturan yang dikirim', 422);
        }

        $params[] = $tenantId;
        $sql = 'UPDATE accounting_settings SET ' . implode(', ', $updates) . ' WHERE tenant_id = ?';
        $db->prepare($sql)->execute($params);

        Response::success(null, 'Pengaturan akun akuntansi berhasil diperbarui');
    }
}
