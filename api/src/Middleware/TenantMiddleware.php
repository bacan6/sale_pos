<?php
declare(strict_types=1);

namespace App\Middleware;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;

class TenantMiddleware {
    public static function handle(): void {
        if (!TenantContext::check()) {
            $slug = Request::header('X-Tenant-Slug');
            if ($slug) {
                $db = Database::getInstance()->pdo();
                $stmt = $db->prepare('SELECT t.*, s.plan, s.max_devices, s.status as sub_status, s.expires_at 
                                      FROM tenants t 
                                      LEFT JOIN subscriptions s ON t.id = s.tenant_id 
                                      WHERE t.slug = ? LIMIT 1');
                $stmt->execute([$slug]);
                $tenant = $stmt->fetch();
                if ($tenant) {
                    TenantContext::set([
                        'id' => (int)$tenant['id'],
                        'name' => (string)$tenant['name'],
                        'slug' => (string)$tenant['slug'],
                        'status' => (string)$tenant['status'],
                        'plan' => (string)($tenant['plan'] ?? 'free'),
                        'max_devices' => (int)($tenant['max_devices'] ?? 1),
                        'expires_at' => $tenant['expires_at'],
                        'sub_status' => (string)($tenant['sub_status'] ?? 'active'),
                    ]);
                }
            }
        }

        if (!TenantContext::check()) {
            Response::error('Tenant tidak teridentifikasi. Pastikan perangkat terhubung atau sertakan X-Tenant-Slug', 403);
        }

        $tenant = TenantContext::get();
        $status = (string)($tenant['status'] ?? 'active');

        if ($status === 'waiting_activation') {
            Response::error('Akun tenant sedang menunggu pembayaran aktivasi awal. Silakan selesaikan pembayaran.', 403, [
                'tenant_status' => 'waiting_activation',
                'action_required' => 'activation_payment',
            ]);
        }

        if ($status === 'on_hold') {
            Response::error('Akun tenant dalam status on-hold karena pembayaran tertunda. Silakan selesaikan tagihan langganan.', 403, [
                'tenant_status' => 'on_hold',
                'action_required' => 'recurring_payment',
            ]);
        }

        if ($status === 'terminated') {
            Response::error('Akun tenant telah diterminasi permanen. Akses ditutup.', 403, [
                'tenant_status' => 'terminated',
            ]);
        }

        if (isset($tenant['expires_at']) && $tenant['expires_at'] !== null) {
            if (strtotime((string)$tenant['expires_at']) < time()) {
                Response::error('Langganan tenant telah kedaluwarsa. Silakan perpanjang langganan Anda', 402, [
                    'tenant_status' => 'expired',
                    'action_required' => 'renew_subscription',
                ]);
            }
        }
    }
}
