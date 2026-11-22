<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use Exception;
use PDO;

class SaasRegistrationController {
    public function register(): void {
        $body = Request::body();
        $name = trim((string)($body['name'] ?? ''));
        $slug = trim((string)($body['slug'] ?? ''));
        $email = trim((string)($body['email'] ?? ''));
        $phone = trim((string)($body['phone'] ?? ''));
        $address = trim((string)($body['address'] ?? ''));
        $adminUsername = trim((string)($body['admin_username'] ?? 'admin'));
        $adminPassword = (string)($body['admin_password'] ?? '');

        if ($name === '' || $email === '' || $adminPassword === '') {
            Response::error('Nama cafe/restoran, email pendaftar, dan password admin wajib diisi', 422);
        }

        if ($slug === '') {
            $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $name), '-'));
        }

        $db = Database::getInstance()->pdo();
        $db->beginTransaction();

        try {
            $chkSlug = $db->prepare('SELECT id FROM tenants WHERE slug = ? OR email = ? LIMIT 1');
            $chkSlug->execute([$slug, $email]);
            if ($chkSlug->fetch()) {
                throw new Exception('Slug atau email cafe sudah terdaftar. Gunakan slug atau email lain.');
            }

            $stmtTenant = $db->prepare('INSERT INTO tenants (name, slug, email, phone, address, status) VALUES (?, ?, ?, ?, ?, "active")');
            $stmtTenant->execute([$name, $slug, $email, $phone ?: null, $address ?: null]);
            $tenantId = (int)$db->lastInsertId();

            $config = require __DIR__ . '/../../config/app.php';
            $defaultPlan = (string)($config['saas']['default_plan'] ?? 'starter');
            $maxDevices = (int)($config['saas']['plans'][$defaultPlan]['max_devices'] ?? 3);

            $stmtSub = $db->prepare('INSERT INTO subscriptions (tenant_id, plan, max_devices, status, starts_at, expires_at) 
                                     VALUES (?, ?, ?, "active", NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))');
            $stmtSub->execute([$tenantId, $defaultPlan, $maxDevices]);

            $passHash = password_hash($adminPassword, PASSWORD_BCRYPT);
            $stmtUser = $db->prepare('INSERT INTO users (tenant_id, username, password_hash, full_name, role, is_active) 
                                     VALUES (?, ?, ?, ?, "admin", 1)');
            $stmtUser->execute([$tenantId, $adminUsername, $passHash, "Owner {$name}"]);

            // Buat kategori bawaan untuk tenant baru
            $db->prepare('INSERT INTO product_categories (tenant_id, name, code, sort_order) VALUES (?, "Coffee", "CAT-CF", 1), (?, "Non-Coffee", "CAT-NC", 2), (?, "Food & Snacks", "CAT-FD", 3)')
               ->execute([$tenantId, $tenantId, $tenantId]);

            // Buat zona ruangan default
            $db->prepare('INSERT INTO room_categories (tenant_id, name, description, sort_order) VALUES (?, "Indoor", "Area Dalam Ruangan AC", 1), (?, "Outdoor", "Area Luar Ruangan", 2)')
               ->execute([$tenantId, $tenantId]);

            // Buat default primary device kasir
            $defaultDeviceId = 'POS-' . strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $slug), 0, 4)) . '-' . $tenantId . '-' . strtoupper(substr(bin2hex(random_bytes(2)), 0, 3));
            $defaultDeviceSecret = 'sec_' . bin2hex(random_bytes(12));
            $db->prepare('INSERT INTO devices (tenant_id, device_id, device_secret, name, role, is_active) VALUES (?, ?, ?, "Kasir Utama", "cashier", 1)')
               ->execute([$tenantId, $defaultDeviceId, $defaultDeviceSecret]);

            $db->commit();

            Response::success([
                'tenant_id' => $tenantId,
                'name' => $name,
                'slug' => $slug,
                'plan' => $defaultPlan,
                'trial_days' => 30,
                'primary_device' => [
                    'device_id' => $defaultDeviceId,
                    'device_secret' => $defaultDeviceSecret,
                ],
                'admin_user' => $adminUsername,
            ], 'Registrasi SaaS Tenant Cafe berhasil! Silakan gunakan kredensial perangkat untuk POS.', 201);
        } catch (Exception $e) {
            $db->rollBack();
            Response::error($e->getMessage(), 400);
        }
    }
}
