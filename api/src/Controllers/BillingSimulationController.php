<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use Exception;
use PDO;

class BillingSimulationController {
    public function simulateActivation(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();
        $amount = (int)($body['amount'] ?? 250000);
        $method = (string)($body['payment_method'] ?? 'simulation_qris');

        $this->processActivation($tenantId, $amount, $method);
    }

    public function simulateRecurring(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();
        $amount = (int)($body['amount'] ?? 150000);
        $durationDays = (int)($body['duration_days'] ?? 30);
        $method = (string)($body['payment_method'] ?? 'simulation_auto_debit');

        $this->processRecurring($tenantId, $amount, $durationDays, $method);
    }

    public function simulateStatus(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();
        $status = (string)($body['status'] ?? '');

        $this->processStatusChange($tenantId, $status);
    }

    public function simulatePlanChange(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();
        $newPlan = (string)($body['plan'] ?? 'combo_pro');

        $config = require __DIR__ . '/../../config/app.php';
        $plans = $config['saas']['plans'] ?? [];

        if (!isset($plans[$newPlan])) {
            Response::error('Paket tidak valid', 422);
        }

        $planConfig = $plans[$newPlan];
        $modules = (string)($planConfig['modules'] ?? 'pos');
        $maxDevices = (int)($planConfig['max_devices'] ?? 3);

        $db = Database::getInstance()->pdo();
        $db->prepare('UPDATE subscriptions SET plan = ?, modules = ?, max_devices = ? WHERE tenant_id = ?')
           ->execute([$newPlan, $modules, $maxDevices, $tenantId]);

        Response::success([
            'tenant_id' => $tenantId,
            'plan' => $newPlan,
            'modules' => $modules,
            'max_devices' => $maxDevices,
        ], "Paket langganan berhasil diubah ke {$planConfig['name']}");
    }

    public function invoices(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('SELECT * FROM subscription_invoices WHERE tenant_id = ? ORDER BY id DESC');
        $stmt->execute([$tenantId]);
        $rows = $stmt->fetchAll();

        Response::success($rows);
    }

    public function simulateForAdmin(array $params): void {
        $tenantId = (int)($params['id'] ?? 0);
        $body = Request::body();
        $action = (string)($body['action'] ?? 'recurring');

        if ($action === 'activation') {
            $amount = (int)($body['amount'] ?? 250000);
            $method = (string)($body['payment_method'] ?? 'admin_manual_simulation');
            $this->processActivation($tenantId, $amount, $method);
        } elseif ($action === 'recurring') {
            $amount = (int)($body['amount'] ?? 150000);
            $durationDays = (int)($body['duration_days'] ?? 30);
            $method = (string)($body['payment_method'] ?? 'admin_manual_simulation');
            $this->processRecurring($tenantId, $amount, $durationDays, $method);
        } elseif ($action === 'status') {
            $status = (string)($body['status'] ?? '');
            $this->processStatusChange($tenantId, $status);
        } else {
            Response::error('Action simulasi tidak valid. Pilihan: activation, recurring, status', 422);
        }
    }

    private function processActivation(int $tenantId, int $amount, string $method): void {
        $db = Database::getInstance()->pdo();
        $db->beginTransaction();

        try {
            $tStmt = $db->prepare('SELECT id, name, status FROM tenants WHERE id = ? FOR UPDATE');
            $tStmt->execute([$tenantId]);
            $tenant = $tStmt->fetch();

            if (!$tenant) {
                throw new Exception('Tenant tidak ditemukan');
            }

            $invNumber = 'INV-ACT-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));
            $periodStart = date('Y-m-d H:i:s');
            $periodEnd = date('Y-m-d H:i:s', strtotime('+30 days'));

            $insInv = $db->prepare('INSERT INTO subscription_invoices (invoice_number, tenant_id, type, plan, amount, status, payment_method, paid_at, period_start, period_end) 
                                    VALUES (?, ?, "activation", "starter", ?, "paid", ?, NOW(), ?, ?)');
            $insInv->execute([$invNumber, $tenantId, $amount, $method, $periodStart, $periodEnd]);

            $db->prepare('UPDATE tenants SET status = "active" WHERE id = ?')->execute([$tenantId]);

            $db->prepare('UPDATE subscriptions SET status = "active", starts_at = NOW(), expires_at = DATE_ADD(NOW(), INTERVAL 30 DAY) WHERE tenant_id = ?')
               ->execute([$tenantId]);

            $db->commit();

            Response::success([
                'tenant_id' => $tenantId,
                'status' => 'active',
                'invoice_number' => $invNumber,
                'amount_paid' => $amount,
                'subscription_expires_at' => $periodEnd,
            ], 'Simulasi pembayaran aktivasi berhasil. Akun sekarang AKTIF');
        } catch (Exception $e) {
            $db->rollBack();
            Response::error($e->getMessage(), 400);
        }
    }

    private function processRecurring(int $tenantId, int $amount, int $durationDays, string $method): void {
        $db = Database::getInstance()->pdo();
        $db->beginTransaction();

        try {
            $tStmt = $db->prepare('SELECT t.id, t.name, t.status, s.plan, s.expires_at 
                                  FROM tenants t 
                                  LEFT JOIN subscriptions s ON t.id = s.tenant_id 
                                  WHERE t.id = ? FOR UPDATE');
            $tStmt->execute([$tenantId]);
            $tenant = $tStmt->fetch();

            if (!$tenant) {
                throw new Exception('Tenant tidak ditemukan');
            }

            $currentExpiry = !empty($tenant['expires_at']) ? strtotime($tenant['expires_at']) : time();
            $baseTime = max($currentExpiry, time());
            $newExpiry = date('Y-m-d H:i:s', strtotime("+{$durationDays} days", $baseTime));
            $invNumber = 'INV-REC-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));

            $insInv = $db->prepare('INSERT INTO subscription_invoices (invoice_number, tenant_id, type, plan, amount, status, payment_method, paid_at, period_start, period_end) 
                                    VALUES (?, ?, "recurring", ?, ?, "paid", ?, NOW(), FROM_UNIXTIME(?), ?)');
            $insInv->execute([$invNumber, $tenantId, $tenant['plan'] ?? 'starter', $amount, $method, $baseTime, $newExpiry]);

            $db->prepare('UPDATE tenants SET status = "active" WHERE id = ?')->execute([$tenantId]);

            $db->prepare('UPDATE subscriptions SET status = "active", expires_at = ? WHERE tenant_id = ?')
               ->execute([$newExpiry, $tenantId]);

            $db->commit();

            Response::success([
                'tenant_id' => $tenantId,
                'status' => 'active',
                'invoice_number' => $invNumber,
                'amount_paid' => $amount,
                'added_days' => $durationDays,
                'subscription_expires_at' => $newExpiry,
            ], 'Simulasi perpanjangan langganan (recurring) berhasil. Akun AKTIF');
        } catch (Exception $e) {
            $db->rollBack();
            Response::error($e->getMessage(), 400);
        }
    }

    private function processStatusChange(int $tenantId, string $status): void {
        $validStatuses = ['waiting_activation', 'active', 'on_hold', 'terminated'];
        if (!in_array($status, $validStatuses, true)) {
            Response::error('Pilihan status tenant tidak valid. Gunakan: waiting_activation, active, on_hold, terminated', 422);
        }

        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('UPDATE tenants SET status = ? WHERE id = ?');
        $stmt->execute([$status, $tenantId]);

        if ($stmt->rowCount() === 0) {
            $chk = $db->prepare('SELECT id FROM tenants WHERE id = ?');
            $chk->execute([$tenantId]);
            if (!$chk->fetch()) {
                Response::error('Tenant tidak ditemukan', 404);
            }
        }

        if ($status === 'terminated') {
            $db->prepare('UPDATE subscriptions SET status = "cancelled" WHERE tenant_id = ?')->execute([$tenantId]);
        } elseif ($status === 'active') {
            $db->prepare('UPDATE subscriptions SET status = "active" WHERE tenant_id = ?')->execute([$tenantId]);
        }

        Response::success([
            'tenant_id' => $tenantId,
            'status' => $status,
        ], "Status tenant berhasil disimulasikan menjadi: {$status}");
    }
}
