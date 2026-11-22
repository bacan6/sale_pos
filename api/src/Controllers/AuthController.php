<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\AuthContext;
use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use Exception;
use PDO;

class AuthController {
    public function signup(): void {
        $body = Request::body();
        $name = trim((string)($body['name'] ?? ''));
        $slug = trim((string)($body['slug'] ?? ''));
        $email = trim((string)($body['email'] ?? ''));
        $phone = trim((string)($body['phone'] ?? ''));
        $address = trim((string)($body['address'] ?? ''));
        $username = trim((string)($body['username'] ?? 'admin'));
        $password = (string)($body['password'] ?? '');

        if ($name === '' || $email === '' || $password === '') {
            Response::error('Nama cafe, email, dan password wajib diisi', 422);
        }

        if ($slug === '') {
            $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $name), '-'));
        }

        $db = Database::getInstance()->pdo();
        $db->beginTransaction();

        try {
            $chk = $db->prepare('SELECT id FROM tenants WHERE slug = ? OR email = ? LIMIT 1');
            $chk->execute([$slug, $email]);
            if ($chk->fetch()) {
                throw new Exception('Slug atau email cafe sudah digunakan. Gunakan nama atau email lain.');
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

            $passHash = password_hash($password, PASSWORD_BCRYPT);
            $stmtUser = $db->prepare('INSERT INTO users (tenant_id, username, password_hash, full_name, role, is_active) 
                                     VALUES (?, ?, ?, ?, "admin", 1)');
            $stmtUser->execute([$tenantId, $username, $passHash, "Owner {$name}"]);
            $userId = (int)$db->lastInsertId();

            // Default categories
            $db->prepare('INSERT INTO product_categories (tenant_id, name, code, sort_order) VALUES (?, "Coffee", "CAT-CF", 1), (?, "Non-Coffee", "CAT-NC", 2), (?, "Food & Snacks", "CAT-FD", 3)')
               ->execute([$tenantId, $tenantId, $tenantId]);

            // Default room categories
            $db->prepare('INSERT INTO room_categories (tenant_id, name, description, sort_order) VALUES (?, "Indoor", "Area Dalam Ruangan AC", 1), (?, "Outdoor", "Area Luar Ruangan", 2)')
               ->execute([$tenantId, $tenantId]);

            // Default Primary POS Device
            $defaultDeviceId = 'POS-' . strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $slug), 0, 4)) . '-' . $tenantId . '-' . strtoupper(substr(bin2hex(random_bytes(2)), 0, 3));
            $defaultDeviceSecret = 'sec_' . bin2hex(random_bytes(12));
            $db->prepare('INSERT INTO devices (tenant_id, device_id, device_secret, name, role, is_active) VALUES (?, ?, ?, "Kasir Utama", "cashier", 1)')
               ->execute([$tenantId, $defaultDeviceId, $defaultDeviceSecret]);

            // Generate Bearer Token
            $plainToken = bin2hex(random_bytes(32));
            $tokenHash = hash('sha256', $plainToken);
            $tokenName = 'dashboard_token';
            $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));

            $stmtToken = $db->prepare('INSERT INTO personal_access_tokens (user_id, tenant_id, name, token_hash, expires_at) VALUES (?, ?, ?, ?, ?)');
            $stmtToken->execute([$userId, $tenantId, $tokenName, $tokenHash, $expiresAt]);

            $db->commit();

            Response::success([
                'token' => $plainToken,
                'token_type' => 'Bearer',
                'expires_at' => $expiresAt,
                'user' => [
                    'id' => $userId,
                    'username' => $username,
                    'role' => 'admin',
                ],
                'tenant' => [
                    'id' => $tenantId,
                    'name' => $name,
                    'slug' => $slug,
                    'status' => 'active',
                    'plan' => $defaultPlan,
                    'max_devices' => $maxDevices,
                ],
                'primary_device' => [
                    'device_id' => $defaultDeviceId,
                    'device_secret' => $defaultDeviceSecret,
                ],
            ], 'Registrasi signup berhasil!', 201);
        } catch (Exception $e) {
            $db->rollBack();
            Response::error($e->getMessage(), 400);
        }
    }

    public function login(): void {
        $body = Request::body();
        $account = trim((string)($body['username'] ?? $body['email'] ?? ''));
        $password = (string)($body['password'] ?? '');

        if ($account === '' || $password === '') {
            Response::error('Username/email dan password wajib diisi', 422);
        }

        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT u.id, u.tenant_id, u.username, u.password_hash, u.full_name, u.role, u.is_active,
                                     t.name as tenant_name, t.slug as tenant_slug, t.status as tenant_status,
                                     s.plan, s.max_devices, s.expires_at, s.status as sub_status 
                              FROM users u 
                              JOIN tenants t ON u.tenant_id = t.id 
                              LEFT JOIN subscriptions s ON t.id = s.tenant_id 
                              WHERE u.username = ? OR t.email = ? LIMIT 1');
        $stmt->execute([$account, $account]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, (string)$user['password_hash'])) {
            Response::error('Kredensial login (username/password) tidak cocok', 401);
        }

        if ((int)$user['is_active'] !== 1) {
            Response::error('Akun pengguna ini telah dinonaktifkan', 403);
        }

        // Generate new Bearer token
        $plainToken = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $plainToken);
        $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));

        $stmtToken = $db->prepare('INSERT INTO personal_access_tokens (user_id, tenant_id, name, token_hash, expires_at) VALUES (?, ?, "session_token", ?, ?)');
        $stmtToken->execute([$user['id'], $user['tenant_id'], $tokenHash, $expiresAt]);

        Response::success([
            'token' => $plainToken,
            'token_type' => 'Bearer',
            'expires_at' => $expiresAt,
            'user' => [
                'id' => (int)$user['id'],
                'username' => (string)$user['username'],
                'full_name' => (string)$user['full_name'],
                'role' => (string)$user['role'],
            ],
            'tenant' => [
                'id' => (int)$user['tenant_id'],
                'name' => (string)$user['tenant_name'],
                'slug' => (string)$user['tenant_slug'],
                'status' => (string)$user['tenant_status'],
                'plan' => (string)($user['plan'] ?? 'starter'),
                'max_devices' => (int)($user['max_devices'] ?? 3),
                'subscription_expires_at' => $user['expires_at'],
            ],
        ], 'Login berhasil');
    }

    public function logout(): void {
        $authHeader = Request::header('Authorization') ?: Request::header('HTTP_AUTHORIZATION');
        if ($authHeader && preg_match('/Bearer\s+(.+)$/i', $authHeader, $matches)) {
            $plainToken = trim($matches[1]);
            $tokenHash = hash('sha256', $plainToken);

            $db = Database::getInstance()->pdo();
            $db->prepare('DELETE FROM personal_access_tokens WHERE token_hash = ?')->execute([$tokenHash]);
        }

        AuthContext::clear();
        TenantContext::clear();

        Response::success(null, 'Logout berhasil, token telah dicabut');
    }

    public function me(): void {
        $user = AuthContext::get();
        $tenant = TenantContext::get();

        Response::success([
            'user' => $user,
            'tenant' => $tenant,
        ]);
    }
}
