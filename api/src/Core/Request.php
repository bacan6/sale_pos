<?php
declare(strict_types=1);

namespace App\Core;

class Request {
    private static ?array $cachedBody = null;

    public static function body(): array {
        if (self::$cachedBody !== null) {
            return self::$cachedBody;
        }

        $input = file_get_contents('php://input');
        if (empty($input)) {
            self::$cachedBody = [];
            return self::$cachedBody;
        }

        $decoded = json_decode($input, true);
        self::$cachedBody = is_array($decoded) ? $decoded : [];
        return self::$cachedBody;
    }

    public static function rawBody(): string {
        return file_get_contents('php://input') ?: '';
    }

    public static function header(string $name): ?string {
        $normalized = strtoupper(str_replace('-', '_', $name));
        $serverKey = 'HTTP_' . $normalized;

        if (isset($_SERVER[$serverKey])) {
            return (string)$_SERVER[$serverKey];
        }

        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            foreach ($headers as $k => $v) {
                if (strcasecmp($k, $name) === 0) {
                    return (string)$v;
                }
            }
        }

        return null;
    }

    public static function query(string $key, ?string $default = null): ?string {
        return isset($_GET[$key]) ? (string)$_GET[$key] : $default;
    }

    public static function setBodyForTesting(?array $body): void {
        self::$cachedBody = $body;
    }

    public static function reset(): void {
        self::$cachedBody = null;
    }
}
