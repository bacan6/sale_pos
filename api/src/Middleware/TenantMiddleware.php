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
                    TenantContext::set($tenant);
                }
            }
        }

        if (!TenantContext::check()) {
            Response::error('Tenant tidak teridentifikasi. Pastikan perangkat terhubung atau sertakan X-Tenant-Slug', 403);
        }

        $tenant = TenantContext::get();

        if ($tenant['status'] === 'suspended') {
            Response::error('Akun tenant sedang ditangguhkan (suspended). Hubungi customer support', 403);
        }

        if (isset($tenant['expires_at']) && $tenant['expires_at'] !== null) {
            if (strtotime((string)$tenant['expires_at']) < time()) {
                Response::error('Langganan tenant telah kedaluwarsa. Silakan perpanjang langganan Anda', 402);
            }
        }
    }
}
