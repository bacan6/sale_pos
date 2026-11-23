<?php
declare(strict_types=1);

namespace App\Middleware;

class LaundryModuleGuard {
    public static function handle(): void {
        ModuleAccessMiddleware::require('laundry')();
    }
}
