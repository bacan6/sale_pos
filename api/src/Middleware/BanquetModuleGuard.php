<?php
declare(strict_types=1);

namespace App\Middleware;

class BanquetModuleGuard {
    public static function handle(): void {
        ModuleAccessMiddleware::require('banquet')();
    }
}
