<?php
declare(strict_types=1);

namespace App\Middleware;

use App\Core\Response;
use App\Core\TenantContext;

class ModuleAccessMiddleware {
    public static function require(string $module): callable {
        return function() use ($module): void {
            if (!TenantContext::check()) {
                Response::error('Tenant tidak terautentikasi', 403);
            }

            if (!TenantContext::hasModule($module)) {
                $moduleName = strtoupper($module);
                Response::error("Paket langganan Anda tidak menyertakan modul {$moduleName}. Silakan upgrade paket langganan Anda.", 403, [
                    'required_module' => $module,
                    'active_modules' => TenantContext::modules(),
                ]);
            }
        };
    }
}
