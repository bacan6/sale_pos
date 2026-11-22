<?php
declare(strict_types=1);

namespace App\Core;

class AuthContext {
    private static ?array $user = null;

    public static function set(array $user): void {
        self::$user = $user;
    }

    public static function get(): ?array {
        return self::$user;
    }

    public static function id(): int {
        return (int)(self::$user['id'] ?? 0);
    }

    public static function username(): string {
        return (string)(self::$user['username'] ?? '');
    }

    public static function role(): string {
        return (string)(self::$user['role'] ?? '');
    }

    public static function tenantId(): int {
        return (int)(self::$user['tenant_id'] ?? 0);
    }

    public static function check(): bool {
        return self::$user !== null && self::id() > 0;
    }

    public static function clear(): void {
        self::$user = null;
    }
}
