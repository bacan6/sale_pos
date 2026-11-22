<?php
declare(strict_types=1);

namespace App\Middleware;

class HotelModuleGuard {
    public static function handle(): void {
        ModuleAccessMiddleware::require('hotel')();
    }
}
