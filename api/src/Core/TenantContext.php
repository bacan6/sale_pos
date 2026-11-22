<?php
declare(strict_types=1);

namespace App\Core;

class TenantContext {
    private static ?array $tenant = null;

    public static function set(array $tenant): void {
        self::$tenant = $tenant;
    }

    public static function get(): ?array {
        return self::$tenant;
    }

    public static function id(): int {
        return (int)(self::$tenant['id'] ?? 0);
    }

    public static function slug(): string {
        return (string)(self::$tenant['slug'] ?? '');
    }

    public static function name(): string {
        return (string)(self::$tenant['name'] ?? '');
    }

    public static function check(): bool {
        return self::$tenant !== null && self::id() > 0;
    }

    public static function clear(): void {
        self::$tenant = null;
    }
}
