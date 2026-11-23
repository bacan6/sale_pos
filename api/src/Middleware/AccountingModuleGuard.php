<?php
declare(strict_types=1);

namespace App\Middleware;

use App\Core\AuthContext;
use App\Core\Response;

class AccountingModuleGuard {
    public static function handle(): void {
        ModuleAccessMiddleware::require('accounting')();

        $user = AuthContext::get();
        if ($user !== null) {
            $role = (string)($user['role'] ?? '');
            $allowedRoles = ['admin', 'accountant', 'manager'];
            if (!in_array($role, $allowedRoles, true)) {
                Response::error('Akses ditolak. Modul akuntansi hanya dapat diakses oleh role admin, accountant, atau manager.', 403, [
                    'current_role' => $role,
                    'allowed_roles' => $allowedRoles,
                ]);
            }
        }
    }
}
