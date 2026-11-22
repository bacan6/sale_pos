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
        $keys = [
            'HTTP_' . $normalized,
            'REDIRECT_HTTP_' . $normalized,
            'REDIRECT_REDIRECT_HTTP_' . $normalized,
            $normalized,
            'REDIRECT_' . $normalized,
        ];

        foreach ($keys as $k) {
            if (!empty($_SERVER[$k])) {
                return (string)$_SERVER[$k];
            }
        }

        if (function_exists('apache_request_headers')) {
            $apacheHeaders = apache_request_headers();
            if (is_array($apacheHeaders)) {
                foreach ($apacheHeaders as $k => $v) {
                    if (strcasecmp((string)$k, $name) === 0) {
                        return (string)$v;
                    }
                }
            }
        }

        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            if (is_array($headers)) {
                foreach ($headers as $k => $v) {
                    if (strcasecmp((string)$k, $name) === 0) {
                        return (string)$v;
                    }
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
