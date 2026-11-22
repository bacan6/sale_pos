<?php
declare(strict_types=1);

namespace App\Middleware;

class PosModuleGuard {
    public static function handle(): void {
        ModuleAccessMiddleware::require('pos')();
    }
}
