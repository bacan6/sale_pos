<?php
declare(strict_types=1);

namespace App\Middleware;

class ParkingModuleGuard {
    public static function handle(): void {
        ModuleAccessMiddleware::require('parking')();
    }
}
